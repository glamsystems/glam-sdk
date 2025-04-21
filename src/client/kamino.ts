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
  WSOL,
} from "../constants";

const LOOKUP_TABLE = new PublicKey(
  "284iwGtA9X9aLy3KsyV8uT2pXLARhYbiSi5SiM2g47M2",
);
const DEFAULT_OBLIGATION_ARGS = { tag: 0, id: 0 };
const SCOPE_PRICES = new PublicKey(
  "3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C",
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

function refreshObligation(
  accounts: RefreshObligationAccounts,
  programId: PublicKey,
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
  const ix = new TransactionInstruction({ keys, programId, data });
  return ix;
}

function refreshReserve(
  accounts: RefreshReserveAccounts,
  programId: PublicKey,
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
  const ix = new TransactionInstruction({ keys, programId, data });
  return ix;
}

function refreshObligationFarmsForReserve(
  args: RefreshObligationFarmsForReserveArgs,
  accounts: RefreshObligationFarmsForReserveAccounts,
  programId: PublicKey,
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
  const len = layout.encode(
    {
      mode: args.mode,
    },
    buffer,
  );
  const data = Buffer.concat([identifier, buffer]).slice(0, 8 + len);
  const ix = new TransactionInstruction({ keys, programId, data });
  return ix;
}

interface ParsedReserve {
  address: PublicKey;
  farmCollateral: PublicKey | null;
  farmDebt: PublicKey | null;
  liquidityMint: PublicKey;
  liquiditySupplyVault: PublicKey;
  collateralMint: PublicKey;
  collateralSupplyVault: PublicKey;
  feeVault: PublicKey;
}

interface ParsedObligation {
  deposits: { reserve: PublicKey }[];
  borrows: { reserve: PublicKey }[];
}

export class KaminoLendingClient {
  private reserves: Map<PublicKey, ParsedReserve> = new Map();
  private obligations: Map<PublicKey, ParsedObligation> = new Map();

  public constructor(readonly base: BaseClient) {}

  /**
   * Initializes Kamino user metadata
   *
   * @param statePda
   * @param market Lending market
   * @param referrer Referrer user metadata
   * @param txOptions
   * @returns
   */
  public async initUserMetadata(
    statePda: PublicKey | string,
    referrer?: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.initUserMetadataTx(
      new PublicKey(statePda),
      referrer ? new PublicKey(referrer) : PublicKey.default,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Deposits asset to the lending market.
   *
   * @param statePda
   * @param market Lending market
   * @param asset Asset mint
   * @param amount Amount to deposit
   * @param txOptions
   * @returns
   */
  public async deposit(
    statePda: PublicKey | string,
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(
      new PublicKey(statePda),
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
   * @param statePda
   * @param market Lending market
   * @param asset Asset mint
   * @param amount Amount to deposit
   * @param txOptions
   * @returns
   */
  public async withdraw(
    statePda: PublicKey | string,
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawTx(
      new PublicKey(statePda),
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
   * @param statePda GLAM state
   * @param market Lending market
   * @param asset Asset mint
   * @param amount Amount to borrow
   * @param txOptions
   * @returns
   */
  public async borrow(
    statePda: PublicKey | string,
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.borrowTx(
      new PublicKey(statePda),
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
   * @param statePda
   * @param market
   * @param asset
   * @param amount
   * @param txOptions
   * @returns
   */
  public async repay(
    statePda: PublicKey | string,
    market: PublicKey | string,
    asset: PublicKey | string,
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.repayTx(
      new PublicKey(statePda),
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

  public async initUserMetadataTx(
    glamState: PublicKey,
    referrer: PublicKey,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.getVaultPda(glamState);
    const userMetadata = this.getUserMetadataPda(vault);
    const lookupTable = new PublicKey(0); // FIXME: create lookup table
    const referrerUserMetadata = referrer.equals(PublicKey.default)
      ? KAMINO_LENDING_PROGRAM
      : referrer;

    // @ts-ignore
    const tx = await this.base.program.methods
      .kaminoLendingInitUserMetadata(lookupTable)
      .accounts({
        glamState,
        glamSigner,
        userMetadata,
        referrerUserMetadata,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  refreshReserveIxs(lendingMarket: PublicKey, reserves: PublicKey[]) {
    return reserves.map((reserve) =>
      refreshReserve(
        {
          reserve,
          lendingMarket,
          pythOracle: KAMINO_LENDING_PROGRAM,
          switchboardPriceOracle: KAMINO_LENDING_PROGRAM,
          switchboardTwapOracle: KAMINO_LENDING_PROGRAM,
          scopePrices: SCOPE_PRICES,
        },
        KAMINO_LENDING_PROGRAM,
      ),
    );
  }

  refreshObligationFarmsForReserveIxs(
    obligation: PublicKey,
    lendingMarket: PublicKey,
    parsedReserves: ParsedReserve[],
  ) {
    return parsedReserves
      .map((parsedReserve) => {
        const { farmCollateral, farmDebt } = parsedReserve;
        return [farmCollateral, farmDebt]
          .filter((farm) => !!farm)
          .map((farm) => {
            const obligationFarmUserState = this.getObligationFarmState(
              obligation,
              farm,
            );
            return refreshObligationFarmsForReserve(
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
              KAMINO_LENDING_PROGRAM,
            );
          });
      })
      .flat();
  }

  /**
   * Returns an array of instructions for refreshing an existing obligation and reserves it depends on.
   */
  public async getRefreshIxs(obligation: PublicKey, lendingMarket: PublicKey) {
    // If obligation has deposits or borrows, we need the following refresh ixs:
    // - refreshReserve x N_reserves
    // - refreshObligation
    // - refreshObligationFarmsForReserve x M_farms
    const { deposits, borrows } =
      await this.fetchAndParseObligation(obligation);
    const reserves = deposits.concat(borrows).map((d) => d.reserve);
    const parsedReserves = await this.fetchAndParseReserves(reserves);
    return [
      ...this.refreshReserveIxs(lendingMarket, reserves),
      refreshObligation(
        { lendingMarket, obligation, reserves },
        KAMINO_LENDING_PROGRAM,
      ),
      ...this.refreshObligationFarmsForReserveIxs(
        obligation,
        lendingMarket,
        parsedReserves,
      ),
    ];
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

  /**
   * Fetches and parses obligation account
   *
   * @param obligation User obligation pubkey
   * @returns Pubkeys of reserves for deposits and borrows
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
      return { deposits: [], borrows: [] };
    }

    const data = obligationAccount.data;

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
      return { reserve: new PublicKey(depositData.subarray(0, 32)) };
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
      return { reserve: new PublicKey(borrowData.subarray(0, 32)) };
    }).filter((d) => !d.reserve.equals(PublicKey.default));

    const parsedObligation = { deposits, borrows };
    this.obligations.set(obligation, parsedObligation);
    return parsedObligation;
  }

  pubkeyArraysEqual = (a: PublicKey[], b: PublicKey[]) => {
    if (a.length !== b.length) return false;
    a.sort();
    b.sort();
    return a.every((p, i) => p.equals(b[i]));
  };

  /**
   * We only need pubkeys that don't change over time. No need to fetch them every time.
   *
   * @param market
   * @param asset
   * @returns
   */
  async fetchAndParseReserves(reserves: PublicKey[]): Promise<ParsedReserve[]> {
    if (this.pubkeyArraysEqual(reserves, Array.from(this.reserves.keys()))) {
      return Array.from(this.reserves.values());
    }

    const reserveAccounts =
      await this.base.provider.connection.getMultipleAccountsInfo(reserves);
    if (reserveAccounts.find((a) => !a)) {
      throw new Error("Not all reserves can be found");
    }

    return reserveAccounts
      .filter((a) => !!a)
      .map((account, i) => {
        const data = account.data;
        const market = new PublicKey(data.subarray(32, 64));
        const farmCollateral = new PublicKey(data.subarray(64, 96));
        const farmDebt = new PublicKey(data.subarray(96, 128));
        const liquidityMint = new PublicKey(data.subarray(128, 160));

        const parsed = {
          address: reserves[i],
          farmCollateral: farmCollateral.equals(PublicKey.default)
            ? null
            : farmCollateral,
          farmDebt: farmDebt.equals(PublicKey.default) ? null : farmDebt,
          liquidityMint,
          ...this.reservePdas(market, liquidityMint),
        };

        this.reserves.set(reserves[i], parsed);
        return parsed;
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
          {
            memcmp: {
              offset: 32,
              bytes: market.toBase58(),
            },
          },
          {
            memcmp: {
              offset: 128,
              bytes: asset.toBase58(),
            },
          },
        ],
      },
    );
    if (accounts.length === 0) {
      throw new Error("Reserve not found");
    }
    const account = accounts[0];
    const data = account.account.data;
    const farmCollateral = new PublicKey(data.subarray(64, 96));
    const farmDebt = new PublicKey(data.subarray(96, 128));
    const parsed = {
      address: account.pubkey,
      farmCollateral: farmCollateral.equals(PublicKey.default)
        ? null
        : farmCollateral,
      farmDebt: farmDebt.equals(PublicKey.default) ? null : farmDebt,
      liquidityMint: asset,
      ...this.reservePdas(market, asset),
    };
    this.reserves.set(account.pubkey, parsed);
    return parsed;
  }

  public async depositTx(
    glamState: PublicKey,
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.getVaultPda(glamState);
    const userMetadata = this.getUserMetadataPda(vault);

    const preInstructions = [];
    const postInstructions = [];
    const depositReserve = await this.findAndParseReserve(market, asset);
    const obligation = this.getObligationPda(
      vault,
      market,
      DEFAULT_OBLIGATION_ARGS,
    );

    // If obligation doesn't exist, initialize & refresh obligation and collateral farm state first
    const obligationAccount =
      await this.base.provider.connection.getAccountInfo(obligation);
    if (!obligationAccount) {
      preInstructions.push(
        await this.base.program.methods
          .kaminoLendingInitObligation(DEFAULT_OBLIGATION_ARGS)
          .accounts({
            glamState,
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
            .kaminoLendingInitObligationFarmsForReserve(0) // TODO: What does mode do?
            .accounts({
              glamState,
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
      refreshObligation(
        { lendingMarket: market, obligation, reserves: reservesInUse },
        KAMINO_LENDING_PROGRAM,
      ),
    );

    if (depositReserve.farmCollateral) {
      const ixs = this.refreshObligationFarmsForReserveIxs(obligation, market, [
        depositReserve,
      ]);
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after deposit
    }

    // If deposit asset is WSOL, wrap SOL first in case vault doesn't have enough wSOL
    const userSourceLiquidity = this.base.getVaultAta(glamState, asset);
    if (asset.equals(WSOL)) {
      const wrapSolIxs = await this.base.maybeWrapSol(glamState, amount);
      preInstructions.unshift(...wrapSolIxs);

      // Close wSOL ata automatically after deposit
      if (wrapSolIxs.length > 0) {
        const closeIx = await this.base.program.methods
          .tokenCloseAccount()
          .accounts({
            glamState,
            glamSigner,
            tokenAccount: userSourceLiquidity,
            cpiProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();
        postInstructions.push(closeIx);
      }
    }

    // @ts-ignore
    const tx = await this.base.program.methods
      .kaminoLendingDepositReserveLiquidityAndObligationCollateralV2(amount)
      .accounts({
        glamState,
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
        liquidityTokenProgram: TOKEN_PROGRAM_ID,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        obligationFarmUserState: obligationFarm,
        reserveFarmState: depositReserve.farmCollateral,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    const lookupTables =
      txOptions.lookupTables ||
      (await this.base.getAdressLookupTableAccounts([LOOKUP_TABLE]));
    const vTx = await this.base.intoVersionedTransaction(tx, {
      ...txOptions,
      lookupTables,
    });
    return vTx;
  }

  public async withdrawTx(
    glamState: PublicKey,
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.getVaultPda(glamState);

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
            .kaminoLendingInitObligationFarmsForReserve(0) // TODO: What does mode do?
            .accounts({
              glamState,
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
      refreshObligation(
        { lendingMarket: market, obligation, reserves: reservesInUse },
        KAMINO_LENDING_PROGRAM,
      ),
    );

    if (withdrawReserve.farmCollateral) {
      const ixs = this.refreshObligationFarmsForReserveIxs(obligation, market, [
        withdrawReserve,
      ]);
      preInstructions.push(...ixs);
      postInstructions.push(...ixs); // farms must be refreshed after withdraw
    }

    // Create asset ATA in case it doesn't exist. Add it to the beginning of preInstructions
    const userDestinationLiquidity = this.base.getVaultAta(glamState, asset);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      userDestinationLiquidity,
      vault,
      asset,
    );
    preInstructions.unshift(createAtaIx);

    const withdrawIx = await this.base.program.methods
      .kaminoLendingWithdrawObligationCollateralAndRedeemReserveCollateralV2(
        amount,
      )
      .accounts({
        glamState,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.getMarketAuthority(market),
        withdrawReserve: withdrawReserve.address,
        reserveLiquidityMint: asset,
        reserveSourceCollateral: withdrawReserve.collateralSupplyVault,
        reserveCollateralMint: withdrawReserve.collateralMint,
        reserveLiquiditySupply: withdrawReserve.liquiditySupplyVault,
        userDestinationLiquidity: this.base.getVaultAta(glamState, asset),
        placeholderUserDestinationCollateral: null,
        collateralTokenProgram: TOKEN_PROGRAM_ID,
        liquidityTokenProgram: TOKEN_PROGRAM_ID,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        obligationFarmUserState: obligationFarm,
        reserveFarmState: withdrawReserve.farmCollateral,
        farmsProgram: KAMINO_FARM_PROGRAM,
      })
      .instruction();

    // The final instructions in the tx:
    // - refreshReserve * N
    // - refreshObligation
    // - refreshObligationFarmsForReserve (if farm exists)
    // - withdrawIx
    // - refreshObligationFarmsForReserve (if farm exists)
    const tx = new Transaction();
    tx.add(...preInstructions, withdrawIx, ...postInstructions);

    const lookupTables =
      txOptions.lookupTables ||
      (await this.base.getAdressLookupTableAccounts([LOOKUP_TABLE]));
    const vTx = await this.base.intoVersionedTransaction(tx, {
      ...txOptions,
      lookupTables,
    });
    return vTx;
  }

  public async borrowTx(
    glamState: PublicKey,
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.getVaultPda(glamState);

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
            .kaminoLendingInitObligationFarmsForReserve(0) // TODO: What does mode do?
            .accounts({
              glamState,
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
      refreshObligation(
        { lendingMarket: market, obligation, reserves: reservesInUse },
        KAMINO_LENDING_PROGRAM,
      ),
    );

    // Don't need to refresh debt farm for borrow
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
    const userDestinationLiquidity = this.base.getVaultAta(glamState, asset);
    const createAtaIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      userDestinationLiquidity,
      vault,
      asset,
    );
    preInstructions.unshift(createAtaIx);

    const borrowIx = await this.base.program.methods
      .kaminoLendingBorrowObligationLiquidityV2(amount)
      .accounts({
        glamState,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.getMarketAuthority(market),
        borrowReserve: borrowReserve.address,
        borrowReserveLiquidityMint: asset,
        reserveSourceLiquidity: borrowReserve.liquiditySupplyVault,
        borrowReserveLiquidityFeeReceiver: borrowReserve.feeVault,
        userDestinationLiquidity: this.base.getVaultAta(glamState, asset),
        referrerTokenState: null,
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
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

    const lookupTables =
      txOptions.lookupTables ||
      (await this.base.getAdressLookupTableAccounts([LOOKUP_TABLE]));
    const vTx = await this.base.intoVersionedTransaction(tx, {
      ...txOptions,
      lookupTables,
    });
    return vTx;
  }

  public async repayTx(
    glamState: PublicKey,
    market: PublicKey,
    asset: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.getVaultPda(glamState);

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
            .kaminoLendingInitObligationFarmsForReserve(0) // TODO: What does mode do?
            .accounts({
              glamState,
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
      refreshObligation(
        { lendingMarket: market, obligation, reserves: reservesInUse },
        KAMINO_LENDING_PROGRAM,
      ),
    );

    const repayIx = await this.base.program.methods
      .kaminoLendingRepayObligationLiquidityV2(amount)
      .accounts({
        glamState,
        glamSigner,
        obligation,
        lendingMarket: market,
        lendingMarketAuthority: this.getMarketAuthority(market),
        repayReserve: repayReserve.address,
        reserveLiquidityMint: asset,
        reserveDestinationLiquidity: repayReserve.liquiditySupplyVault,
        userSourceLiquidity: this.base.getVaultAta(glamState, asset),
        instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
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

    const lookupTables =
      txOptions.lookupTables ||
      (await this.base.getAdressLookupTableAccounts([LOOKUP_TABLE]));
    const vTx = await this.base.intoVersionedTransaction(tx, {
      ...txOptions,
      lookupTables,
    });
    return vTx;
  }
}
