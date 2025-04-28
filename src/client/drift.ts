import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  TransactionInstruction,
  Transaction,
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
import { decodeUser } from "../utils/driftUser";

import { BaseClient, TxOptions } from "./base";
import { AccountMeta } from "@solana/web3.js";
import { DRIFT_PROGRAM_ID, GLAM_REFERRER, WSOL } from "../constants";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { StateModel } from "../models";
import { BN } from "@coral-xyz/anchor";

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
    statePda: PublicKey | string,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.initializeTx(
      new PublicKey(statePda),
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async updateUserCustomMarginRatio(
    statePda: PublicKey,
    maxLeverage: number, // 1=1x, 2=2x ... 50=50x leverage
    subAccountId: number = 0,
  ): Promise<TransactionSignature> {
    const tx = await this.updateUserCustomMarginRatioTx(
      statePda,
      maxLeverage,
      subAccountId,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async updateUserMarginTradingEnabled(
    statePda: PublicKey,
    marginTradingEnabled: boolean,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.updateUserMarginTradingEnabledTx(
      statePda,
      marginTradingEnabled,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async updateUserDelegate(
    statePda: PublicKey | string,
    delegate: PublicKey | string,
    subAccountId: number = 0,
  ): Promise<TransactionSignature> {
    const tx = await this.updateUserDelegateTx(
      new PublicKey(statePda),
      new PublicKey(delegate),
      subAccountId,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async deleteUser(
    statePda: PublicKey | string,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.deleteUserTx(
      new PublicKey(statePda),
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async deposit(
    statePda: PublicKey | string,
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(
      new PublicKey(statePda),
      amount,
      marketIndex,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async withdraw(
    statePda: PublicKey | string,
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawTx(
      new PublicKey(statePda),
      amount,
      marketIndex,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async placeOrder(
    statePda: PublicKey | string,
    orderParams: OrderParams,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.placeOrderTx(
      new PublicKey(statePda),
      orderParams,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async modifyOrder(
    statePda: PublicKey | string,
    modifyOrderParams: ModifyOrderParams,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.modifyOrderTx(
      new PublicKey(statePda),
      modifyOrderParams,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async cancelOrders(
    statePda: PublicKey | string,
    marketType: MarketType,
    marketIndex: number,
    direction: PositionDirection,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.cancelOrdersTx(
      new PublicKey(statePda),
      marketType,
      marketIndex,
      direction,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async cancelOrdersByIds(
    statePda: PublicKey | string,
    orderIds: number[],
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.cancelOrdersByIdsTx(
      new PublicKey(statePda),
      orderIds,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async settlePnl(
    statePda: PublicKey | string,
    marketIndex: number,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.settlePnlTx(
      new PublicKey(statePda),
      marketIndex,
      subAccountId,
      txOptions,
    );
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

  public getDriftUserPdas(
    statePda: PublicKey | string,
    subAccountId: number = 0,
  ): { user: PublicKey; userStats: PublicKey } {
    const vault = this.base.getVaultPda(new PublicKey(statePda));
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
  ): Promise<SpotMarket> {
    const markets = await this.fetchAndParseSpotMarkets([marketIndex]);
    if (!markets || markets.length === 0) {
      throw new Error(`Spot market not found at index ${marketIndex}`);
    }
    return markets[0];
  }

  public async fetchAndParseSpotMarkets(
    marketIndexes: number[],
  ): Promise<SpotMarket[]> {
    const indexesToFetch = marketIndexes.filter(
      (marketIndex) => !this.spotMarkets.has(marketIndex),
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

    // At this point this.spotMarkets has all the requested markets
    return marketIndexes
      .map((marketIndex) => this.spotMarkets.get(marketIndex)!)
      .filter((m) => m);
  }

  public async fetchAndParsePerpMarket(
    marketIndex: number,
  ): Promise<PerpMarket> {
    const markets = await this.fetchAndParsePerpMarkets([marketIndex]);
    if (!markets || markets.length === 0) {
      throw new Error(`Perp market not found at index ${marketIndex}`);
    }
    return markets[0];
  }

  public async fetchAndParsePerpMarkets(
    marketIndexes: number[],
  ): Promise<PerpMarket[]> {
    const indexesToFetch = marketIndexes.filter(
      (marketIndex) => !this.perpMarkets.has(marketIndex),
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

    return marketIndexes
      .map((marketIndex) => this.perpMarkets.get(marketIndex)!)
      .filter((m) => m);
  }

  public async fetchMarketConfigs(): Promise<DriftMarketConfigs> {
    // const response = await fetch(
    //   "https://api.glam.systems/v0/drift/market_configs/",
    // );
    // if (!response.ok) {
    //   throw new Error(`Failed to fetch market configs: ${response.status}`);
    // }
    // const data = await response.json();
    // const { orderConstants, perp, spot } = data;

    // // Transform perp market from API to `PerpMarket` type
    // const perpMarkets = perp.map((m: any) => ({
    //   marketIndex: m.marketIndex,
    //   marketPda: m.marketPDA,
    //   oracle: new PublicKey(m.oracle),
    // }));
    // // Transform spot market from API to `SpotMarket` type
    // const spotMarkets = spot.map((m: any) => ({
    //   marketIndex: m.marketIndex,
    //   marketPda: m.marketPDA,
    //   oracle: new PublicKey(m.oracle),
    //   mint: new PublicKey(m.mint),
    //   vault: new PublicKey(m.vaultPDA),
    //   decimals: m.decimals,
    // }));
    if (!this.marketConfigs) {
      const perpMarkets = await this.fetchAndParsePerpMarkets(
        Array.from(Array(100).keys()),
      );
      const spotMarkets = await this.fetchAndParseSpotMarkets(
        Array.from(Array(100).keys()),
      );

      this.marketConfigs = {
        orderConstants: { perpBaseScale: 9, quoteScale: 6 },
        perpMarkets,
        spotMarkets,
      };
    }
    return this.marketConfigs;
  }

  // public async fetchGlamDriftUser(
  //   glamState: PublicKey | string,
  //   subAccountId: number = 0,
  // ): Promise<GlamDriftUser> {
  //   const vault = this.base.getVaultPda(new PublicKey(glamState));
  //   const response = await fetch(
  //     `https://api.glam.systems/v0/drift/user?authority=${vault.toBase58()}&accountId=${subAccountId}`,
  //   );

  //   const data = await response.json();
  //   if (!data) {
  //     throw new Error("Failed to fetch drift user.");
  //   }
  //   return data as GlamDriftUser;
  // }

  charsToName(chars: number[] | Buffer): string {
    return String.fromCharCode(...chars)
      .replace(/\0/g, "")
      .trim();
  }

  public async fetchDriftUser(
    statePda: PublicKey | string,
    subAccountId: number = 0,
  ): Promise<DriftUser | null> {
    const { user } = this.getDriftUserPdas(
      new PublicKey(statePda),
      subAccountId,
    );
    const accountInfo =
      await this.base.provider.connection.getAccountInfo(user);
    if (!accountInfo) {
      return null;
    }
    const {
      delegate,
      name,
      spotPositions,
      marginMode,
      perpPositions,
      isMarginTradingEnabled,
      maxMarginRatio,
      orders,
    } = decodeUser(accountInfo.data);

    // Prefetch market configs
    const marketConfigs = await this.fetchMarketConfigs();

    const spotPositionsExt = await Promise.all(
      spotPositions.map(async (p) => {
        const { amount, uiAmount } = await this.calcSpotBalance(
          p.marketIndex,
          p.scaledBalance,
          p.balanceType,
        );
        const spotMarket = marketConfigs.spotMarkets.find(
          (m) => m.marketIndex === p.marketIndex,
        );
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
    };
  }

  // async getPositions(statePda: PublicKey | string, subAccountId: number = 0) {
  //   const driftUser = await this.fetchDriftUser(
  //     new PublicKey(statePda),
  //     subAccountId,
  //   );
  //   if (!driftUser) {
  //     return { spotPositions: [], perpPositions: [] };
  //   }

  //   const marketConfigs = await this.fetchMarketConfigs();

  //   const { spotPositions, perpPositions } = driftUser;
  //   return { spotPositions, perpPositions };
  // }

  async fetchPolicyConfig(glamState: StateModel) {
    const driftUserAccount =
      glamState && glamState.id && (await this.fetchDriftUser(glamState.id));

    let delegate = driftUserAccount?.delegate;
    if (delegate && delegate.equals(PublicKey.default)) {
      delegate = undefined;
    }
    return {
      driftAccessControl: delegate ? 0 : 1,
      driftDelegatedAccount: delegate || null,
      driftMarketIndexesPerp: glamState?.driftMarketIndexesPerp || [],
      driftOrderTypes: glamState?.driftOrderTypes || [],
      driftMaxLeverage: driftUserAccount?.maxMarginRatio
        ? DRIFT_MARGIN_PRECISION / driftUserAccount?.maxMarginRatio
        : null,
      driftEnableSpot: driftUserAccount?.isMarginTradingEnabled || false,
      driftMarketIndexesSpot: glamState?.driftMarketIndexesSpot || [],
    };
  }

  marketTypeEquals = (a: MarketType | undefined, b: MarketType) =>
    a && Object.keys(a)[0] === Object.keys(b)[0];

  async composeRemainingAccounts(
    glamState: PublicKey,
    subAccountId: number,
    marketType?: MarketType,
    marketIndex?: number,
  ): Promise<AccountMeta[]> {
    const driftUser = await this.fetchDriftUser(glamState, subAccountId);
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

  async initializeUserStatsIx(
    glamState: PublicKey,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { userStats } = this.getDriftUserPdas(glamState);

    // @ts-ignore
    return await this.base.program.methods
      .driftInitializeUserStats()
      .accounts({
        glamState,
        glamSigner,
        state: this.driftStatePda,
        userStats,
      })
      .instruction();
  }

  async initializeUserIx(
    glamState: PublicKey,
    glamSigner: PublicKey,
    subAccountId: number,
  ): Promise<TransactionInstruction> {
    const name = `GLAM *.+ ${subAccountId}`
      .split("")
      .map((char) => char.charCodeAt(0))
      .concat(Array(24).fill(0));

    const { user, userStats } = this.getDriftUserPdas(glamState, subAccountId);

    const { user: referrer, userStats: referrerStats } =
      this.getGlamReferrerPdas();
    const remainingAccounts = [
      { pubkey: referrer, isWritable: true, isSigner: false },
      { pubkey: referrerStats, isWritable: true, isSigner: false },
    ];

    return await this.base.program.methods
      .driftInitializeUser(subAccountId, name)
      .accounts({
        glamState,
        user,
        userStats,
        state: this.driftStatePda,
        glamSigner,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  public async initializeTx(
    glamState: PublicKey,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = new Transaction();

    // Create userStats account if it doesn't exist
    const { userStats } = this.getDriftUserPdas(glamState);
    const userStatsInfo =
      await this.base.provider.connection.getAccountInfo(userStats);
    if (!userStatsInfo) {
      tx.add(await this.initializeUserStatsIx(glamState, glamSigner));
    }

    // Initialize user (aka sub-account)
    tx.add(await this.initializeUserIx(glamState, glamSigner, subAccountId));

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserCustomMarginRatioIx(
    glamState: PublicKey,
    maxLeverage: number, // 1=1x, 2=2x ... 50=50x leverage
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(glamState, subAccountId);

    // https://github.com/drift-labs/protocol-v2/blob/babed162b08b1fe34e49a81c5aa3e4ec0a88ecdf/programs/drift/src/math/constants.rs#L183-L184
    const marginRatio = DRIFT_MARGIN_PRECISION / maxLeverage;

    return await this.base.program.methods
      .driftUpdateUserCustomMarginRatio(subAccountId, marginRatio)
      .accounts({
        glamState,
        glamSigner,
        user,
      })
      .instruction();
  }

  public async updateUserCustomMarginRatioTx(
    glamState: PublicKey,
    maxLeverage: number, // 1=1x, 2=2x ... 50=50x leverage
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const tx = new Transaction().add(
      await this.updateUserCustomMarginRatioIx(
        glamState,
        maxLeverage,
        subAccountId,
        txOptions,
      ),
    );
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserMarginTradingEnabledIx(
    glamState: PublicKey,
    marginTradingEnabled: boolean,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(glamState, subAccountId);

    return await this.base.program.methods
      .driftUpdateUserMarginTradingEnabled(subAccountId, marginTradingEnabled)
      .accounts({
        glamState,
        glamSigner,
        user,
      })
      .instruction();
  }

  public async updateUserMarginTradingEnabledTx(
    glamState: PublicKey,
    marginTradingEnabled: boolean,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const tx = new Transaction().add(
      ...(txOptions.preInstructions || []),
      await this.updateUserMarginTradingEnabledIx(
        glamState,
        marginTradingEnabled,
        subAccountId,
        txOptions,
      ),
    );

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserDelegateIx(
    glamState: PublicKey,
    delegate: PublicKey | string,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(glamState, subAccountId);

    return await this.base.program.methods
      .driftUpdateUserDelegate(subAccountId, new PublicKey(delegate))
      .accounts({
        glamState,
        glamSigner,
        user,
      })
      .instruction();
  }

  public async updateUserDelegateTx(
    glamState: PublicKey,
    delegate: PublicKey,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const tx = new Transaction().add(
      await this.updateUserDelegateIx(
        glamState,
        delegate,
        subAccountId,
        txOptions,
      ),
    );

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async deleteUserTx(
    glamState: PublicKey,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user, userStats } = this.getDriftUserPdas(glamState, subAccountId);

    const tx = await this.base.program.methods
      .driftDeleteUser()
      .accounts({
        glamState,
        state: this.driftStatePda,
        user,
        userStats,
        glamSigner,
      })
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async depositTx(
    glamState: PublicKey,
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user, userStats } = this.getDriftUserPdas(glamState, subAccountId);

    const {
      mint,
      oracle,
      tokenProgram,
      marketPda,
      vault: driftVault,
    } = await this.fetchAndParseSpotMarket(marketIndex);
    console.log(
      `Spot market ${marketIndex} mint ${mint}, oracle: ${oracle}, marketPda: ${marketPda}, vault: ${driftVault}`,
    );

    const preInstructions = [];
    const postInstructions = [];

    // If drift user doesn't exist, prepend initializeUserStats and initializeUser instructions
    if (!(await this.fetchDriftUser(glamState, subAccountId))) {
      preInstructions.push(
        await this.initializeUserStatsIx(glamState, glamSigner),
        await this.initializeUserIx(glamState, glamSigner, subAccountId),
      );
    }

    if (mint.equals(WSOL)) {
      const wrapSolIxs = await this.base.maybeWrapSol(
        glamState,
        amount,
        glamSigner,
      );
      preInstructions.push(...wrapSolIxs);

      // If we need to wrap SOL, it means the wSOL balance will be drained,
      // and we close the wSOL token account for convenience
      const tokenAccount = this.base.getVaultAta(glamState, WSOL);
      const closeTokenAccountIx = await this.base.program.methods
        .tokenCloseAccount()
        .accounts({
          glamState,
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
        glamState,
        state: this.driftStatePda,
        user,
        userStats,
        spotMarketVault: driftVault,
        userTokenAccount: this.base.getVaultAta(glamState, mint, tokenProgram),
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
    statePda: PublicKey,
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const { user, userStats } = this.getDriftUserPdas(statePda, subAccountId);
    const {
      mint,
      tokenProgram,
      vault: driftVault,
    } = await this.fetchAndParseSpotMarket(marketIndex);

    const glamVault = this.base.getVaultPda(statePda);
    const glamVaultAta = this.base.getVaultAta(statePda, mint, tokenProgram);

    const remainingAccounts = await this.composeRemainingAccounts(
      statePda,
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
        glamState: statePda,
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
    glamState: PublicKey,
    orderParams: OrderParams,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const { marketIndex, marketType } = orderParams;

    const { user: referrer, userStats: referrerStats } =
      this.getGlamReferrerPdas();

    const remainingAccounts = (
      await this.composeRemainingAccounts(
        glamState,
        subAccountId,
        marketType,
        marketIndex,
      )
    ).concat([
      { pubkey: referrer, isWritable: true, isSigner: false },
      { pubkey: referrerStats, isWritable: true, isSigner: false },
    ]);

    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(glamState, subAccountId);

    // @ts-ignore
    const tx = await this.base.program.methods
      .driftPlaceOrders([orderParams])
      .accounts({
        glamState,
        user,
        state: this.driftStatePda,
        glamSigner,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async modifyOrderTx(
    statePda: PublicKey,
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
    const { user } = this.getDriftUserPdas(statePda, subAccountId);

    const tx = await this.base.program.methods
      // @ts-ignore
      .driftModifyOrder(1, modifyOrderParams)
      .accounts({
        glamState: statePda,
        glamSigner: signer,
        user,
        state: this.driftStatePda,
      })
      // .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async cancelOrdersTx(
    glamState: PublicKey,
    marketType: MarketType,
    marketIndex: number,
    direction: PositionDirection,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(glamState, subAccountId);

    const remainingAccounts = await this.composeRemainingAccounts(
      glamState,
      subAccountId,
      marketType,
      marketIndex,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .driftCancelOrders(marketType, marketIndex, direction)
      .accounts({
        glamState,
        glamSigner,
        user,
        state: this.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async cancelOrdersByIdsTx(
    glamState: PublicKey,
    orderIds: number[],
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(glamState, subAccountId);

    const remainingAccounts = await this.composeRemainingAccounts(
      glamState,
      subAccountId,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .driftCancelOrdersByIds(orderIds)
      .accounts({
        glamState,
        glamSigner,
        user,
        state: this.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async settlePnlTx(
    glamState: PublicKey,
    marketIndex: number,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { user } = this.getDriftUserPdas(glamState, subAccountId);

    const { vault: driftVault } = await this.fetchAndParseSpotMarket(0);
    const remainingAccounts = await this.composeRemainingAccounts(
      glamState,
      subAccountId,
      MarketType.PERP,
      marketIndex,
    );

    // @ts-ignore
    const tx = await this.base.program.methods
      .driftSettlePnl(marketIndex)
      .accounts({
        glamState,
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
