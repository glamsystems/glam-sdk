import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  TransactionInstruction,
  Transaction,
  AccountInfo,
} from "@solana/web3.js";
import {
  MarketType,
  OrderParams,
  PositionDirection,
  SpotPosition,
  PerpPosition,
  ModifyOrderParams,
  OracleSource,
  SpotBalanceType,
  MarginMode,
  Order,
} from "../utils/driftTypes";
import { DriftVaultLayout, DriftVault } from "../deser/driftLayouts";
import { decodeUser } from "../utils/driftUser";

import { BaseClient, TxOptions } from "./base";
import { AccountMeta } from "@solana/web3.js";
import {
  DRIFT_PROGRAM_ID,
  DRIFT_VAULT_DEPOSITOR_SIZE,
  DRIFT_VAULTS_PROGRAM_ID,
  GLAM_REFERRER,
  WSOL,
} from "../constants";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { StateModel } from "../models";
import { BN } from "@coral-xyz/anchor";

const DRIFT_DISTRIBUTOR_PROGRAM = new PublicKey(
  "E7HtfkEMhmn9uwL7EFNydcXBWy5WCYN1vFmKKjipEH1x",
);
const DRIFT = new PublicKey("DriFtupJYLTosbwoN8koMbEYSx54aFAVLddWsbksjwg7");

interface OrderConstants {
  perpBaseScale: number;
  quoteScale: number;
}

export interface SpotMarket {
  name: string;
  marketIndex: number;
  marketPda: PublicKey;
  vault: PublicKey;
  oracle: PublicKey;
  oracleSource: OracleSource;
  mint: PublicKey;
  decimals: number;
  tokenProgram: PublicKey;
  cumulativeDepositInterest: BN;
  cumulativeBorrowInterest: BN;
}

export interface PerpMarket {
  name: string;
  marketIndex: number;
  marketPda: PublicKey;
  oracle: PublicKey;
  oracleSource: OracleSource;
}

export interface DriftMarketConfigs {
  orderConstants: OrderConstants;
  perpMarkets: PerpMarket[];
  spotMarkets: SpotMarket[];
}

export interface DriftUser {
  delegate: PublicKey;
  name: string;
  spotPositions: (SpotPosition & {
    amount: number;
    uiAmount: number;
    mint: PublicKey;
    decimals: number;
    marketName: string;
  })[]; // extra fields amount and uiAmount
  perpPositions: PerpPosition[];
  marginMode: MarginMode;
  subAccountId: number;
  isMarginTradingEnabled: boolean;
  maxMarginRatio: number;
  orders: Order[];
  poolId: number;
}

const DRIFT_SIGNER = new PublicKey(
  "JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw",
);
const DRIFT_MARGIN_PRECISION = 10_000;

export class DriftClient {
  private spotMarkets = new Map<number, SpotMarket>();
  private perpMarkets = new Map<number, PerpMarket>();
  private marketConfigs: DriftMarketConfigs | null = null;

  public constructor(readonly base: BaseClient) {}

  /*
   * Client methods
   */

  public async initialize(
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.initializeTx(subAccountId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async updateUserCustomMarginRatio(
    maxLeverage: number, // 1=1x, 2=2x ... 50=50x leverage
    subAccountId: number = 0,
  ): Promise<TransactionSignature> {
    const tx = await this.updateUserCustomMarginRatioTx(
      maxLeverage,
      subAccountId,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async updateUserMarginTradingEnabled(
    marginTradingEnabled: boolean,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.updateUserMarginTradingEnabledTx(
      marginTradingEnabled,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async updateUserDelegate(
    delegate: PublicKey | string,
    subAccountId: number = 0,
  ): Promise<TransactionSignature> {
    const tx = await this.updateUserDelegateTx(
      new PublicKey(delegate),
      subAccountId,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async deleteUser(
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.deleteUserTx(subAccountId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async deposit(
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(
      amount,
      marketIndex,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async withdraw(
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawTx(
      amount,
      marketIndex,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async placeOrder(
    orderParams: OrderParams,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.placeOrderTx(orderParams, subAccountId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async modifyOrder(
    modifyOrderParams: ModifyOrderParams,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.modifyOrderTx(
      modifyOrderParams,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async cancelOrders(
    marketType: MarketType,
    marketIndex: number,
    direction: PositionDirection,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.cancelOrdersTx(
      marketType,
      marketIndex,
      direction,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async cancelOrdersByIds(
    orderIds: number[],
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.cancelOrdersByIdsTx(
      orderIds,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async settlePnl(
    marketIndex: number,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.settlePnlTx(marketIndex, subAccountId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /*
   * Utils
   */

  getMarketPda = (marketType: MarketType, marketIndex: number) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from(
          `${marketType === MarketType.PERP ? "perp" : "spot"}_market`,
        ),
        new anchor.BN(marketIndex).toArrayLike(Buffer, "le", 2),
      ],
      DRIFT_PROGRAM_ID,
    )[0];

  getUserPda = (authority: PublicKey, subAccountId = 0) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("user"),
        authority.toBuffer(),
        new anchor.BN(subAccountId).toArrayLike(Buffer, "le", 2),
      ],
      DRIFT_PROGRAM_ID,
    )[0];

  getUserStatsPda = (authority: PublicKey): PublicKey =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("user_stats"), authority.toBuffer()],
      DRIFT_PROGRAM_ID,
    )[0];

  getGlamReferrerPdas(): { user: PublicKey; userStats: PublicKey } {
    return {
      user: this.getUserPda(GLAM_REFERRER, 0),
      userStats: this.getUserStatsPda(GLAM_REFERRER),
    };
  }

  parsePerpMarket(data: Buffer): PerpMarket {
    const marketPda = new PublicKey(data.subarray(8, 40));
    const oracle = new PublicKey(data.subarray(40, 72));

    const name = this.charsToName(data.subarray(1000, 1032));

    const oralceEnum = data.subarray(926, 927).readUint8();
    const oracleSource = OracleSource.get(oralceEnum);

    const marketIndex = data.subarray(1160, 1162).readUint16LE();

    return {
      name,
      marketPda,
      marketIndex,
      oracle,
      oracleSource,
    };
  }

  parseSpotMarket(data: Buffer): SpotMarket {
    const marketPda = new PublicKey(data.subarray(8, 40));
    const oracle = new PublicKey(data.subarray(40, 72));
    const mint = new PublicKey(data.subarray(72, 104));
    const vault = new PublicKey(data.subarray(104, 136));

    const name = this.charsToName(data.subarray(136, 168));

    const cumulativeDepositInterest = new BN(data.subarray(464, 480), "le");
    const cumulativeBorrowInterest = new BN(data.subarray(480, 496), "le");

    const decimals = data.subarray(680, 684).readUint32LE();
    const marketIndex = data.subarray(684, 686).readUint16LE();
    const oralceEnum = data.subarray(687, 688).readUint8();
    const oracleSource = OracleSource.get(oralceEnum);

    const tokenProgram =
      data.subarray(734, 735).readUint8() == 0
        ? TOKEN_PROGRAM_ID
        : TOKEN_2022_PROGRAM_ID;

    return {
      name,
      marketIndex,
      marketPda,
      oracle,
      oracleSource,
      vault,
      mint,
      decimals,
      tokenProgram,
      cumulativeDepositInterest,
      cumulativeBorrowInterest,
    };
  }

  async calcSpotBalance(
    marketIndex: number,
    scaledBalance: BN,
    scaledBalanceType: SpotBalanceType,
  ): Promise<{ amount: number; uiAmount: number }> {
    const { decimals, cumulativeDepositInterest, cumulativeBorrowInterest } =
      await this.fetchAndParseSpotMarket(marketIndex);
    const precisionAdjustment = new BN(10 ** (19 - decimals));

    let interest = cumulativeDepositInterest;
    if (scaledBalanceType === SpotBalanceType.BORROW) {
      interest = cumulativeBorrowInterest;
    }

    const balance = scaledBalance.mul(interest).div(precisionAdjustment);
    const amount =
      scaledBalanceType === SpotBalanceType.BORROW
        ? balance.neg().toNumber()
        : balance.toNumber();

    const uiAmount = amount / 10 ** decimals;
    return { amount, uiAmount };
  }

  public getDriftUserPdas(subAccountId: number = 0): {
    user: PublicKey;
    userStats: PublicKey;
  } {
    const vault = this.base.vaultPda;
    return {
      user: this.getUserPda(vault, subAccountId),
      userStats: this.getUserStatsPda(vault),
    };
  }

  get driftStatePda(): PublicKey {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("drift_state")],
      DRIFT_PROGRAM_ID,
    )[0];
  }

  public async fetchAndParseSpotMarket(
    marketIndex: number,
    skipCache: boolean = false,
  ): Promise<SpotMarket> {
    const markets = await this.fetchAndParseSpotMarkets(
      [marketIndex],
      skipCache,
    );
    if (!markets || markets.length === 0) {
      throw new Error(`Spot market not found at index ${marketIndex}`);
    }
    return markets[0];
  }

  public async fetchAndParseSpotMarkets(
    marketIndexes: number[],
    skipCache: boolean = false,
  ): Promise<SpotMarket[]> {
    const indexesToFetch = marketIndexes.filter(
      (marketIndex) => skipCache || !this.spotMarkets.has(marketIndex),
    );

    if (indexesToFetch.length > 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("Fetching spot markets:", indexesToFetch);
      }

      const marketPdas = indexesToFetch.map((marketIndex) =>
        this.getMarketPda(MarketType.SPOT, marketIndex),
      );
      const accounts =
        await this.base.provider.connection.getMultipleAccountsInfo(marketPdas);
      accounts.forEach((account) => {
        if (account) {
          const spotMarket = this.parseSpotMarket(account.data);
          this.spotMarkets.set(spotMarket.marketIndex, spotMarket);
        }
      });
    }

    // At this point this.spotMarkets should have all the requested markets
    // If not, it means some market indexes are invalid and we throw an error
    const spotMarkets = marketIndexes
      .map((marketIndex) => this.spotMarkets.get(marketIndex)!)
      .filter((m) => m);
    const invalidIndexes = marketIndexes.filter(
      (marketIndex) => !this.spotMarkets.has(marketIndex),
    );
    if (invalidIndexes.length > 0 && process.env.NODE_ENV === "development") {
      console.warn(
        `The following spot markets could not be found: ${invalidIndexes.join(", ")}`,
      );
    }
    return spotMarkets;
  }

  public async fetchAndParsePerpMarket(
    marketIndex: number,
    skipCache: boolean = false,
  ): Promise<PerpMarket> {
    const markets = await this.fetchAndParsePerpMarkets(
      [marketIndex],
      skipCache,
    );
    if (!markets || markets.length === 0) {
      throw new Error(`Perp market not found at index ${marketIndex}`);
    }
    return markets[0];
  }

  public async fetchAndParsePerpMarkets(
    marketIndexes: number[],
    skipCache: boolean = false,
  ): Promise<PerpMarket[]> {
    const indexesToFetch = marketIndexes.filter(
      (marketIndex) => skipCache || !this.perpMarkets.has(marketIndex),
    );

    if (indexesToFetch.length > 0) {
      if (process.env.NODE_ENV === "development") {
        console.log("Fetching perp markets:", indexesToFetch);
      }

      const marketPdas = marketIndexes.map((marketIndex) =>
        this.getMarketPda(MarketType.PERP, marketIndex),
      );
      const accounts =
        await this.base.provider.connection.getMultipleAccountsInfo(marketPdas);
      accounts.forEach((account) => {
        if (account) {
          const perpMarket = this.parsePerpMarket(account.data);
          this.perpMarkets.set(perpMarket.marketIndex, perpMarket);
        }
      });
    } else {
      if (process.env.NODE_ENV === "development") {
        console.log("Requested perp markets already cached:", marketIndexes);
      }
    }

    const perpMarkets = marketIndexes
      .map((marketIndex) => this.perpMarkets.get(marketIndex)!)
      .filter((m) => m);
    const invalidIndexes = marketIndexes.filter(
      (marketIndex) => !this.perpMarkets.has(marketIndex),
    );
    if (invalidIndexes.length > 0) {
      console.warn(
        `The following perp markets could not be found: ${invalidIndexes.join(", ")}`,
      );
    }
    return perpMarkets;
  }

  public async fetchMarketConfigs(
    skipCache: boolean = false,
  ): Promise<DriftMarketConfigs> {
    // Attempt to fetch market configs from glam API first
    const glamApi = process.env.NEXT_PUBLIC_GLAM_API || process.env.GLAM_API;
    if (glamApi) {
      const response = await fetch(`${glamApi}/v0/drift/market_configs/`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch market configs from ${glamApi}: ${response.status}`,
        );
      }
      const data = await response.json();
      const { orderConstants, perp, spot } = data;

      // Transform market data from API to `PerpMarket`/`SpotMarket` objects
      const perpMarkets = perp.map((m: any) => ({
        name: m.symbol,
        marketIndex: m.marketIndex,
        marketPda: new PublicKey(m.marketPDA),
        oracle: new PublicKey(m.oracle),
        oracleSource: OracleSource.fromString(m.oracleSource),
      })) as PerpMarket[];
      const spotMarkets = spot.map((m: any) => ({
        name: m.symbol,
        marketIndex: m.marketIndex,
        marketPda: new PublicKey(m.marketPDA),
        vault: new PublicKey(m.vaultPDA),
        oracle: new PublicKey(m.oracle),
        oracleSource: OracleSource.fromString(m.oracleSource),
        mint: new PublicKey(m.mint),
        decimals: m.decimals,
        tokenProgram: new PublicKey(m.tokenProgram),
        cumulativeDepositInterest: new BN(m.cumulativeDepositInterest),
        cumulativeBorrowInterest: new BN(m.cumulativeBorrowInterest),
      })) as SpotMarket[];

      // Cache market objects
      perpMarkets.forEach((m) => {
        this.perpMarkets.set(m.marketIndex, m);
      });
      spotMarkets.forEach((m) => {
        this.spotMarkets.set(m.marketIndex, m);
      });

      const marketConfigs = {
        orderConstants,
        perpMarkets,
        spotMarkets,
      };
      this.marketConfigs = marketConfigs;
      return marketConfigs;
    }

    // If glam API is not available, fetch market configs from RPC
    // Force refetching if skipCache is true
    if (!this.marketConfigs || skipCache) {
      const perpMarkets = await this.fetchAndParsePerpMarkets(
        Array.from(Array(100).keys()),
        skipCache,
      );
      const spotMarkets = await this.fetchAndParseSpotMarkets(
        Array.from(Array(100).keys()),
        skipCache,
      );

      this.marketConfigs = {
        orderConstants: { perpBaseScale: 9, quoteScale: 6 },
        perpMarkets,
        spotMarkets,
      };
    }
    return this.marketConfigs;
  }

  charsToName(chars: number[] | Buffer): string {
    return String.fromCharCode(...chars)
      .replace(/\0/g, "")
      .trim();
  }

  async parseDriftUser(
    accountInfo: AccountInfo<Buffer>,
    subAccountId: number,
  ): Promise<DriftUser> {
    const {
      delegate,
      name,
      spotPositions,
      marginMode,
      perpPositions,
      isMarginTradingEnabled,
      maxMarginRatio,
      orders,
      poolId,
    } = decodeUser(accountInfo.data);

    // Fetch spot and perp markets used by this user
    const spotMarketIndexes = spotPositions.map((p) => p.marketIndex);
    const perpMarketIndexes = perpPositions.map((p) => p.marketIndex);
    await Promise.all([
      this.fetchAndParseSpotMarkets(spotMarketIndexes),
      this.fetchAndParsePerpMarkets(perpMarketIndexes),
    ]);

    // Extend spot positions with market info
    const spotPositionsExt = await Promise.all(
      spotPositions.map(async (p) => {
        const { amount, uiAmount } = await this.calcSpotBalance(
          p.marketIndex,
          p.scaledBalance,
          p.balanceType,
        );
        const spotMarket = this.spotMarkets.get(p.marketIndex);
        return {
          ...p,
          amount,
          uiAmount,
          mint: spotMarket!.mint,
          decimals: spotMarket!.decimals,
          marketName: spotMarket!.name,
        };
      }),
    );

    return {
      delegate,
      name: this.charsToName(name),
      spotPositions: spotPositionsExt,
      perpPositions,
      orders,
      marginMode,
      subAccountId,
      isMarginTradingEnabled,
      maxMarginRatio,
      poolId,
    };
  }

  public async fetchDriftUser(
    subAccountId: number = 0,
    skipCache: boolean = false,
  ): Promise<DriftUser | null> {
    const { user } = this.getDriftUserPdas(subAccountId);
    const accountInfo =
      await this.base.provider.connection.getAccountInfo(user);
    if (!accountInfo) {
      return null;
    }

    // Prefetch market configs
    await this.fetchMarketConfigs(skipCache);

    return await this.parseDriftUser(accountInfo, subAccountId);
  }

  public async fetchDriftUsers(
    skipCache: boolean = false,
  ): Promise<DriftUser[]> {
    const userPdas = Array.from(Array(8).keys()).map((subAccountId) => {
      const { user } = this.getDriftUserPdas(subAccountId);
      return user;
    });
    const accountsInfo =
      await this.base.provider.connection.getMultipleAccountsInfo(userPdas);

    const subAccountsInfoAndIds: [any, number][] = [];
    accountsInfo.forEach((a, i) => {
      if (a) {
        subAccountsInfoAndIds.push([a, i]);
      }
    });

    // Prefetch market configs
    const marketConfigs = await this.fetchMarketConfigs(skipCache);

    return await Promise.all(
      subAccountsInfoAndIds.map(([accountInfo, subAccountId]) =>
        this.parseDriftUser(accountInfo, subAccountId),
      ),
    );
  }

  /**
   * @deprecated
   */
  async fetchPolicyConfig(stateModel: StateModel) {
    const driftUserAccount = await this.fetchDriftUser();

    let delegate = driftUserAccount?.delegate;
    if (delegate && delegate.equals(PublicKey.default)) {
      delegate = undefined;
    }
    return {
      driftAccessControl: delegate ? 0 : 1,
      driftDelegatedAccount: delegate || null,
      driftMarketIndexesPerp: stateModel?.driftMarketIndexesPerp || [],
      driftOrderTypes: stateModel?.driftOrderTypes || [],
      driftMaxLeverage: driftUserAccount?.maxMarginRatio
        ? DRIFT_MARGIN_PRECISION / driftUserAccount?.maxMarginRatio
        : null,
      driftEnableSpot: driftUserAccount?.isMarginTradingEnabled || false,
      driftMarketIndexesSpot: stateModel?.driftMarketIndexesSpot || [],
    };
  }

  marketTypeEquals = (a: MarketType | undefined, b: MarketType) =>
    a && Object.keys(a)[0] === Object.keys(b)[0];

  async composeRemainingAccounts(
    subAccountId: number,
    marketType?: MarketType,
    marketIndex?: number,
  ): Promise<AccountMeta[]> {
    const driftUser = await this.fetchDriftUser(subAccountId);
    if (!driftUser) {
      throw new Error("Drift user not found");
    }
    const { spotPositions, perpPositions } = driftUser;
    const spotMarketIndexes = spotPositions.map((p) => p.marketIndex);
    const perpMarketIndexes = perpPositions.map((p) => p.marketIndex);

    // Note that marketIndex is could be 0, need to explicitly check undefined
    if (
      this.marketTypeEquals(marketType, MarketType.SPOT) &&
      marketIndex !== undefined &&
      !spotMarketIndexes.includes(marketIndex)
    ) {
      spotMarketIndexes.push(marketIndex);
    } else if (
      this.marketTypeEquals(marketType, MarketType.PERP) &&
      marketIndex !== undefined &&
      !perpMarketIndexes.includes(marketIndex)
    ) {
      perpMarketIndexes.push(marketIndex);
    }

    // Also include USDC spot market if we're composing remaining accounts for spot or perp orders
    if (
      this.marketTypeEquals(marketType, MarketType.PERP) ||
      this.marketTypeEquals(marketType, MarketType.SPOT)
    ) {
      if (!spotMarketIndexes.includes(0)) {
        spotMarketIndexes.push(0);
      }
    }

    const spotMarkets = await this.fetchAndParseSpotMarkets(spotMarketIndexes);
    const perpMarkets = await this.fetchAndParsePerpMarkets(perpMarketIndexes);

    if (process.env.NODE_ENV === "development") {
      console.log("[composeRemainingAccounts] perpMarkets:", perpMarkets);
    }

    const oracles = spotMarkets
      .map((m) => m.oracle)
      .concat(perpMarkets.map((m) => m.oracle));
    const markets = spotMarkets
      .map((m) => m.marketPda)
      .concat(perpMarkets.map((m) => m.marketPda));

    if (process.env.NODE_ENV === "development") {
      console.log(
        "[composeRemainingAccounts] markets:",
        markets.map((m) => m.toBase58()),
      );
      console.log(
        "[composeRemainingAccounts] oracles:",
        oracles.map((o) => o.toBase58()),
      );
    }

    return oracles
      .map((o) => ({
        pubkey: new PublicKey(o),
        isWritable: false,
        isSigner: false,
      }))
      .concat(
        markets.map((m) => ({
          pubkey: new PublicKey(m),
          isWritable: true,
          isSigner: false,
        })),
      );
  }

  getClaimStatus(claimant: PublicKey, distributor: PublicKey): PublicKey {
    const [claimStatus] = PublicKey.findProgramAddressSync(
      [Buffer.from("ClaimStatus"), claimant.toBuffer(), distributor.toBuffer()],
      DRIFT_DISTRIBUTOR_PROGRAM,
    );
    return claimStatus;
  }

  public async claim(
    distributor: PublicKey,
    amountUnlocked: BN,
    amountLocked: BN,
    proof: number[][],
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;
    const vaultAta = this.base.getVaultAta(DRIFT);
    const distributorAta = this.base.getAta(DRIFT, distributor);

    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        vaultAta,
        vault,
        DRIFT,
      ),
    ];

    const tx = await this.base.program.methods
      .driftDistributorNewClaim(amountUnlocked, amountLocked, proof)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        distributor,
        claimStatus: this.getClaimStatus(vault, distributor),
        from: distributorAta,
        to: vaultAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, { ...txOptions });
    return await this.base.sendAndConfirm(vTx);
  }

  async initializeUserStatsIx(
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { userStats } = this.getDriftUserPdas();

    // @ts-ignore
    return await this.base.program.methods
      .driftInitializeUserStats()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        state: this.driftStatePda,
        userStats,
      })
      .instruction();
  }

  async initializeUserIx(
    glamSigner: PublicKey,
    subAccountId: number,
  ): Promise<TransactionInstruction> {
    const name = `GLAM *.+ ${subAccountId}`
      .split("")
      .map((char) => char.charCodeAt(0))
      .concat(Array(24).fill(0));

    const { user, userStats } = this.getDriftUserPdas(subAccountId);

    const { user: referrer, userStats: referrerStats } =
      this.getGlamReferrerPdas();
    const remainingAccounts = [
      { pubkey: referrer, isWritable: true, isSigner: false },
      { pubkey: referrerStats, isWritable: true, isSigner: false },
    ];

    return await this.base.program.methods
      .driftInitializeUser(subAccountId, name)
      .accounts({
        glamState: this.base.statePda,
        user,
        userStats,
        state: this.driftStatePda,
        glamSigner,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  async updateUserPoolIdIx(
    subAccountId: number,
    poolId: number,
  ): Promise<TransactionInstruction> {
    const { user } = this.getDriftUserPdas(subAccountId);

    return await this.base.program.methods
      .driftUpdateUserPoolId(subAccountId, poolId)
      .accounts({
        glamState: this.base.statePda,
        user,
      })
      .instruction();
  }

  public async initializeTx(
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = new Transaction();

    // Create userStats account if it doesn't exist
    const { userStats } = this.getDriftUserPdas();
    const userStatsInfo =
      await this.base.provider.connection.getAccountInfo(userStats);
    if (!userStatsInfo) {
      tx.add(await this.initializeUserStatsIx(glamSigner));
    }

    // Initialize user (aka sub-account)
    tx.add(await this.initializeUserIx(glamSigner, subAccountId));

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserCustomMarginRatioIx(
    maxLeverage: number, // 1=1x, 2=2x ... 50=50x leverage
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(subAccountId);

    // https://github.com/drift-labs/protocol-v2/blob/babed162b08b1fe34e49a81c5aa3e4ec0a88ecdf/programs/drift/src/math/constants.rs#L183-L184
    // 0 means No Limit
    const marginRatio =
      maxLeverage === 0 ? 0 : DRIFT_MARGIN_PRECISION / maxLeverage;

    return await this.base.program.methods
      .driftUpdateUserCustomMarginRatio(subAccountId, marginRatio)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        user,
      })
      .instruction();
  }

  public async updateUserCustomMarginRatioTx(
    maxLeverage: number, // 1=1x, 2=2x ... 50=50x leverage
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const tx = new Transaction().add(
      await this.updateUserCustomMarginRatioIx(
        maxLeverage,
        subAccountId,
        txOptions,
      ),
    );
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserMarginTradingEnabledIx(
    marginTradingEnabled: boolean,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(subAccountId);

    return await this.base.program.methods
      .driftUpdateUserMarginTradingEnabled(subAccountId, marginTradingEnabled)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        user,
      })
      .instruction();
  }

  public async updateUserMarginTradingEnabledTx(
    marginTradingEnabled: boolean,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const tx = new Transaction().add(
      ...(txOptions.preInstructions || []),
      await this.updateUserMarginTradingEnabledIx(
        marginTradingEnabled,
        subAccountId,
        txOptions,
      ),
    );

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserDelegateIx(
    delegate: PublicKey | string,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(subAccountId);

    return await this.base.program.methods
      .driftUpdateUserDelegate(subAccountId, new PublicKey(delegate))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        user,
      })
      .instruction();
  }

  public async updateUserDelegateTx(
    delegate: PublicKey,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const tx = new Transaction().add(
      await this.updateUserDelegateIx(delegate, subAccountId, txOptions),
    );

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async deleteUserTx(
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user, userStats } = this.getDriftUserPdas(subAccountId);

    const tx = await this.base.program.methods
      .driftDeleteUser()
      .accounts({
        glamState: this.base.statePda,
        state: this.driftStatePda,
        user,
        userStats,
        glamSigner,
      })
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async depositTx(
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user, userStats } = this.getDriftUserPdas(subAccountId);

    const {
      mint,
      oracle,
      tokenProgram,
      marketPda,
      vault: driftVault,
      name,
    } = await this.fetchAndParseSpotMarket(marketIndex);
    console.log(
      `Spot market ${marketIndex} mint ${mint}, oracle: ${oracle}, marketPda: ${marketPda}, vault: ${driftVault}`,
    );

    const preInstructions = [];
    const postInstructions = [];

    // If drift user doesn't exist, prepend initialization ixs
    if (!(await this.fetchDriftUser(subAccountId))) {
      preInstructions.push(
        await this.initializeUserIx(glamSigner, subAccountId),
      );
      // Only add ix to initialize user stats if subAccountId is 0
      if (subAccountId === 0) {
        preInstructions.push(await this.initializeUserStatsIx(glamSigner));
      }
      // If market name ends with "-N", it means we're depositing to an isolated pool
      const isolatedPoolMatch = name.match(/-(\d+)$/);
      if (isolatedPoolMatch) {
        const poolId = parseInt(isolatedPoolMatch[1]);
        preInstructions.push(
          await this.updateUserPoolIdIx(subAccountId, poolId),
        );
      }
    }

    if (mint.equals(WSOL)) {
      const wrapSolIxs = await this.base.maybeWrapSol(amount, glamSigner);
      preInstructions.push(...wrapSolIxs);

      // If we need to wrap SOL, it means the wSOL balance will be drained,
      // and we close the wSOL token account for convenience
      const tokenAccount = this.base.getVaultAta(WSOL);
      const closeTokenAccountIx = await this.base.program.methods
        .tokenCloseAccount()
        .accounts({
          glamState: this.base.statePda,
          glamSigner,
          tokenAccount,
          cpiProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();
      postInstructions.push(closeTokenAccountIx);
    }

    const remainingAccounts = [
      { pubkey: new PublicKey(oracle), isSigner: false, isWritable: false },
      { pubkey: new PublicKey(marketPda), isSigner: false, isWritable: true },
    ];
    if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      remainingAccounts.push({
        pubkey: mint,
        isSigner: false,
        isWritable: false,
      });
    }

    const tx = await this.base.program.methods
      .driftDeposit(marketIndex, amount, false)
      .accounts({
        glamState: this.base.statePda,
        state: this.driftStatePda,
        user,
        userStats,
        spotMarketVault: driftVault,
        userTokenAccount: this.base.getVaultAta(mint, tokenProgram),
        glamSigner,
        tokenProgram,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async withdrawTx(
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const { user, userStats } = this.getDriftUserPdas(subAccountId);
    const {
      mint,
      tokenProgram,
      vault: driftVault,
    } = await this.fetchAndParseSpotMarket(marketIndex);

    const glamVault = this.base.vaultPda;
    const glamVaultAta = this.base.getVaultAta(mint, tokenProgram);

    const remainingAccounts = await this.composeRemainingAccounts(
      subAccountId,
      MarketType.SPOT,
      marketIndex,
    );

    if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
      remainingAccounts.push({
        pubkey: mint,
        isSigner: false,
        isWritable: false,
      });
    }

    // Create vault ata in case it doesn't exist
    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        glamVaultAta,
        glamVault,
        mint,
        tokenProgram,
      ),
    ];

    const tx = await this.base.program.methods
      .driftWithdraw(marketIndex, amount, false)
      .accounts({
        glamState: this.base.statePda,
        state: this.driftStatePda,
        user,
        userStats,
        glamSigner,
        spotMarketVault: driftVault,
        userTokenAccount: glamVaultAta,
        driftSigner: DRIFT_SIGNER,
        tokenProgram,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions(preInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async placeOrderTx(
    orderParams: OrderParams,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const { marketIndex, marketType } = orderParams;

    const { user: referrer, userStats: referrerStats } =
      this.getGlamReferrerPdas();

    const remainingAccounts = (
      await this.composeRemainingAccounts(subAccountId, marketType, marketIndex)
    ).concat([
      { pubkey: referrer, isWritable: true, isSigner: false },
      { pubkey: referrerStats, isWritable: true, isSigner: false },
    ]);

    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(subAccountId);

    // @ts-ignore
    const tx = await this.base.program.methods
      .driftPlaceOrders([orderParams])
      .accounts({
        glamState: this.base.statePda,
        user,
        state: this.driftStatePda,
        glamSigner,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async modifyOrderTx(
    modifyOrderParams: ModifyOrderParams,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    // const { marketIndex, marketType } = orderParams;
    // const remainingAccounts = await this.composeRemainingAccounts(
    //   statePda,
    //   subAccountId,
    //   marketConfigs,
    //   marketType,
    //   marketIndex,
    // );

    const signer = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(subAccountId);

    const tx = await this.base.program.methods
      // @ts-ignore
      .driftModifyOrder(1, modifyOrderParams)
      .accounts({
        glamState: this.base.statePda,
        glamSigner: signer,
        user,
        state: this.driftStatePda,
      })
      // .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async cancelOrdersTx(
    marketType: MarketType,
    marketIndex: number,
    direction: PositionDirection,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(subAccountId);

    const remainingAccounts = await this.composeRemainingAccounts(
      subAccountId,
      marketType,
      marketIndex,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .driftCancelOrders(marketType, marketIndex, direction)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        user,
        state: this.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async cancelOrdersByIdsTx(
    orderIds: number[],
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(subAccountId);

    const remainingAccounts = await this.composeRemainingAccounts(subAccountId);

    // @ts-ignore
    const tx = await this.base.program.methods
      .driftCancelOrdersByIds(orderIds)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        user,
        state: this.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async settlePnlTx(
    marketIndex: number,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(subAccountId);

    const { vault: driftVault } = await this.fetchAndParseSpotMarket(0);
    const remainingAccounts = await this.composeRemainingAccounts(
      subAccountId,
      MarketType.PERP,
      marketIndex,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .driftSettlePnl(marketIndex)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        user,
        state: this.driftStatePda,
        spotMarketVault: driftVault,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}

export class DriftVaultsClient {
  public constructor(
    readonly base: BaseClient,
    readonly drift: DriftClient,
  ) {}

  async fetchUserPositions(user: PublicKey): Promise<{
    perpPositions: PerpPosition[];
    spotPositions: SpotPosition[];
  }> {
    const accountInfo =
      await this.base.provider.connection.getAccountInfo(user);
    if (!accountInfo) {
      throw new Error(`Drift user ${user} account not found for vault.`);
    }
    const { spotPositions, perpPositions } = decodeUser(accountInfo.data);
    return { perpPositions, spotPositions };
  }

  getDepositorPda(driftVault: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault_depositor"),
        driftVault.toBuffer(),
        this.base.vaultPda.toBuffer(),
      ],
      DRIFT_VAULTS_PROGRAM_ID,
    )[0];
  }

  async parseDriftVault(driftVault: PublicKey) {
    const connection = this.base.provider.connection;
    const accountInfo = await connection.getAccountInfo(driftVault);

    if (!accountInfo) {
      throw new Error(
        `Drift vault account not found: ${driftVault.toBase58()}`,
      );
    }

    try {
      return DriftVaultLayout.decode(accountInfo.data) as DriftVault;
    } catch (error) {
      throw new Error(`Failed to parse drift vault account: ${error}`);
    }
  }

  async composeRemainingAccounts(user: PublicKey): Promise<AccountMeta[]> {
    const { spotPositions, perpPositions } =
      await this.fetchUserPositions(user);
    const spotMarketIndexes = spotPositions.map((p) => p.marketIndex);
    const perpMarketIndexes = perpPositions.map((p) => p.marketIndex);

    // If there are perp positions, add spot market 0 as it's used as quote market for perp
    if (perpMarketIndexes.length > 0 && !spotMarketIndexes.includes(0)) {
      spotMarketIndexes.push(0);
    }

    const spotMarkets =
      await this.drift.fetchAndParseSpotMarkets(spotMarketIndexes);
    const perpMarkets =
      await this.drift.fetchAndParsePerpMarkets(perpMarketIndexes);

    const oracles = spotMarkets
      .map((m) => m.oracle)
      .concat(perpMarkets.map((m) => m.oracle));
    const markets = spotMarkets
      .map((m) => m.marketPda)
      .concat(perpMarkets.map((m) => m.marketPda));

    return oracles
      .map((o) => ({
        pubkey: new PublicKey(o),
        isWritable: false,
        isSigner: false,
      }))
      .concat(
        markets.map((m) => ({
          pubkey: new PublicKey(m),
          isWritable: true,
          isSigner: false,
        })),
      );
  }

  parseDepositor(depositor: PublicKey, data: Buffer) {
    const driftVault = new PublicKey(data.subarray(8, 40));
    const shares = new BN(data.subarray(104, 112), "le");
    return { address: depositor, driftVault, shares };
  }

  /**
   * Finds all drift vault depositors
   */
  public async findAndParseVaultDepositors(authority?: PublicKey) {
    const accounts = await this.base.provider.connection.getProgramAccounts(
      DRIFT_VAULTS_PROGRAM_ID,
      {
        filters: [
          { dataSize: DRIFT_VAULT_DEPOSITOR_SIZE },
          {
            memcmp: {
              offset: 72,
              bytes: (authority || this.base.vaultPda).toBase58(),
            },
          },
        ],
      },
    );
    return accounts.map((a) => this.parseDepositor(a.pubkey, a.account.data));
  }

  public async initializeVaultDepositor(
    driftVault: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vaultDepositor = this.getDepositorPda(driftVault);

    const tx = await this.base.program.methods
      .driftVaultsInitializeVaultDepositor()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vault: driftVault,
        vaultDepositor,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async deposit(
    driftVault: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vaultDepositor = this.getDepositorPda(driftVault);

    const {
      user: driftUser,
      tokenAccount: vaultTokenAccount,
      userStats: driftUserStats,
      spotMarketIndex,
      vaultProtocol, // if true the last remaining account should be the vaultProtocol account (for protocol fee)
    } = await this.parseDriftVault(driftVault);

    if (vaultProtocol) {
      throw new Error("Vault protocol fees not supported");
    }

    const {
      vault: driftSpotMarketVault,
      mint,
      tokenProgram,
    } = await this.drift.fetchAndParseSpotMarket(spotMarketIndex);
    const remainingAccounts = await this.composeRemainingAccounts(driftUser);

    // GLAM vault's token account for deposit, we assume it exists
    const userTokenAccount = this.base.getVaultAta(mint, tokenProgram);

    const tx = await this.base.program.methods
      .driftVaultsDeposit(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vault: driftVault,
        vaultDepositor,
        vaultTokenAccount,
        driftUserStats,
        driftUser,
        driftState: this.drift.driftStatePda,
        driftSpotMarketVault,
        userTokenAccount,
        tokenProgram,
        driftProgram: DRIFT_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async requestWithdraw(
    driftVault: PublicKey,
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vaultDepositor = this.getDepositorPda(driftVault);

    const { user: driftUser, userStats: driftUserStats } =
      await this.parseDriftVault(driftVault);

    const remainingAccounts = await this.composeRemainingAccounts(driftUser);

    const tx = await this.base.program.methods
      .driftVaultsRequestWithdraw(amount, { shares: {} })
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vault: driftVault,
        vaultDepositor,
        driftUserStats,
        driftUser,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async cancelWithdrawRequest(
    driftVault: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vaultDepositor = this.getDepositorPda(driftVault);

    const { user: driftUser, userStats: driftUserStats } =
      await this.parseDriftVault(driftVault);

    const remainingAccounts = await this.composeRemainingAccounts(driftUser);

    const tx = await this.base.program.methods
      .driftVaultsCancelRequestWithdraw()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vault: driftVault,
        vaultDepositor,
        driftUserStats,
        driftUser,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async withdraw(
    driftVault: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vaultDepositor = this.getDepositorPda(driftVault);

    const {
      user: driftUser,
      userStats: driftUserStats,
      tokenAccount: vaultTokenAccount,
      spotMarketIndex,
    } = await this.parseDriftVault(driftVault);
    const {
      vault: driftSpotMarketVault,
      mint,
      tokenProgram,
    } = await this.drift.fetchAndParseSpotMarket(spotMarketIndex);
    const userTokenAccount = this.base.getVaultAta(mint, tokenProgram);

    const remainingAccounts = await this.composeRemainingAccounts(driftUser);

    const tx = await this.base.program.methods
      .driftVaultsWithdraw()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vault: driftVault,
        vaultDepositor,
        vaultTokenAccount,
        driftUserStats,
        driftUser,
        driftSpotMarketVault,
        driftSigner: DRIFT_SIGNER,
        userTokenAccount,
        driftState: this.drift.driftStatePda,
        driftProgram: DRIFT_PROGRAM_ID,
        tokenProgram,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }
}
