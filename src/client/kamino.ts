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
import { fetchMintAndTokenProgram } from "../utils/accounts";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  KAMINO_FARM_PROGRAM,
  KAMINO_LENDING_PROGRAM,
  KAMINO_OBTRIGATION_SIZE,
  KAMINO_RESERVE_SIZE,
  KAMINO_SCOPE_PRICES,
  KAMINO_VAULTS_PROGRAM,
  WSOL,
} from "../constants";
import {
  KVaultAllocation,
  KVaultState,
  Reserve,
  Obligation,
} from "../deser/kaminoLayouts";
import { getProgramAccountsWithRetry } from "../utils/rpc";
import { VaultClient } from "./vault";
import Decimal from "decimal.js";
import { BigFractionBytes, PkSet, PkMap } from "../utils";

const FractionDecimal = Decimal.clone({ precision: 40 });
const MULTIPLIER = new FractionDecimal(2).pow(60);

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
  mode: number; // 0 collateral farm, 1 debt farm
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

export interface ParsedReserve {
  address: PublicKey;
  market: PublicKey;
  farmCollateral: PublicKey | null;
  farmDebt: PublicKey | null;
  liquidityMint: PublicKey;
  liquidityMintDecimals: number;
  liquiditySupplyVault: PublicKey;
  collateralMint: PublicKey;
  collateralSupplyVault: PublicKey;
  scopePriceFeed: PublicKey;
  feeVault: PublicKey;
  collateralExchangeRate: Decimal;
  cumulativeBorrowRate: Decimal;
}

export interface ParsedObligation {
  address: PublicKey;
  lendingMarket: PublicKey;
  deposits: { reserve: PublicKey; depositedAmount: BN; marketValueSf: BN }[];
  borrows: {
    reserve: PublicKey;
    borrowedAmountSf: BN;
    marketValueSf: BN;
    cumulativeBorrowRateBsf: BigFractionBytes;
  }[];
}

interface ParsedFarmState {
  globalConfig: PublicKey;
  farmTokenMint: PublicKey;
  farmTokenDecimals: BN;
  farmTokenProgram: PublicKey;
  farmVault: PublicKey;
  rewards: {
    index: number;
    mint: PublicKey;
    minClaimDurationSeconds: BN;
    tokenProgram: PublicKey;
    rewardsVault: PublicKey;
  }[];
}

interface ParsedFarmUser {
  pubkey: PublicKey;
  farmState: PublicKey;
  unclaimedRewards: BN[];
}

export class KaminoLendingClient {
  private reserves: PkMap<ParsedReserve> = new PkMap();
  private obligations: PkMap<ParsedObligation> = new PkMap();

  public constructor(
    readonly base: BaseClient,
    readonly vault: VaultClient,
  ) {}

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

  // seeds = [BASE_SEED_USER_STATE, farm_state.key().as_ref(), delegatee.key().as_ref()],
  // for a delegated farm, the delegatee is the obligation, the owner (of farm user state) is the vault PDA
  // for an un-delegated farm, the delegatee and the owner are the same (vault PDA)
  getFarmUserState(farmUser: PublicKey, farm: PublicKey) {
    const [obligationFarm] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), farm.toBuffer(), farmUser.toBuffer()],
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
    reserves: ParsedReserve[],
    skipPriceUpdates: boolean,
    programId: PublicKey = KAMINO_LENDING_PROGRAM,
  ) {
    const keys: Array<AccountMeta> = [];
    for (const { address, market, scopePriceFeed } of reserves) {
      keys.push({
        pubkey: address,
        isSigner: false,
        isWritable: true,
      });
      keys.push({
        pubkey: market,
        isSigner: false,
        isWritable: true,
      });
      if (!skipPriceUpdates) {
        [
          KAMINO_LENDING_PROGRAM, // pyth oracle, null
          KAMINO_LENDING_PROGRAM, // switchboard price oracle, null
          KAMINO_LENDING_PROGRAM, // switchboard twap oracle, null
          scopePriceFeed,
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

  refreshReservesIxs(lendingMarket: PublicKey, reserves: ParsedReserve[]) {
    return reserves.map(({ address, scopePriceFeed }) =>
      this.refreshReserveIx({
        reserve: address,
        lendingMarket,
        pythOracle: KAMINO_LENDING_PROGRAM,
        switchboardPriceOracle: KAMINO_LENDING_PROGRAM,
        switchboardTwapOracle: KAMINO_LENDING_PROGRAM,
        scopePrices: scopePriceFeed,
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
            const obligationFarmUserState = this.getFarmUserState(
              obligation,
              farm,
            );
            return this.refreshObligationFarmsForReserveIx(
              { mode: 0 },
              {
                crank: this.base.signer, // Must be signer
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
            const obligationFarmUserState = this.getFarmUserState(
              obligation,
              farm,
            );
            return this.refreshObligationFarmsForReserveIx(
              { mode: 1 },
              {
                crank: this.base.signer, // Must be signer
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
    const {
      lendingMarket,
      deposits: _deposits,
      borrows: _borrows,
    } = Obligation.decode(obligation, data);

    // Map decoded deposits to the expected format, filtering out empty deposits
    const deposits = _deposits
      .filter(({ depositReserve }) => !depositReserve.equals(PublicKey.default))
      .map(({ depositReserve, depositedAmount, marketValueSf }) => {
        return {
          reserve: depositReserve,
          depositedAmount,
          marketValueSf,
        };
      });

    // Map decoded borrows to the expected format, filtering out empty borrows
    const borrows = _borrows
      .filter(({ borrowReserve }) => !borrowReserve.equals(PublicKey.default))
      .map(
        ({
          borrowReserve,
          borrowedAmountSf,
          marketValueSf,
          cumulativeBorrowRateBsf,
        }) => {
          return {
            reserve: borrowReserve,
            borrowedAmountSf,
            marketValueSf,
            cumulativeBorrowRateBsf,
          };
        },
      );

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
    const cached = this.obligations.get(obligation);
    if (cached) {
      return cached;
    }

    const obligationAccount =
      await this.base.provider.connection.getAccountInfo(obligation);
    if (!obligationAccount) {
      throw new Error("Obligation account not found");
    }

    const parsedObligation = this.parseObligation(
      obligation,
      obligationAccount.data,
    );

    this.obligations.set(obligation, parsedObligation);
    return parsedObligation;
  }

  parseReserve(pubkey: PublicKey, data: Buffer): ParsedReserve {
    const {
      lendingMarket,
      farmCollateral,
      farmDebt,
      liquidity: { mintPubkey, mintDecimals },
      config: {
        tokenInfo: {
          scopeConfiguration: { priceFeed },
        },
      },
      collateralExchangeRate,
      cumulativeBorrowRate,
    } = Reserve.decode(pubkey, data);

    return {
      address: pubkey,
      market: lendingMarket,
      farmCollateral: farmCollateral.equals(PublicKey.default)
        ? null
        : farmCollateral,
      farmDebt: farmDebt.equals(PublicKey.default) ? null : farmDebt,
      liquidityMint: mintPubkey,
      liquidityMintDecimals: mintDecimals.toNumber(),
      scopePriceFeed: priceFeed,
      ...this.reservePdas(lendingMarket, mintPubkey),
      collateralExchangeRate,
      cumulativeBorrowRate,
    };
  }

  async fetchAndParseReserves(reserves: PublicKey[]): Promise<ParsedReserve[]> {
    const requestReservesSet = new PkSet(reserves);
    const cachedReservesSet = new PkSet(Array.from(this.reserves.pkKeys()));

    // If all requested reserves are cached, return data from cache
    if (cachedReservesSet.includes(requestReservesSet)) {
      return Array.from(this.reserves.values()).filter(({ address }) =>
        requestReservesSet.has(address),
      );
    }

    // Only fetch reserves that are not cached
    const reservesToFetch = Array.from(requestReservesSet).filter(
      (r) => !cachedReservesSet.has(r),
    );
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
    reserveAccounts.forEach((account, i) => {
      const parsedReserve = this.parseReserve(
        reservesToFetch[i],
        account!.data,
      );
      this.reserves.set(reservesToFetch[i], parsedReserve);
    });

    // Return requested reserves
    return Array.from(this.reserves.values()).filter(({ address }) =>
      requestReservesSet.has(address),
    );
  }

  /**
   * Finds and parses a reserve account for a given market and asset
   *
   * @param market The lending market public key
   * @param asset The asset public key
   * @returns The parsed reserve account
   */
  async findAndParseReserve(
    market: PublicKey,
    asset: PublicKey,
  ): Promise<ParsedReserve> {
    const accounts = await this.base.provider.connection.getProgramAccounts(
      KAMINO_LENDING_PROGRAM,
      {
        filters: [
          { dataSize: KAMINO_RESERVE_SIZE },
          { memcmp: { offset: 32, bytes: market.toBase58() } },
          { memcmp: { offset: 128, bytes: asset.toBase58() } },
        ],
      },
    );
    if (accounts.length === 0) {
      throw new Error("Reserve not found");
    }
    const parsedReserve = this.parseReserve(
      accounts[0].pubkey,
      accounts[0].account.data,
    );
    this.reserves.set(accounts[0].pubkey, parsedReserve);
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
      this.obligations.set(a.pubkey, parsedObligation);
      return parsedObligation;
    });
  }

  /**
   * Returns two instructions that refresh reserves in batch and refresh obligation
   */
  async refreshReservesAndObligationIxs(
    obligation: PublicKey,
    targetReserve: ParsedReserve,
  ) {
    // Get a set of reserves to refresh
    const { deposits, borrows, lendingMarket } =
      await this.fetchAndParseObligation(obligation);
    const reservesInUse = deposits
      .map(({ reserve }) => reserve)
      .concat(borrows.map(({ reserve }) => reserve));

    // Refresh all reserves, including those in use and target reserve
    const reservesSet = new PkSet();
    reservesInUse.forEach((reserve) => reservesSet.add(reserve));
    reservesSet.add(targetReserve.address);
    const parsedReserves = await this.fetchAndParseReserves(
      Array.from(reservesSet),
    );
    const refreshReservesIx = this.refreshReservesBatchIx(
      parsedReserves,
      false,
    );

    // Refresh obligation with reserves in use (exclude target reserve)
    const refreshObligationIx = this.refreshObligationIx({
      lendingMarket,
      obligation,
      reserves: reservesInUse,
    });

    return [refreshReservesIx, refreshObligationIx];
  }

  /**
   * Returns an instruction to initialize obligation farm user if it doesn't exist
   *
   * @param mode 0 collateral farm, 1 debt farm
   */
  async initObligationFarmUserForReserveIx(
    obligation: PublicKey,
    { address, market, farmCollateral, farmDebt }: ParsedReserve,
    mode: 0 | 1,
    signer?: PublicKey,
  ) {
    const farmState = mode === 0 ? farmCollateral : farmDebt;

    if (!farmState) {
      return { farmUser: null, initIx: null };
    }

    const farmUser = this.getFarmUserState(obligation, farmState);
    const farmUserAccount =
      await this.base.provider.connection.getAccountInfo(farmUser);
    const initIx = farmUserAccount
      ? null
      : await this.base.extKaminoProgram.methods
          .lendingInitObligationFarmsForReserve(mode)
          .accounts({
            glamState: this.base.statePda,
            glamSigner: signer || this.base.signer,
            obligation,
            lendingMarketAuthority: this.getMarketAuthority(market),
            reserve: address,
            reserveFarmState: farmState,
            obligationFarm: farmUser,
            lendingMarket: market,
            farmsProgram: KAMINO_FARM_PROGRAM,
          })
          .instruction();
    return { farmUser, initIx };
  }

  public async initUserMetadataTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const vault = this.base.vaultPda;
    const userMetadata = this.getUserMetadataPda(vault);
    const lookupTable = new PublicKey(0); // FIXME: create lookup table

    const tx = await this.base.extKaminoProgram.methods
      .lendingInitUserMetadata(lookupTable)
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
    const glamSigner = txOptions.signer || this.base.signer;
    const vault = this.base.vaultPda;
    const userMetadata = this.getUserMetadataPda(vault);
    const obligation = this.getObligationPda(vault, market);

    const preInstructions = txOptions.preInstructions || [];
    const postInstructions = txOptions.postInstructions || [];

    const [userMetadataAccount, obligationAccount] =
      await this.base.provider.connection.getMultipleAccountsInfo([
        userMetadata,
        obligation,
      ]);

    // If user metadata doesn't exist, initialize it
    if (!userMetadataAccount) {
      preInstructions.push(
        await this.base.extKaminoProgram.methods
          .lendingInitUserMetadata(new PublicKey(0))
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            userMetadata,
            referrerUserMetadata: null,
          })
          .instruction(),
      );
    }

    // If obligation doesn't exist, initialize it
    if (!obligationAccount) {
      preInstructions.push(
        await this.base.extKaminoProgram.methods
          .lendingInitObligation(DEFAULT_OBLIGATION_ARGS)
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

    const { farmUser: obligationFarmUser, initIx } =
      await this.initObligationFarmUserForReserveIx(
        obligation,
        depositReserve,
        0, // collateral farm
        glamSigner,
      );
    if (initIx) {
      preInstructions.push(initIx);
    }

    if (obligationAccount) {
      const ixs = await this.refreshReservesAndObligationIxs(
        obligation,
        depositReserve,
      );
      preInstructions.push(...ixs);
    } else {
      // Only refresh deposit reserve
      preInstructions.push(
        ...this.refreshReservesIxs(depositReserve.market, [depositReserve]),
      );
      // Refresh obligation with 0 reserves
      preInstructions.push(
        this.refreshObligationIx({
          lendingMarket: market,
          obligation,
          reserves: [],
        }),
      );
    }

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
    const { tokenProgram } = await fetchMintAndTokenProgram(
      this.base.connection,
      asset,
    );
    const userSourceLiquidity = this.base.getVaultAta(asset, tokenProgram);
    if (asset.equals(WSOL)) {
      const wrapSolIxs = await this.vault.maybeWrapSol(amount);
      preInstructions.unshift(...wrapSolIxs);

      // Close wSOL ata automatically after deposit
      // if (wrapSolIxs.length > 0) {
      //   const closeIx = await this.base.extSplProgram.methods
      //     .tokenCloseAccount()
      //     .accounts({
      //       glamState: this.base.statePda,
      //       glamSigner,
      //       tokenAccount: userSourceLiquidity,
      //       cpiProgram: TOKEN_PROGRAM_ID,
      //     })
      //     .instruction();
      //   postInstructions.push(closeIx);
      // }
    }

    const tx = await this.base.extKaminoProgram.methods
      .lendingDepositReserveLiquidityAndObligationCollateralV2(amount)
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
        obligationFarmUserState: obligationFarmUser,
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
    const glamSigner = txOptions.signer || this.base.signer;
    const vault = this.base.vaultPda;
    const obligation = this.getObligationPda(vault, market);

    const preInstructions = [];
    const postInstructions = [];

    const withdrawReserve = await this.findAndParseReserve(market, asset);

    const { farmUser: obligationFarmUser, initIx } =
      await this.initObligationFarmUserForReserveIx(
        obligation,
        withdrawReserve,
        0, // collateral farm
        glamSigner,
      );
    if (initIx) {
      preInstructions.push(initIx);
    }

    const ixs = await this.refreshReservesAndObligationIxs(
      obligation,
      withdrawReserve,
    );
    preInstructions.push(...ixs);

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
    const { tokenProgram } = await fetchMintAndTokenProgram(
      this.base.provider.connection,
      asset,
    );
    const userDestinationLiquidity = this.base.getVaultAta(asset, tokenProgram);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      userDestinationLiquidity,
      vault,
      asset,
      tokenProgram,
    );
    preInstructions.unshift(createAtaIx);

    // When all assets are being withdrawn from a market, the klend program attempts to close the
    // obligation account, which requires the system program. We always pass the system program
    // account as a remaining account just in case.
    const withdrawIx = await this.base.extKaminoProgram.methods
      .lendingWithdrawObligationCollateralAndRedeemReserveCollateralV2(amount)
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
        obligationFarmUserState: obligationFarmUser,
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
    const glamSigner = txOptions.signer || this.base.signer;
    const vault = this.base.vaultPda;
    const obligation = this.getObligationPda(vault, market);

    const preInstructions = [];
    const postInstructions = [];
    const borrowReserve = await this.findAndParseReserve(market, asset);

    const { farmUser: obligationFarmUser, initIx } =
      await this.initObligationFarmUserForReserveIx(
        obligation,
        borrowReserve,
        1, // debt farm
        glamSigner,
      );
    if (initIx) {
      preInstructions.push(initIx);
    }

    const ixs = await this.refreshReservesAndObligationIxs(
      obligation,
      borrowReserve,
    );
    preInstructions.push(...ixs);

    if (borrowReserve.farmDebt) {
      const ixs = this.refreshObligationDebtFarmsForReservesIxs(
        obligation,
        market,
        [borrowReserve],
      );
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after borrow
    }

    // Create asset ATA in case it doesn't exist. Add it to the beginning of preInstructions
    const { tokenProgram } = await fetchMintAndTokenProgram(
      this.base.provider.connection,
      asset,
    );
    const userDestinationLiquidity = this.base.getVaultAta(asset, tokenProgram);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      userDestinationLiquidity,
      vault,
      asset,
      tokenProgram,
    );
    preInstructions.unshift(createAtaIx);

    const borrowIx = await this.base.extKaminoProgram.methods
      .lendingBorrowObligationLiquidityV2(amount)
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
        obligationFarmUserState: obligationFarmUser,
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
    const glamSigner = txOptions.signer || this.base.signer;
    const vault = this.base.vaultPda;
    const obligation = this.getObligationPda(vault, market);

    const preInstructions = [];
    const repayReserve = await this.findAndParseReserve(market, asset);

    const { farmUser: obligationFarmUser, initIx } =
      await this.initObligationFarmUserForReserveIx(
        obligation,
        repayReserve,
        1, // debt farm
        glamSigner,
      );
    if (initIx) {
      preInstructions.push(initIx);
    }

    const ixs = await this.refreshReservesAndObligationIxs(
      obligation,
      repayReserve,
    );
    preInstructions.push(...ixs);

    const { tokenProgram } = await fetchMintAndTokenProgram(
      this.base.provider.connection,
      asset,
    );

    const repayIx = await this.base.extKaminoProgram.methods
      .lendingRepayObligationLiquidityV2(amount)
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
        obligationFarmUserState: obligationFarmUser,
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
  public constructor(
    readonly base: BaseClient,
    readonly kaminoLending: KaminoLendingClient,
  ) {}

  /**
   * Finds and parses farm states for the given owner
   */
  async findAndParseFarmUserStates(
    owner: PublicKey,
  ): Promise<ParsedFarmUser[]> {
    const accounts = await getProgramAccountsWithRetry(
      this.base.provider.connection,
      KAMINO_FARM_PROGRAM,
      [{ dataSize: 920 }, { memcmp: { offset: 48, bytes: owner.toBase58() } }],
    );
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
        pubkey,
        farmState,
        unclaimedRewards,
      };
    });
  }

  async parseFarmState(data: Buffer): Promise<ParsedFarmState> {
    const globalConfig = new PublicKey(data.subarray(40, 72));
    const farmTokenMint = new PublicKey(data.subarray(72, 104));
    const farmTokenDecimals = new BN(data.subarray(104, 112), "le");
    const farmTokenProgram = new PublicKey(data.subarray(112, 144));
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

    const farmVaultOffset = rewardsOffset + numRewards * rewardSize + 24;
    const farmVault = new PublicKey(
      data.subarray(farmVaultOffset, farmVaultOffset + 32),
    );

    return {
      globalConfig,
      farmTokenMint,
      farmTokenDecimals,
      farmTokenProgram,
      farmVault,
      rewards,
    };
  }

  async fetchAndParseFarmStates(farms: PublicKey[]) {
    const farmAccounts =
      await this.base.provider.connection.getMultipleAccountsInfo(farms);

    const map = new PkMap<ParsedFarmState>();

    for (let i = 0; i < farmAccounts.length; i++) {
      const account = farmAccounts[i];
      if (!account) {
        continue;
      }

      const data = account.data;
      const parsedFarm = await this.parseFarmState(data);
      map.set(farms[i], parsedFarm);
    }

    return map;
  }

  farmVaultTokenAccount = (farm: PublicKey, mint: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), farm.toBuffer(), mint.toBuffer()],
      KAMINO_FARM_PROGRAM,
    )[0];

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

  /**
   * Harvest rewards from Kamino farms
   *
   * @param vaultFarmStates GLAM vault's farm states to harvest rewards from
   */
  public async harvest(
    vaultFarmStates: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.harvestTx(vaultFarmStates, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async stake(
    amount: BN,
    farmState: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.stakeTx(amount, farmState, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async unstake(
    amount: BN,
    farmState: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.unstakeTx(amount, farmState, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * farmState.isFarmDelegated = 0
   * farmState.token.mint !== PublicKey.default
   */
  public async stakeTx(
    amount: BN,
    farmState: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;

    const farms = await this.fetchAndParseFarmStates([farmState]);
    const parsedFarmState = farms.get(farmState);
    if (!parsedFarmState) {
      throw new Error("Farm state not found");
    }
    const { farmTokenMint, farmTokenProgram, farmVault } = parsedFarmState;
    if (farmTokenMint.equals(PublicKey.default)) {
      throw new Error("Delegated farm is not supported");
    }

    const farmUserState = this.kaminoLending.getFarmUserState(
      this.base.vaultPda,
      farmState,
    );
    const farmUserStateAccountInfo =
      await this.base.connection.getAccountInfo(farmUserState);
    const preInstructions = txOptions.preInstructions || [];
    if (!farmUserStateAccountInfo) {
      const initUserIx = await this.base.extKaminoProgram.methods
        .farmsInitializeUser()
        .accounts({
          glamState: this.base.statePda,
          glamSigner,
          userState: farmUserState,
          farmState,
        })
        .instruction();
      preInstructions.push(initUserIx);
    }

    const tx = await this.base.extKaminoProgram.methods
      .farmsStake(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        userState: farmUserState,
        farmState,
        farmVault,
        userAta: this.base.getVaultAta(farmTokenMint, farmTokenProgram),
        tokenMint: farmTokenMint,
        scopePrices: null,
        tokenProgram: farmTokenProgram,
      })
      .preInstructions(preInstructions)
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async unstakeTx(
    amount: BN,
    farmState: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;

    const farms = await this.fetchAndParseFarmStates([farmState]);
    const parsedFarmState = farms.get(farmState);
    if (!parsedFarmState) {
      throw new Error("Farm state not found");
    }
    const { farmTokenMint, farmTokenProgram, farmVault } = parsedFarmState;
    if (farmTokenMint.equals(PublicKey.default)) {
      throw new Error("Delegated farm is not supported");
    }

    const farmUserState = this.kaminoLending.getFarmUserState(
      this.base.vaultPda,
      farmState,
    );
    const userAta = this.base.getVaultAta(farmTokenMint, farmTokenProgram);
    const withdrawIx = await this.base.extKaminoProgram.methods
      .farmsWithdrawUnstakedDeposits()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        userState: farmUserState,
        farmState,
        userAta,
        farmVault,
        farmVaultsAuthority: this.farmVaultsAuthority(farmState),
        tokenProgram: farmTokenProgram,
      })
      .instruction();

    const tx = await this.base.extKaminoProgram.methods
      .farmsUnstake(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        userState: farmUserState,
        farmState,
        scopePrices: null,
      })
      .postInstructions([withdrawIx])
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async harvestTx(
    farmUesrStates: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const farmUserStates = (
      await this.findAndParseFarmUserStates(this.base.vaultPda)
    ).filter((farmUser) =>
      farmUesrStates.find((v) => v.equals(farmUser.pubkey)),
    );

    const parsedFarmStates = await this.fetchAndParseFarmStates(
      farmUserStates.map((f) => f.farmState),
    );

    const tx = new Transaction();
    for (const {
      pubkey: userState,
      farmState,
      unclaimedRewards,
    } of farmUserStates) {
      const parsedFarmState = parsedFarmStates.get(farmState);
      if (!parsedFarmState) {
        throw new Error("Farm state not found");
      }
      const { globalConfig, rewards } = parsedFarmState;

      for (const { index, mint, tokenProgram, rewardsVault } of rewards) {
        if (unclaimedRewards[index].eq(new BN(0))) {
          continue;
        }

        const vaultAta = this.base.getVaultAta(mint, tokenProgram);
        const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
          glamSigner,
          vaultAta,
          this.base.vaultPda,
          mint,
          tokenProgram,
        );

        const harvestIx = await this.base.extKaminoProgram.methods
          .farmsHarvestReward(new BN(index))
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
  private vaultStates = new PkMap<KVaultState>();
  private shareMintToVaultPdaMap = new PkMap<PublicKey>();

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
      const vaultState = KVaultState.decode(
        a.pubkey,
        a.account.data,
      ) as KVaultState;

      this.vaultStates.set(a.pubkey, vaultState);
      this.shareMintToVaultPdaMap.set(vaultState.sharesMint, a.pubkey);

      return vaultState;
    });
  }

  async getVaultPdasByShareMints(mints: PublicKey[]): Promise<PublicKey[]> {
    if (this.vaultStates.size === 0) {
      await this.findAndParseKaminoVaults();
    }

    return mints
      .map((mint) => this.shareMintToVaultPdaMap.get(mint))
      .filter((p) => !!p);
  }

  async fetchAndParseVaultState(vault: PublicKey) {
    const vaultAccount =
      await this.base.provider.connection.getAccountInfo(vault);
    if (!vaultAccount) {
      throw new Error(`Kamino vault account not found:, ${vault}`);
    }
    const vaultState = KVaultState.decode(vault, vaultAccount.data);
    this.vaultStates.set(vault, vaultState);
    this.shareMintToVaultPdaMap.set(vaultState.sharesMint, vault);
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
    const glamSigner = txOptions.signer || this.base.signer;

    const vaultState = await this.fetchAndParseVaultState(vault);
    const { tokenProgram: sharesTokenProgram } = await fetchMintAndTokenProgram(
      this.base.provider.connection,
      vaultState.sharesMint,
    );

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

    const tx = await this.base.extKaminoProgram.methods
      .vaultsDeposit(amount)
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
    const glamSigner = txOptions.signer || this.base.signer;

    const vaultState = await this.fetchAndParseVaultState(vault);
    const userTokenAta = this.base.getVaultAta(
      vaultState.tokenMint,
      vaultState.tokenProgram,
    );
    const { tokenProgram: sharesTokenProgram } = await fetchMintAndTokenProgram(
      this.base.provider.connection,
      vaultState.sharesMint,
    );
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

    const tx = await this.base.extKaminoProgram.methods
      .vaultsWithdraw(amount)
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
