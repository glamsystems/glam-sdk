import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  TransactionInstruction,
  AccountMeta,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  Transaction,
} from "@solana/web3.js";

import { BaseClient, TxOptions } from "./base";
import * as borsh from "@coral-xyz/borsh";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  KAMINO_FARM_PROGRAM,
  KAMINO_LENDING_PROGRAM,
  KAMINO_OBTRIGATION_SIZE,
  KAMINO_SCOPE_PRICES,
  KAMINO_VAULTS_PROGRAM,
  WSOL,
} from "../constants";
import {
  KVaultAllocation,
  KVaultState,
  KVaultStateLayout,
} from "../deser/kaminoLayouts";
import { getProgramAccountsV2 } from "../utils/helpers";

const DEFAULT_OBLIGATION_ARGS = { tag: 0, id: 0 };
const EVENT_AUTHORITY = new PublicKey(
  "24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK",
);

interface RefreshObligationAccounts {
  lendingMarket: PublicKey;
  obligation: PublicKey;
  reserves: PublicKey[];
}

interface RefreshReserveAccounts {
  reserve: PublicKey;
  lendingMarket: PublicKey;
  pythOracle: PublicKey;
  switchboardPriceOracle: PublicKey;
  switchboardTwapOracle: PublicKey;
  scopePrices: PublicKey;
}

interface RefreshObligationFarmsForReserveArgs {
  mode: number;
}

interface RefreshObligationFarmsForReserveAccounts {
  crank: PublicKey;
  baseAccounts: {
    obligation: PublicKey;
    lendingMarketAuthority: PublicKey;
    reserve: PublicKey;
    reserveFarmState: PublicKey;
    obligationFarmUserState: PublicKey;
    lendingMarket: PublicKey;
  };
  farmsProgram: PublicKey;
  rent: PublicKey;
  systemProgram: PublicKey;
}

interface ParsedReserve {
  address: PublicKey;
  market: PublicKey;
  farmCollateral: PublicKey | null;
  farmDebt: PublicKey | null;
  liquidityMint: PublicKey;
  liquiditySupplyVault: PublicKey;
  collateralMint: PublicKey;
  collateralSupplyVault: PublicKey;
  feeVault: PublicKey;
}

interface ParsedObligation {
  address: PublicKey;
  lendingMarket: PublicKey | null;
  deposits: { reserve: PublicKey }[];
  borrows: { reserve: PublicKey }[];
}

export class KaminoLendingClient {
  private reserves: Map<string, ParsedReserve> = new Map();
  private obligations: Map<string, ParsedObligation> = new Map();

  public constructor(readonly base: BaseClient) {}

  /**
   * Initializes Kamino user metadata
   *
   * @param market Lending market
   * @param referrer Referrer user metadata
   * @param txOptions
   * @returns
   */
  public async initUserMetadata(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.initUserMetadataTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Deposits asset to the lending market.
   *
   * @param market Lending market
   * @param asset Asset mint
   * @param amount Amount to deposit
   * @param txOptions
   * @returns
   */
  public async deposit(
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(
      new PublicKey(market),
      new PublicKey(asset),
      new BN(amount),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Withdraws asset from the lending market.
   *
   * @param market Lending market
   * @param asset Asset mint
   * @param amount Amount to deposit
   * @param txOptions
   * @returns
   */
  public async withdraw(
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawTx(
      new PublicKey(market),
      new PublicKey(asset),
      new BN(amount),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Borrows asset from the lending market.
   *
   * @param market Lending market
   * @param asset Asset mint
   * @param amount Amount to borrow
   * @param txOptions
   * @returns
   */
  public async borrow(
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.borrowTx(
      new PublicKey(market),
      new PublicKey(asset),
      new BN(amount),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Repays asset to the lending market.
   *
   * @param market
   * @param asset
   * @param amount
   * @param txOptions
   * @returns
   */
  public async repay(
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.repayTx(
      new PublicKey(market),
      new PublicKey(asset),
      new BN(amount),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  getUserMetadataPda(owner: PublicKey) {
    const [userMetadataPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_meta"), owner.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    return userMetadataPda;
  }

  getObligationPda(
    owner: PublicKey,
    market: PublicKey,
    args: { tag: number; id: number } = DEFAULT_OBLIGATION_ARGS,
  ) {
    const seed = [
      Buffer.from([args.tag]),
      Buffer.from([args.id]),
      owner.toBuffer(),
      market.toBuffer(),
      PublicKey.default.toBuffer(),
      PublicKey.default.toBuffer(),
    ];
    const [obligation, _] = PublicKey.findProgramAddressSync(
      seed,
      KAMINO_LENDING_PROGRAM,
    );
    return obligation;
  }

  getObligationFarmState(obligation: PublicKey, farm: PublicKey) {
    const [obligationFarm] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), farm.toBuffer(), obligation.toBuffer()],
      KAMINO_FARM_PROGRAM,
    );
    return obligationFarm;
  }

  refreshObligationIx(
    accounts: RefreshObligationAccounts,
    programId: PublicKey = KAMINO_LENDING_PROGRAM,
  ) {
    const keys: Array<AccountMeta> = [
      { pubkey: accounts.lendingMarket, isSigner: false, isWritable: false },
      { pubkey: accounts.obligation, isSigner: false, isWritable: true },
    ];
    accounts.reserves.forEach((reserve) => {
      keys.push({ pubkey: reserve, isSigner: false, isWritable: false });
    });

    const identifier = Buffer.from([33, 132, 147, 228, 151, 192, 72, 89]);
    const data = identifier;
    return new TransactionInstruction({ keys, programId, data });
  }

  refreshReserveIx(
    accounts: RefreshReserveAccounts,
    programId: PublicKey = KAMINO_LENDING_PROGRAM,
  ) {
    const keys: Array<AccountMeta> = [
      { pubkey: accounts.reserve, isSigner: false, isWritable: true },
      { pubkey: accounts.lendingMarket, isSigner: false, isWritable: false },
      { pubkey: accounts.pythOracle, isSigner: false, isWritable: false },
      {
        pubkey: accounts.switchboardPriceOracle,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.switchboardTwapOracle,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: accounts.scopePrices, isSigner: false, isWritable: false },
    ];
    const identifier = Buffer.from([2, 218, 138, 235, 79, 201, 25, 102]);
    const data = identifier;
    return new TransactionInstruction({ keys, programId, data });
  }

  refreshObligationFarmsForReserveIx(
    args: RefreshObligationFarmsForReserveArgs,
    accounts: RefreshObligationFarmsForReserveAccounts,
    programId: PublicKey = KAMINO_LENDING_PROGRAM,
  ) {
    const keys: Array<AccountMeta> = [
      { pubkey: accounts.crank, isSigner: true, isWritable: false },
      {
        pubkey: accounts.baseAccounts.obligation,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.baseAccounts.lendingMarketAuthority,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.baseAccounts.reserve,
        isSigner: false,
        isWritable: false,
      },
      {
        pubkey: accounts.baseAccounts.reserveFarmState,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.baseAccounts.obligationFarmUserState,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: accounts.baseAccounts.lendingMarket,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: accounts.farmsProgram, isSigner: false, isWritable: false },
      { pubkey: accounts.rent, isSigner: false, isWritable: false },
      { pubkey: accounts.systemProgram, isSigner: false, isWritable: false },
    ];
    const identifier = Buffer.from([140, 144, 253, 21, 10, 74, 248, 3]);
    const buffer = Buffer.alloc(1000);
    const layout = borsh.struct([borsh.u8("mode")]);
    const len = layout.encode({ mode: args.mode }, buffer);
    const data = Buffer.concat([identifier, buffer]).subarray(0, 8 + len);
    return new TransactionInstruction({ keys, programId, data });
  }

  refreshReservesBatchIx(
    reserves: PublicKey[],
    lendingMarkets: PublicKey[],
    skipPriceUpdates: boolean,
    programId: PublicKey = KAMINO_LENDING_PROGRAM,
  ) {
    const keys: Array<AccountMeta> = [];
    for (let i = 0; i < reserves.length; i++) {
      keys.push({ pubkey: reserves[i], isSigner: false, isWritable: false });
      keys.push({
        pubkey: lendingMarkets[i],
        isSigner: false,
        isWritable: true,
      });
      if (!skipPriceUpdates) {
        [
          KAMINO_LENDING_PROGRAM, // pyth oracle, null
          KAMINO_LENDING_PROGRAM, // switchboard price oracle, null
          KAMINO_LENDING_PROGRAM, // switchboard twap oracle, null
          KAMINO_SCOPE_PRICES,
        ].forEach((p) =>
          keys.push({ pubkey: p, isSigner: false, isWritable: false }),
        );
      }
    }
    const identifier = Buffer.from([144, 110, 26, 103, 162, 204, 252, 147]);
    const buffer = Buffer.alloc(1000);
    const layout = borsh.struct([borsh.bool("skipPriceUpdates")]);
    const len = layout.encode({ skipPriceUpdates }, buffer);
    const data = Buffer.concat([identifier, buffer]).subarray(0, 8 + len);
    return new TransactionInstruction({ keys, programId, data });
  }

  refreshReserveIxs(lendingMarket: PublicKey, reserves: PublicKey[]) {
    return reserves.map((reserve) =>
      this.refreshReserveIx({
        reserve,
        lendingMarket,
        pythOracle: KAMINO_LENDING_PROGRAM,
        switchboardPriceOracle: KAMINO_LENDING_PROGRAM,
        switchboardTwapOracle: KAMINO_LENDING_PROGRAM,
        scopePrices: KAMINO_SCOPE_PRICES,
      }),
    );
  }

  refreshObligationCollateralFarmsForReservesIxs(
    obligation: PublicKey,
    lendingMarket: PublicKey,
    parsedReserves: ParsedReserve[],
  ) {
    return parsedReserves
      .map((parsedReserve) => {
        const { farmCollateral } = parsedReserve;
        return [farmCollateral]
          .filter((farm) => !!farm)
          .map((farm) => {
            const obligationFarmUserState = this.getObligationFarmState(
              obligation,
              farm,
            );
            return this.refreshObligationFarmsForReserveIx(
              { mode: 0 },
              {
                crank: this.base.getSigner(), // Must be signer
                baseAccounts: {
                  obligation,
                  lendingMarketAuthority:
                    this.getMarketAuthority(lendingMarket),
                  reserve: parsedReserve.address,
                  reserveFarmState: farm,
                  obligationFarmUserState,
                  lendingMarket,
                },
                farmsProgram: KAMINO_FARM_PROGRAM,
                rent: SYSVAR_RENT_PUBKEY,
                systemProgram: SystemProgram.programId,
              },
            );
          });
      })
      .flat();
  }

  refreshObligationDebtFarmsForReservesIxs(
    obligation: PublicKey,
    lendingMarket: PublicKey,
    parsedReserves: ParsedReserve[],
  ) {
    return parsedReserves
      .map((parsedReserve) => {
        const { farmDebt } = parsedReserve;
        return [farmDebt]
          .filter((farm) => !!farm)
          .map((farm) => {
            const obligationFarmUserState = this.getObligationFarmState(
              obligation,
              farm,
            );
            return this.refreshObligationFarmsForReserveIx(
              { mode: 0 },
              {
                crank: this.base.getSigner(), // Must be signer
                baseAccounts: {
                  obligation,
                  lendingMarketAuthority:
                    this.getMarketAuthority(lendingMarket),
                  reserve: parsedReserve.address,
                  reserveFarmState: farm,
                  obligationFarmUserState,
                  lendingMarket,
                },
                farmsProgram: KAMINO_FARM_PROGRAM,
                rent: SYSVAR_RENT_PUBKEY,
                systemProgram: SystemProgram.programId,
              },
            );
          });
      })
      .flat();
  }

  getMarketAuthority(market: PublicKey) {
    const [authority, _] = PublicKey.findProgramAddressSync(
      [Buffer.from("lma"), market.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    return authority;
  }

  reservePdas(market: PublicKey, mint: PublicKey) {
    const [liquiditySupplyVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_liq_supply"), market.toBuffer(), mint.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    const [collateralMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_coll_mint"), market.toBuffer(), mint.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    const [collateralSupplyVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("reserve_coll_supply"), market.toBuffer(), mint.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    const [feeVault] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_receiver"), market.toBuffer(), mint.toBuffer()],
      KAMINO_LENDING_PROGRAM,
    );
    return {
      liquiditySupplyVault,
      collateralMint,
      collateralSupplyVault,
      feeVault,
    };
  }

  parseObligation(obligation: PublicKey, data: Buffer): ParsedObligation {
    const lendingMarket = new PublicKey(data.subarray(32, 64));

    // read deposits
    let depositsOffset = 96;
    let depositSize = 136;
    let numDeposits = 8;
    const depositsData = data.subarray(
      depositsOffset,
      depositsOffset + numDeposits * depositSize,
    );
    const deposits = Array.from({ length: numDeposits }, (_, i) => {
      const depositData = depositsData.subarray(
        i * depositSize,
        (i + 1) * depositSize,
      );
      const reserve = new PublicKey(depositData.subarray(0, 32));
      return { reserve };
    }).filter((d) => !d.reserve.equals(PublicKey.default));

    // read borrows
    let borrowsOffset = 1208;
    let borrowSize = 200;
    let numBorrows = 5;
    const borrowsData = data.subarray(
      borrowsOffset,
      borrowsOffset + numBorrows * borrowSize,
    );
    const borrows = Array.from({ length: numBorrows }, (_, i) => {
      const borrowData = borrowsData.subarray(
        i * borrowSize,
        (i + 1) * borrowSize,
      );
      const reserve = new PublicKey(borrowData.subarray(0, 32));
      return { reserve };
    }).filter((d) => !d.reserve.equals(PublicKey.default));

    return {
      address: obligation,
      lendingMarket,
      deposits,
      borrows,
    };
  }

  /**
   * Fetches and parses an obligation account
   */
  async fetchAndParseObligation(
    obligation: PublicKey,
  ): Promise<ParsedObligation> {
    const cached = this.obligations.get(obligation.toBase58());
    if (cached) {
      return cached;
    }

    const obligationAccount =
      await this.base.provider.connection.getAccountInfo(obligation);
    if (!obligationAccount) {
      return {
        address: obligation,
        lendingMarket: null,
        deposits: [],
        borrows: [],
      };
    }

    const parsedObligation = this.parseObligation(
      obligation,
      obligationAccount.data,
    );

    this.obligations.set(obligation.toBase58(), parsedObligation);
    return parsedObligation;
  }

  pubkeyArraysEqual = (a: PublicKey[], b: PublicKey[]) => {
    if (a.length !== b.length) return false;
    a.sort();
    b.sort();
    return a.every((p, i) => p.equals(b[i]));
  };

  parseReserveAccount(reserve: PublicKey, data: Buffer): ParsedReserve {
    const market = new PublicKey(data.subarray(32, 64));
    const farmCollateral = new PublicKey(data.subarray(64, 96));
    const farmDebt = new PublicKey(data.subarray(96, 128));
    const liquidityMint = new PublicKey(data.subarray(128, 160));

    return {
      address: reserve,
      market,
      farmCollateral: farmCollateral.equals(PublicKey.default)
        ? null
        : farmCollateral,
      farmDebt: farmDebt.equals(PublicKey.default) ? null : farmDebt,
      liquidityMint,
      ...this.reservePdas(market, liquidityMint),
    };
  }

  async fetchAndParseReserves(reserves: PublicKey[]): Promise<ParsedReserve[]> {
    const requestReservesSet = new Set(reserves.map((r) => r.toBase58()));
    const cachedReservesSet = new Set(this.reserves.keys());

    // If all requested reserves are cached, return data from cache
    if ([...requestReservesSet].every((r) => cachedReservesSet.has(r))) {
      return Array.from(this.reserves.values()).filter((r) =>
        requestReservesSet.has(r.address.toBase58()),
      );
    }

    // Only fetch reserves that are not cached
    const reservesToFetch = [...requestReservesSet]
      .filter((r) => !cachedReservesSet.has(r))
      .map((r) => new PublicKey(r));
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "Fetching reserves:",
        reservesToFetch.map((r) => r.toBase58()),
      );
    }

    const reserveAccounts =
      await this.base.provider.connection.getMultipleAccountsInfo(
        reservesToFetch,
      );
    if (reserveAccounts.some((a) => !a)) {
      throw new Error("Not all reserves can be found");
    }

    return reserveAccounts.map((account, i) => {
      const parsedReserve = this.parseReserveAccount(
        reserves[i],
        account!.data,
      );
      this.reserves.set(reserves[i].toBase58(), parsedReserve);
      return parsedReserve;
    });
  }

  async findAndParseReserve(
    market: PublicKey,
    asset: PublicKey,
  ): Promise<ParsedReserve> {
    const accounts = await this.base.provider.connection.getProgramAccounts(
      KAMINO_LENDING_PROGRAM,
      {
        filters: [
          { dataSize: 8624 },
          { memcmp: { offset: 32, bytes: market.toBase58() } },
          { memcmp: { offset: 128, bytes: asset.toBase58() } },
        ],
      },
    );
    if (accounts.length === 0) {
      throw new Error("Reserve not found");
    }
    const parsedReserve = this.parseReserveAccount(
      accounts[0].pubkey,
      accounts[0].account.data,
    );
    this.reserves.set(accounts[0].pubkey.toBase58(), parsedReserve);
    return parsedReserve;
  }

  /**
   * Finds and parses Kamino obligations for a given owner and market (optional)
   */
  public async findAndParseObligations(
    owner: PublicKey,
    market?: PublicKey,
  ): Promise<ParsedObligation[]> {
    const accounts = await this.base.provider.connection.getProgramAccounts(
      KAMINO_LENDING_PROGRAM,
      {
        filters: [
          { dataSize: KAMINO_OBTRIGATION_SIZE },
          { memcmp: { offset: 64, bytes: owner.toBase58() } },
          ...(market
            ? [{ memcmp: { offset: 32, bytes: market.toBase58() } }]
            : []),
        ],
      },
    );
    // Parse obligations and cache them
    return accounts.map((a) => {
      const parsedObligation = this.parseObligation(a.pubkey, a.account.data);
      this.obligations.set(a.pubkey.toBase58(), parsedObligation);
      return parsedObligation;
    });
  }

  public async initUserMetadataTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;
    const userMetadata = this.getUserMetadataPda(vault);
    const lookupTable = new PublicKey(0); // FIXME: create lookup table

    const tx = await this.base.program.methods
      .kaminoLendingInitUserMetadata(lookupTable)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        userMetadata,
        referrerUserMetadata: null,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async depositTx(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;
    const userMetadata = this.getUserMetadataPda(vault);
    const obligation = this.getObligationPda(
      vault,
      market,
      DEFAULT_OBLIGATION_ARGS,
    );

    const preInstructions = [];
    const postInstructions = [];

    // If user metadata doesn't exist, initialize it
    const userMetadataAccount =
      await this.base.provider.connection.getAccountInfo(userMetadata);
    if (!userMetadataAccount) {
      preInstructions.push(
        await this.base.program.methods
          .kaminoLendingInitUserMetadata(new PublicKey(0))
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            userMetadata,
            referrerUserMetadata: null,
          })
          .instruction(),
      );
    }

    // If obligation doesn't exist, initialize & refresh obligation and collateral farm state first
    const obligationAccount =
      await this.base.provider.connection.getAccountInfo(obligation);
    if (!obligationAccount) {
      preInstructions.push(
        await this.base.program.methods
          .kaminoLendingInitObligation(DEFAULT_OBLIGATION_ARGS)
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            obligation,
            lendingMarket: market,
            seed1Account: new PublicKey(0),
            seed2Account: new PublicKey(0),
            ownerUserMetadata: userMetadata,
          })
          .instruction(),
      );
    }

    const depositReserve = await this.findAndParseReserve(market, asset);
    // If reserve has collateral farm but obligation farm state doesn't exist, initialize it
    let obligationFarm = null;
    if (depositReserve.farmCollateral) {
      obligationFarm = this.getObligationFarmState(
        obligation,
        depositReserve.farmCollateral,
      );
      const obligationFarmAccount =
        await this.base.provider.connection.getAccountInfo(obligationFarm);
      if (!obligationFarmAccount) {
        preInstructions.push(
          await this.base.program.methods
            .kaminoLendingInitObligationFarmsForReserve(0) // 0 - collateral farm
            .accounts({
              glamState: this.base.statePda,
              glamSigner,
              obligation,
              lendingMarketAuthority: this.getMarketAuthority(market),
              reserve: depositReserve.address,
              reserveFarmState: depositReserve.farmCollateral,
              obligationFarm,
              lendingMarket: market,
              farmsProgram: KAMINO_FARM_PROGRAM,
            })
            .instruction(),
        );
      }
    }

    const reservesToRefresh = [];
    const { deposits, borrows } =
      await this.fetchAndParseObligation(obligation);
    const reservesInUse = deposits.concat(borrows).map((d) => d.reserve);
    if (reservesInUse.find((r) => r.equals(depositReserve.address))) {
      reservesToRefresh.push(...reservesInUse);
    } else {
      reservesToRefresh.push(depositReserve.address, ...reservesInUse);
    }

    // Refresh reserves, including deposit reserve and reserves in use
    preInstructions.push(...this.refreshReserveIxs(market, reservesToRefresh));

    // Refresh obligation with reserves in use
    preInstructions.push(
      this.refreshObligationIx({
        lendingMarket: market,
        obligation,
        reserves: reservesInUse,
      }),
    );

    if (depositReserve.farmCollateral) {
      const ixs = this.refreshObligationCollateralFarmsForReservesIxs(
        obligation,
        market,
        [depositReserve],
      );
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after deposit
    }

    // If deposit asset is WSOL, wrap SOL first in case vault doesn't have enough wSOL
    const { tokenProgram } = await this.base.fetchMintAndTokenProgram(asset);
    const userSourceLiquidity = this.base.getVaultAta(asset, tokenProgram);
    if (asset.equals(WSOL)) {
      const wrapSolIxs = await this.base.maybeWrapSol(amount);
      preInstructions.unshift(...wrapSolIxs);

      // Close wSOL ata automatically after deposit
      if (wrapSolIxs.length > 0) {
        const closeIx = await this.base.program.methods
          .tokenCloseAccount()
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            tokenAccount: userSourceLiquidity,
            cpiProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();
        postInstructions.push(closeIx);
      }
    }

    const tx = await this.base.program.methods
      .kaminoLendingDepositReserveLiquidityAndObligationCollateralV2(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.getMarketAuthority(market),
        reserve: depositReserve.address,
        reserveLiquidityMint: asset,
        reserveLiquiditySupply: depositReserve.liquiditySupplyVault,
        reserveCollateralMint: depositReserve.collateralMint,
        reserveDestinationDepositCollateral:
          depositReserve.collateralSupplyVault,
        userSourceLiquidity,
        placeholderUserDestinationCollateral: KAMINO_LENDING_PROGRAM,
        collateralTokenProgram: TOKEN_PROGRAM_ID,
        liquidityTokenProgram: tokenProgram,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        obligationFarmUserState: obligationFarm,
        reserveFarmState: depositReserve.farmCollateral,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async withdrawTx(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;

    const preInstructions = [];
    const postInstructions = [];
    const withdrawReserve = await this.findAndParseReserve(market, asset);

    const obligation = this.getObligationPda(
      vault,
      market,
      DEFAULT_OBLIGATION_ARGS,
    );
    let obligationFarm = null;

    // If reserve has debt farm but obligation farm state doesn't exist, initialize it
    if (withdrawReserve.farmCollateral) {
      obligationFarm = this.getObligationFarmState(
        obligation,
        withdrawReserve.farmCollateral,
      );
      const obligationFarmAccount =
        await this.base.provider.connection.getAccountInfo(obligationFarm);
      if (!obligationFarmAccount) {
        preInstructions.push(
          await this.base.program.methods
            .kaminoLendingInitObligationFarmsForReserve(0) // 0 - collateral farm
            .accounts({
              glamState: this.base.statePda,
              glamSigner,
              obligation,
              lendingMarketAuthority: this.getMarketAuthority(market),
              reserve: withdrawReserve.address,
              reserveFarmState: withdrawReserve.farmCollateral,
              obligationFarm,
              lendingMarket: market,
              farmsProgram: KAMINO_FARM_PROGRAM,
            })
            .instruction(),
        );
      }
    }

    const reservesToRefresh = [];
    const { deposits, borrows } =
      await this.fetchAndParseObligation(obligation);
    const reservesInUse = deposits.concat(borrows).map((d) => d.reserve);
    if (reservesInUse.find((r) => r.equals(withdrawReserve.address))) {
      reservesToRefresh.push(...reservesInUse);
    } else {
      reservesToRefresh.push(withdrawReserve.address, ...reservesInUse);
    }

    // Refresh reserves, including deposit reserve and reserves in use
    preInstructions.push(...this.refreshReserveIxs(market, reservesToRefresh));

    // Refresh obligation with reserves in use
    preInstructions.push(
      this.refreshObligationIx({
        lendingMarket: market,
        obligation,
        reserves: reservesInUse,
      }),
    );

    if (withdrawReserve.farmCollateral) {
      const ixs = this.refreshObligationCollateralFarmsForReservesIxs(
        obligation,
        market,
        [withdrawReserve],
      );
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after withdraw
    }

    // Create asset ATA in case it doesn't exist. Add it to the beginning of preInstructions
    const { tokenProgram } = await this.base.fetchMintAndTokenProgram(asset);
    const userDestinationLiquidity = this.base.getVaultAta(asset, tokenProgram);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      userDestinationLiquidity,
      vault,
      asset,
      tokenProgram,
    );
    preInstructions.unshift(createAtaIx);

    const withdrawIx = await this.base.program.methods
      .kaminoLendingWithdrawObligationCollateralAndRedeemReserveCollateralV2(
        amount,
      )
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.getMarketAuthority(market),
        withdrawReserve: withdrawReserve.address,
        reserveLiquidityMint: asset,
        reserveSourceCollateral: withdrawReserve.collateralSupplyVault,
        reserveCollateralMint: withdrawReserve.collateralMint,
        reserveLiquiditySupply: withdrawReserve.liquiditySupplyVault,
        userDestinationLiquidity,
        placeholderUserDestinationCollateral: null,
        collateralTokenProgram: TOKEN_PROGRAM_ID,
        liquidityTokenProgram: tokenProgram,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        obligationFarmUserState: obligationFarm,
        reserveFarmState: withdrawReserve.farmCollateral,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .remainingAccounts([
        {
          pubkey: SystemProgram.programId,
          isSigner: false,
          isWritable: false,
        },
      ])
      .instruction();

    // The final instructions in the tx:
    // - refreshReserve * N
    // - refreshObligation
    // - refreshObligationFarmsForReserve (if farm exists)
    // - withdrawIx
    // - refreshObligationFarmsForReserve (if farm exists)
    const tx = new Transaction();
    tx.add(...preInstructions, withdrawIx, ...postInstructions);

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async borrowTx(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;

    const preInstructions = [];
    const postInstructions = [];
    const borrowReserve = await this.findAndParseReserve(market, asset);

    const obligation = this.getObligationPda(
      vault,
      market,
      DEFAULT_OBLIGATION_ARGS,
    );
    let obligationFarm = null;

    // If reserve has debt farm but obligation farm state doesn't exist, initialize it
    if (borrowReserve.farmDebt) {
      obligationFarm = this.getObligationFarmState(
        obligation,
        borrowReserve.farmDebt,
      );
      const obligationFarmAccount =
        await this.base.provider.connection.getAccountInfo(obligationFarm);
      if (!obligationFarmAccount) {
        preInstructions.push(
          await this.base.program.methods
            .kaminoLendingInitObligationFarmsForReserve(1) // 1 - debt farm
            .accounts({
              glamState: this.base.statePda,
              glamSigner,
              obligation,
              lendingMarketAuthority: this.getMarketAuthority(market),
              reserve: borrowReserve.address,
              reserveFarmState: borrowReserve.farmDebt,
              obligationFarm,
              lendingMarket: market,
              farmsProgram: KAMINO_FARM_PROGRAM,
            })
            .instruction(),
        );
      }
    }

    const reservesToRefresh = [];
    const { deposits, borrows } =
      await this.fetchAndParseObligation(obligation);
    const reservesInUse = deposits.concat(borrows).map((d) => d.reserve);
    if (reservesInUse.find((r) => r.equals(borrowReserve.address))) {
      reservesToRefresh.push(...reservesInUse);
    } else {
      reservesToRefresh.push(borrowReserve.address, ...reservesInUse);
    }

    // Refresh reserves, including deposit reserve and reserves in use
    preInstructions.push(...this.refreshReserveIxs(market, reservesToRefresh));

    // Refresh obligation with reserves in use
    preInstructions.push(
      this.refreshObligationIx({
        lendingMarket: market,
        obligation,
        reserves: reservesInUse,
      }),
    );

    // FIXME: Don't need to refresh debt farm for borrow?
    /*
    if (borrowReserve.farmDebt) {
      const ixs = this.refreshObligationFarmsForReserveIxs(obligation, market, [
        borrowReserve,
      ]);
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after deposit
    }
    */

    // Create asset ATA in case it doesn't exist. Add it to the beginning of preInstructions
    const { tokenProgram } = await this.base.fetchMintAndTokenProgram(asset);
    const userDestinationLiquidity = this.base.getVaultAta(asset, tokenProgram);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      userDestinationLiquidity,
      vault,
      asset,
      tokenProgram,
    );
    preInstructions.unshift(createAtaIx);

    const borrowIx = await this.base.program.methods
      .kaminoLendingBorrowObligationLiquidityV2(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.getMarketAuthority(market),
        borrowReserve: borrowReserve.address,
        borrowReserveLiquidityMint: asset,
        reserveSourceLiquidity: borrowReserve.liquiditySupplyVault,
        borrowReserveLiquidityFeeReceiver: borrowReserve.feeVault,
        userDestinationLiquidity,
        referrerTokenState: null,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram,
        obligationFarmUserState: obligationFarm,
        reserveFarmState: borrowReserve.farmDebt,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .instruction();

    // The final instructions in the tx:
    // - refreshReserve * N
    // - refreshObligation
    // - borrowObligationLiquidityV2
    const tx = new Transaction();
    tx.add(...preInstructions, borrowIx);

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async repayTx(
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;

    const preInstructions = [];
    const repayReserve = await this.findAndParseReserve(market, asset);

    const obligation = this.getObligationPda(
      vault,
      market,
      DEFAULT_OBLIGATION_ARGS,
    );
    let obligationFarm = null;

    // If reserve has debt farm but obligation farm state doesn't exist, initialize it
    if (repayReserve.farmDebt) {
      obligationFarm = this.getObligationFarmState(
        obligation,
        repayReserve.farmDebt,
      );
      const obligationFarmAccount =
        await this.base.provider.connection.getAccountInfo(obligationFarm);
      if (!obligationFarmAccount) {
        preInstructions.push(
          await this.base.program.methods
            .kaminoLendingInitObligationFarmsForReserve(1) // 1 - debt farm
            .accounts({
              glamState: this.base.statePda,
              glamSigner,
              obligation,
              lendingMarketAuthority: this.getMarketAuthority(market),
              reserve: repayReserve.address,
              reserveFarmState: repayReserve.farmDebt,
              obligationFarm,
              lendingMarket: market,
              farmsProgram: KAMINO_FARM_PROGRAM,
            })
            .instruction(),
        );
      }
    }

    const reservesToRefresh = [];
    const { deposits, borrows } =
      await this.fetchAndParseObligation(obligation);
    const reservesInUse = deposits.concat(borrows).map((d) => d.reserve);
    if (reservesInUse.find((r) => r.equals(repayReserve.address))) {
      reservesToRefresh.push(...reservesInUse);
    } else {
      reservesToRefresh.push(repayReserve.address, ...reservesInUse);
    }

    // Refresh reserves, including deposit reserve and reserves in use
    preInstructions.push(...this.refreshReserveIxs(market, reservesToRefresh));

    // Refresh obligation with reserves in use
    preInstructions.push(
      this.refreshObligationIx({
        lendingMarket: market,
        obligation,
        reserves: reservesInUse,
      }),
    );

    const { tokenProgram } = await this.base.fetchMintAndTokenProgram(asset);

    const repayIx = await this.base.program.methods
      .kaminoLendingRepayObligationLiquidityV2(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.getMarketAuthority(market),
        repayReserve: repayReserve.address,
        reserveLiquidityMint: asset,
        reserveDestinationLiquidity: repayReserve.liquiditySupplyVault,
        userSourceLiquidity: this.base.getVaultAta(asset, tokenProgram),
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram,
        obligationFarmUserState: obligationFarm,
        reserveFarmState: repayReserve.farmDebt,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .instruction();

    // The final instructions in the tx:
    // - refreshReserve * N
    // - refreshObligation
    // - repayObligationLiquidityV2
    const tx = new Transaction();
    tx.add(...preInstructions, repayIx);

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }
}

export class KaminoFarmClient {
  public constructor(readonly base: BaseClient) {}

  async findAndParseUserStates(owner: PublicKey) {
    const accounts = await getProgramAccountsV2(KAMINO_FARM_PROGRAM, 10, [
      { dataSize: 920 },
      { memcmp: { offset: 48, bytes: owner.toBase58() } },
    ]);

    return accounts.map(({ pubkey, account }) => {
      // farmState: [16, 48]
      // owner: [48, 80]
      // isFarmDelegated + padding: [80, 88]
      // rewardsTallyScaled: [88, 248]
      // unclaimedRewards[0..10]: [248, 328]

      const farmState = new PublicKey(account.data.subarray(16, 48));

      const rewardsOffset = 248;
      const numRewards = 10;
      const rewardSize = 8;

      const rewardsData = account.data.subarray(
        rewardsOffset,
        rewardsOffset + numRewards * rewardSize,
      );
      const unclaimedRewards: BN[] = Array.from(
        { length: numRewards },
        (_, i) => {
          const rewardData = rewardsData.subarray(
            i * rewardSize,
            (i + 1) * rewardSize,
          );
          return new BN(rewardData, "le");
        },
      );

      return {
        userState: pubkey,
        farmState,
        unclaimedRewards,
      };
    });
  }

  async parseFarm(data: Buffer) {
    const globalConfig = new PublicKey(data.subarray(40, 72));
    const rewardsOffset = 192;
    const numRewards = 10;
    const rewardSize = 704;

    const rewardsData = data.subarray(
      rewardsOffset,
      rewardsOffset + numRewards * rewardSize,
    );
    const rewards = Array.from({ length: numRewards }, (_, i) => {
      const rewardData = rewardsData.subarray(
        i * rewardSize,
        (i + 1) * rewardSize,
      );
      const mint = new PublicKey(rewardData.subarray(0, 32));
      const tokenProgram = new PublicKey(rewardData.subarray(40, 72));
      const rewardsVault = new PublicKey(rewardData.subarray(120, 152));
      const minClaimDurationSeconds = new BN(
        rewardData.subarray(480, 488),
        "le",
      );

      return {
        index: i,
        mint,
        minClaimDurationSeconds,
        tokenProgram,
        rewardsVault,
      };
    }).filter((r) => {
      if (r.mint.equals(PublicKey.default)) {
        return false;
      }
      // Filter out rewards with minClaimDurationSeconds > 1 year, they are considered disabled
      if (
        r.minClaimDurationSeconds.div(new BN(365 * 24 * 60 * 60)).gt(new BN(1))
      ) {
        return false;
      }
      return true;
    });

    return { globalConfig, rewards };
  }

  async fetchAndParseFarms(farms: PublicKey[]) {
    const farmAccounts =
      await this.base.provider.connection.getMultipleAccountsInfo(farms);

    const map = new Map();

    for (let i = 0; i < farmAccounts.length; i++) {
      const account = farmAccounts[i];
      if (!account) {
        continue;
      }

      const data = account.data;
      const parsedFarm = await this.parseFarm(data);
      map.set(farms[i].toBase58(), parsedFarm);
    }

    return map;
  }

  farmVaultsAuthority = (farm: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("authority"), farm.toBuffer()],
      KAMINO_FARM_PROGRAM,
    )[0];
  rewardsTreasuryVault = (globalConfig: PublicKey, mint: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("tvault"), globalConfig.toBuffer(), mint.toBuffer()],
      KAMINO_FARM_PROGRAM,
    )[0];

  public async harvest(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.harvestTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async harvestTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const farmStates = await this.findAndParseUserStates(this.base.vaultPda);

    const parsedFarms = await this.fetchAndParseFarms(
      farmStates.map((f) => f.farmState),
    );

    const tx = new Transaction();
    console.log("Building transaction to harvest the following rewards:");
    for (const { userState, farmState, unclaimedRewards } of farmStates) {
      const { globalConfig, rewards } = parsedFarms.get(farmState.toBase58());

      for (const { index, mint, tokenProgram, rewardsVault } of rewards) {
        if (unclaimedRewards[index].eq(new BN(0))) {
          continue;
        }

        console.log(
          `userState: ${userState}, farmState: ${farmState}, unclaimedReward: ${unclaimedRewards[index]}, token: ${mint}`,
        );
        const vaultAta = this.base.getVaultAta(mint, tokenProgram);
        const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
          glamSigner,
          vaultAta,
          this.base.vaultPda,
          mint,
          tokenProgram,
        );
        const harvestIx = await this.base.program.methods
          .kaminoFarmHarvestReward(new BN(index))
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            userState,
            farmState,
            globalConfig,
            rewardMint: mint,
            userRewardAta: vaultAta,
            rewardsVault,
            rewardsTreasuryVault: this.rewardsTreasuryVault(globalConfig, mint),
            farmVaultsAuthority: this.farmVaultsAuthority(farmState),
            scopePrices: null,
            tokenProgram,
          })
          .instruction();
        tx.add(createAtaIx, harvestIx);
      }
    }

    if (tx.instructions.length === 0) {
      throw new Error("No rewards to harvest");
    }

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }
}

export class KaminoVaultsClient {
  private vaultStates: Map<string, KVaultState> = new Map();
  private shareMintToVaultPdaMap: Map<string, PublicKey> = new Map();

  public constructor(
    readonly base: BaseClient,
    readonly kaminoLending: KaminoLendingClient,
  ) {}

  public async deposit(
    vault: PublicKey,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(vault, new BN(amount), txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async withdraw(
    vault: PublicKey,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawTx(vault, new BN(amount), txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  async findAndParseKaminoVaults(): Promise<KVaultState[]> {
    const accounts = await this.base.provider.connection.getProgramAccounts(
      KAMINO_VAULTS_PROGRAM,
      {
        filters: [
          { dataSize: 62552 },
          { memcmp: { offset: 0, bytes: "5MRSpWLS65g=", encoding: "base64" } }, // discriminator
        ],
      },
    );
    if (accounts.length === 0) {
      throw new Error("Kamino vaults not found");
    }
    return accounts.map((a) => {
      const vaultState = KVaultStateLayout.decode(
        a.account.data,
      ) as KVaultState;

      this.vaultStates.set(a.pubkey.toBase58(), vaultState);
      this.shareMintToVaultPdaMap.set(
        vaultState.sharesMint.toBase58(),
        a.pubkey,
      );

      return vaultState;
    });
  }

  async getVaultPdasByShareMints(mints: PublicKey[]): Promise<PublicKey[]> {
    if (this.vaultStates.size === 0) {
      await this.findAndParseKaminoVaults();
    }

    return mints
      .map((mint) => this.shareMintToVaultPdaMap.get(mint.toBase58()))
      .filter((p) => !!p);
  }

  async fetchAndParseVaultState(vault: PublicKey) {
    const vaultAccount =
      await this.base.provider.connection.getAccountInfo(vault);
    if (!vaultAccount) {
      throw new Error(`Kamino vault account not found:, ${vault}`);
    }
    const vaultState = KVaultStateLayout.decode(vaultAccount.data);

    this.vaultStates.set(vault.toBase58(), vaultState);
    this.shareMintToVaultPdaMap.set(vaultState.sharesMint.toBase58(), vault);
    return vaultState as KVaultState;
  }

  public async composeRemainingAccounts(
    allocationStrategies: KVaultAllocation[],
    pricingMode: boolean = false,
  ): Promise<AccountMeta[]> {
    const reserves = allocationStrategies.map((strategy) => strategy.reserve);
    const parsedReserves =
      await this.kaminoLending.fetchAndParseReserves(reserves);

    const reserveMetas = reserves.map((pubkey) => ({
      pubkey,
      isSigner: false,
      isWritable: true,
    }));
    const marketMetas = parsedReserves.map(({ market }) => ({
      pubkey: market,
      isSigner: false,
      isWritable: false,
    }));

    if (pricingMode) {
      // (market, reserve) must be paired
      return marketMetas.reduce((acc: AccountMeta[], marketMeta, i) => {
        acc.push(marketMeta, reserveMetas[i]);
        return acc;
      }, []);
    }
    return [...reserveMetas, ...marketMetas]; // Non pricing mode
  }

  public async depositTx(
    vault: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const vaultState = await this.fetchAndParseVaultState(vault);
    const { tokenProgram: sharesTokenProgram } =
      await this.base.fetchMintAndTokenProgram(vaultState.sharesMint);

    const userTokenAta = this.base.getVaultAta(
      vaultState.tokenMint,
      vaultState.tokenProgram,
    );
    const userSharesAta = this.base.getVaultAta(
      vaultState.sharesMint,
      sharesTokenProgram,
    );

    // Create user shares ata
    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        userSharesAta,
        this.base.vaultPda,
        vaultState.sharesMint,
        sharesTokenProgram,
      ),
    ];

    // Remaining accounts, skip empty allocation strategies
    const remainingAccounts = await this.composeRemainingAccounts(
      vaultState.vaultAllocationStrategy.filter(
        ({ reserve }) => !reserve.equals(PublicKey.default),
      ),
    );

    const tx = await this.base.program.methods
      .kaminoVaultsDeposit(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vaultState: vault,
        tokenVault: vaultState.tokenVault,
        tokenMint: vaultState.tokenMint,
        baseVaultAuthority: vaultState.baseVaultAuthority,
        sharesMint: vaultState.sharesMint,
        userTokenAta,
        userSharesAta,
        klendProgram: KAMINO_LENDING_PROGRAM,
        tokenProgram: vaultState.tokenProgram,
        sharesTokenProgram,
        eventAuthority: EVENT_AUTHORITY,
        program: KAMINO_VAULTS_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async withdrawTx(
    vault: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const vaultState = await this.fetchAndParseVaultState(vault);
    const userTokenAta = this.base.getVaultAta(
      vaultState.tokenMint,
      vaultState.tokenProgram,
    );
    const { tokenProgram: sharesTokenProgram } =
      await this.base.fetchMintAndTokenProgram(vaultState.sharesMint);
    const userSharesAta = this.base.getVaultAta(
      vaultState.sharesMint,
      sharesTokenProgram,
    );

    const reserves = vaultState.vaultAllocationStrategy.filter(
      ({ reserve }) => !reserve.equals(PublicKey.default),
    );
    // Withdraw from the first reserve when kvault does not have enough liquidity
    const idx = 0;
    const withdrawReserve = (
      await this.kaminoLending.fetchAndParseReserves(
        reserves.map((r) => r.reserve),
      )
    )[idx];
    const vaultCollateralTokenVault =
      vaultState.vaultAllocationStrategy[idx].ctokenVault;

    const remainingAccounts = await this.composeRemainingAccounts(reserves);
    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        userTokenAta,
        this.base.vaultPda,
        vaultState.tokenMint,
        vaultState.tokenProgram,
      ),
    ];

    const tx = await this.base.program.methods
      .kaminoVaultsWithdraw(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        withdrawFromAvailableVaultState: vault,
        withdrawFromAvailableTokenVault: vaultState.tokenVault,
        withdrawFromAvailableBaseVaultAuthority: vaultState.baseVaultAuthority,
        withdrawFromAvailableUserTokenAta: userTokenAta,
        withdrawFromAvailableTokenMint: vaultState.tokenMint,
        withdrawFromAvailableUserSharesAta: userSharesAta,
        withdrawFromAvailableSharesMint: vaultState.sharesMint,
        withdrawFromAvailableTokenProgram: vaultState.tokenProgram,
        withdrawFromAvailableSharesTokenProgram: sharesTokenProgram,
        withdrawFromAvailableKlendProgram: KAMINO_LENDING_PROGRAM,
        withdrawFromAvailableEventAuthority: EVENT_AUTHORITY,
        withdrawFromAvailableProgram: KAMINO_VAULTS_PROGRAM,
        withdrawFromReserveVaultState: vault,
        withdrawFromReserveReserve: withdrawReserve.address,
        withdrawFromReserveCtokenVault: vaultCollateralTokenVault,
        withdrawFromReserveLendingMarket: withdrawReserve.market,
        withdrawFromReserveLendingMarketAuthority:
          this.kaminoLending.getMarketAuthority(withdrawReserve.market),
        withdrawFromReserveReserveLiquiditySupply:
          withdrawReserve.liquiditySupplyVault,
        withdrawFromReserveReserveCollateralMint:
          withdrawReserve.collateralMint,
        withdrawFromReserveReserveCollateralTokenProgram: TOKEN_PROGRAM_ID, // Check
        withdrawFromReserveInstructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        eventAuthority: EVENT_AUTHORITY,
        program: KAMINO_VAULTS_PROGRAM,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }
}
