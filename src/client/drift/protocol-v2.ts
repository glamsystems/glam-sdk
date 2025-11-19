import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  TransactionInstruction,
  AccountInfo,
  AccountMeta,
} from "@solana/web3.js";
import {
  MarketType,
  OrderParams,
  PositionDirection,
  ModifyOrderParams,
  OracleSource,
  SpotBalanceType,
} from "../../utils/drift/types";
import { DriftPerpMarket, DriftSpotMarket } from "../../deser/driftLayouts";
import { decodeUser } from "../../utils/drift/user";

import { BaseClient, BaseTxBuilder, TxOptions } from "../base";
import { DRIFT_PROGRAM_ID, GLAM_REFERRER, WSOL } from "../../constants";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
import { charsToName } from "../../utils/common";
import { VaultClient } from "../vault";
import {
  DRIFT_SIGNER,
  DRIFT_MARGIN_PRECISION,
  SpotMarket,
  PerpMarket,
  DriftMarketConfigs,
  DriftUser,
} from "./types";

class TxBuilder extends BaseTxBuilder<DriftProtocolClient> {
  async initializeUserStatsIx(
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { userStats } = this.client.getDriftUserPdas();

    return await this.client.base.extDriftProgram.methods
      .initializeUserStats()
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        state: this.client.driftStatePda,
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

    const { user, userStats } = this.client.getDriftUserPdas(subAccountId);

    const { user: referrer, userStats: referrerStats } =
      this.client.getGlamReferrerPdas();
    const remainingAccounts = [
      { pubkey: referrer, isWritable: true, isSigner: false },
      { pubkey: referrerStats, isWritable: true, isSigner: false },
    ];

    return await this.client.base.extDriftProgram.methods
      .initializeUser(subAccountId, name)
      .accounts({
        glamState: this.client.base.statePda,
        user,
        userStats,
        state: this.client.driftStatePda,
        glamSigner,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  async updateUserPoolIdIx(
    subAccountId: number,
    poolId: number,
  ): Promise<TransactionInstruction> {
    const { user } = this.client.getDriftUserPdas(subAccountId);

    return await this.client.base.extDriftProgram.methods
      .updateUserPoolId(subAccountId, poolId)
      .accounts({
        glamState: this.client.base.statePda,
        user,
      })
      .instruction();
  }

  public async initializeIxs(
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const ixs = [];

    const { userStats } = this.client.getDriftUserPdas();
    const userStatsInfo =
      await this.client.base.provider.connection.getAccountInfo(userStats);
    if (!userStatsInfo) {
      ixs.push(await this.initializeUserStatsIx(glamSigner));
    }

    ixs.push(await this.initializeUserIx(glamSigner, subAccountId));

    return ixs;
  }

  public async initializeTx(
    subAccountId: number,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ixs = await this.initializeIxs(subAccountId, glamSigner);

    const tx = this.build(ixs, txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async depositIxs(
    amount: anchor.BN,
    marketIndex: number,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const { user, userStats } = this.client.getDriftUserPdas(subAccountId);

    const {
      mint,
      oracle,
      tokenProgram,
      marketPda,
      vault: driftVault,
      name,
    } = await this.client.fetchAndParseSpotMarket(marketIndex);
    console.log(
      `Spot market ${marketIndex} mint ${mint}, oracle: ${oracle}, marketPda: ${marketPda}, vault: ${driftVault}`,
    );

    const preInstructions = [];
    const postInstructions = [];

    if (!(await this.client.fetchDriftUser(subAccountId))) {
      if (subAccountId === 0) {
        preInstructions.push(await this.initializeUserStatsIx(glamSigner));
      }

      preInstructions.push(
        await this.initializeUserIx(glamSigner, subAccountId),
      );

      const isolatedPoolMatch = name.match(/-(\d+)$/);
      if (isolatedPoolMatch) {
        const poolId = parseInt(isolatedPoolMatch[1]);
        preInstructions.push(
          await this.updateUserPoolIdIx(subAccountId, poolId),
        );
      }
    }

    if (mint.equals(WSOL)) {
      const wrapSolIxs = await this.client.vault.maybeWrapSol(
        amount,
        glamSigner,
      );
      preInstructions.push(...wrapSolIxs);

      const tokenAccount = this.client.base.getVaultAta(WSOL);
      const closeTokenAccountIx = await this.client.base.extSplProgram.methods
        .tokenCloseAccount()
        .accounts({
          glamState: this.client.base.statePda,
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

    const ix = await this.client.base.extDriftProgram.methods
      .deposit(marketIndex, amount, false)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        state: this.client.driftStatePda,
        user,
        userStats,
        spotMarketVault: driftVault,
        userTokenAccount: this.client.base.getVaultAta(mint, tokenProgram),
        tokenProgram,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return [...preInstructions, ix, ...postInstructions];
  }

  public async depositTx(
    amount: anchor.BN,
    marketIndex: number,
    subAccountId: number,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ixs = await this.depositIxs(
      amount,
      marketIndex,
      subAccountId,
      glamSigner,
    );
    const tx = this.build(ixs, txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async withdrawIxs(
    amount: anchor.BN,
    marketIndex: number,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const { user, userStats } = this.client.getDriftUserPdas(subAccountId);
    const {
      mint,
      tokenProgram,
      vault: driftVault,
    } = await this.client.fetchAndParseSpotMarket(marketIndex);

    const glamVault = this.client.base.vaultPda;
    const glamVaultAta = this.client.base.getVaultAta(mint, tokenProgram);

    const remainingAccounts = await this.client.composeRemainingAccounts(
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

    const preIx = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      glamVaultAta,
      glamVault,
      mint,
      tokenProgram,
    );
    const ix = await this.client.base.extDriftProgram.methods
      .withdraw(marketIndex, amount, false)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        state: this.client.driftStatePda,
        user,
        userStats,
        spotMarketVault: driftVault,
        userTokenAccount: glamVaultAta,
        driftSigner: DRIFT_SIGNER,
        tokenProgram,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();

    return [preIx, ix];
  }

  public async withdrawTx(
    amount: anchor.BN,
    marketIndex: number,
    subAccountId: number,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ixs = await this.withdrawIxs(
      amount,
      marketIndex,
      subAccountId,
      glamSigner,
    );

    const tx = this.build(ixs, txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserCustomMarginRatioIx(
    maxLeverage: number,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { user } = this.client.getDriftUserPdas(subAccountId);

    const marginRatio =
      maxLeverage === 0 ? 0 : DRIFT_MARGIN_PRECISION / maxLeverage;

    return await this.client.base.extDriftProgram.methods
      .updateUserCustomMarginRatio(subAccountId, marginRatio)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        user,
      })
      .instruction();
  }

  public async updateUserCustomMarginRatioTx(
    maxLeverage: number,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.updateUserCustomMarginRatioIx(
      maxLeverage,
      subAccountId,
      glamSigner,
    );
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserMarginTradingEnabledIx(
    marginTradingEnabled: boolean,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { user } = this.client.getDriftUserPdas(subAccountId);
    return await this.client.base.extDriftProgram.methods
      .updateUserMarginTradingEnabled(subAccountId, marginTradingEnabled)
      .accounts({
        glamState: this.client.base.statePda,
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
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.updateUserMarginTradingEnabledIx(
      marginTradingEnabled,
      subAccountId,
      glamSigner,
    );
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async updateUserDelegateIx(
    delegate: PublicKey | string,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { user } = this.client.getDriftUserPdas(subAccountId);
    return await this.client.base.extDriftProgram.methods
      .updateUserDelegate(subAccountId, new PublicKey(delegate))
      .accounts({
        glamState: this.client.base.statePda,
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
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.updateUserDelegateIx(
      delegate,
      subAccountId,
      glamSigner,
    );
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async deleteUserIx(
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { user, userStats } = this.client.getDriftUserPdas(subAccountId);
    return await this.client.base.extDriftProgram.methods
      .deleteUser()
      .accounts({
        glamState: this.client.base.statePda,
        state: this.client.driftStatePda,
        user,
        userStats,
        glamSigner,
      })
      .instruction();
  }

  public async deleteUserTx(
    subAccountId: number,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.deleteUserIx(subAccountId, glamSigner);
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async placeOrderIx(
    orderParams: OrderParams,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { marketIndex, marketType } = orderParams;

    const { user: referrer, userStats: referrerStats } =
      this.client.getGlamReferrerPdas();

    const remainingAccounts = (
      await this.client.composeRemainingAccounts(
        subAccountId,
        marketType,
        marketIndex,
      )
    ).concat([
      { pubkey: referrer, isWritable: true, isSigner: false },
      { pubkey: referrerStats, isWritable: true, isSigner: false },
    ]);

    const { user } = this.client.getDriftUserPdas(subAccountId);
    return await this.client.base.extDriftProgram.methods
      .placeOrders([orderParams])
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        user,
        state: this.client.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  public async placeOrderTx(
    orderParams: OrderParams,
    subAccountId: number,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.placeOrderIx(orderParams, subAccountId, glamSigner);
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async modifyOrderIx(
    modifyOrderParams: ModifyOrderParams,
    orderId: number,
    marketIndex: number,
    marketType: MarketType,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const remainingAccounts = await this.client.composeRemainingAccounts(
      subAccountId,
      marketType,
      marketIndex,
    );

    const { user } = this.client.getDriftUserPdas(subAccountId);
    return await this.client.base.extDriftProgram.methods
      .modifyOrder(orderId, modifyOrderParams)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        user,
        state: this.client.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  public async modifyOrderTx(
    modifyOrderParams: ModifyOrderParams,
    orderId: number,
    marketIndex: number,
    marketType: MarketType,
    subAccountId: number,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.modifyOrderIx(
      modifyOrderParams,
      orderId,
      marketIndex,
      marketType,
      subAccountId,
      glamSigner,
    );
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async cancelOrdersIx(
    marketType: MarketType,
    marketIndex: number,
    direction: PositionDirection,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const remainingAccounts = await this.client.composeRemainingAccounts(
      subAccountId,
      marketType,
      marketIndex,
    );

    const { user } = this.client.getDriftUserPdas(subAccountId);
    return await this.client.base.extDriftProgram.methods
      .cancelOrders(marketType, marketIndex, direction)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        user,
        state: this.client.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  public async cancelOrdersTx(
    marketType: MarketType,
    marketIndex: number,
    direction: PositionDirection,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.cancelOrdersIx(
      marketType,
      marketIndex,
      direction,
      subAccountId,
      glamSigner,
    );
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async cancelOrdersByIdsIx(
    orderIds: number[],
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const remainingAccounts =
      await this.client.composeRemainingAccounts(subAccountId);

    const { user } = this.client.getDriftUserPdas(subAccountId);
    return await this.client.base.extDriftProgram.methods
      .cancelOrdersByIds(orderIds)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        user,
        state: this.client.driftStatePda,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  public async cancelOrdersByIdsTx(
    orderIds: number[],
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.cancelOrdersByIdsIx(
      orderIds,
      subAccountId,
      glamSigner,
    );
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }

  public async settlePnlIx(
    marketIndex: number,
    subAccountId: number,
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    const { vault: driftVault } = await this.client.fetchAndParseSpotMarket(0);
    const remainingAccounts = await this.client.composeRemainingAccounts(
      subAccountId,
      MarketType.PERP,
      marketIndex,
    );

    const { user } = this.client.getDriftUserPdas(subAccountId);
    return await this.client.base.extDriftProgram.methods
      .settlePnl(marketIndex)
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
        user,
        state: this.client.driftStatePda,
        spotMarketVault: driftVault,
      })
      .remainingAccounts(remainingAccounts)
      .instruction();
  }

  public async settlePnlTx(
    marketIndex: number,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.settlePnlIx(marketIndex, subAccountId, glamSigner);
    const tx = this.build([ix], txOptions);
    return await this.client.base.intoVersionedTransaction(tx, txOptions);
  }
}

export class DriftProtocolClient {
  private spotMarkets = new Map<number, SpotMarket>();
  private perpMarkets = new Map<number, PerpMarket>();
  private marketConfigs: DriftMarketConfigs | null = null;
  txBuilder: TxBuilder;

  public constructor(
    readonly base: BaseClient,
    readonly vault: VaultClient,
  ) {
    this.txBuilder = new TxBuilder(this);
  }

  // Client methods

  public async initialize(
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.initializeTx(subAccountId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async updateUserCustomMarginRatio(
    maxLeverage: number,
    subAccountId: number = 0,
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.updateUserCustomMarginRatioTx(
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
    const tx = await this.txBuilder.updateUserMarginTradingEnabledTx(
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
    const tx = await this.txBuilder.updateUserDelegateTx(
      new PublicKey(delegate),
      subAccountId,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async deleteUser(
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.deleteUserTx(subAccountId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async deposit(
    amount: anchor.BN,
    marketIndex: number = 1,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.depositTx(
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
    const tx = await this.txBuilder.withdrawTx(
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
    const tx = await this.txBuilder.placeOrderTx(
      orderParams,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async modifyOrder(
    modifyOrderParams: ModifyOrderParams,
    orderId: number,
    marketIndex: number,
    marketType: MarketType,
    subAccountId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.modifyOrderTx(
      modifyOrderParams,
      orderId,
      marketIndex,
      marketType,
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
    const tx = await this.txBuilder.cancelOrdersTx(
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
    const tx = await this.txBuilder.cancelOrdersByIdsTx(
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
    const tx = await this.txBuilder.settlePnlTx(
      marketIndex,
      subAccountId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  // Utils

  parsePerpMarket(address: PublicKey, data: Buffer): PerpMarket {
    const perpMarket = DriftPerpMarket.decode(address, data);
    return {
      name: perpMarket.nameStr,
      marketPda: perpMarket.marketPda,
      marketIndex: perpMarket.marketIndex,
      oracle: perpMarket.oracle,
      oracleSource: OracleSource.get(perpMarket.oracleSource),
    };
  }

  parseSpotMarket(address: PublicKey, data: Buffer): SpotMarket {
    const driftSpotMarket = DriftSpotMarket.decode(address, data);
    return {
      name: driftSpotMarket.nameStr,
      marketIndex: driftSpotMarket.marketIndex,
      poolId: driftSpotMarket.poolId,
      marketPda: driftSpotMarket.marketPda,
      oracle: driftSpotMarket.oracle,
      oracleSource: OracleSource.get(driftSpotMarket.oracleSource),
      vault: driftSpotMarket.vault,
      mint: driftSpotMarket.mint,
      decimals: driftSpotMarket.decimals,
      tokenProgram:
        driftSpotMarket.tokenProgram === 0
          ? TOKEN_PROGRAM_ID
          : TOKEN_2022_PROGRAM_ID,
      cumulativeDepositInterest: driftSpotMarket.cumulativeDepositInterest,
      cumulativeBorrowInterest: driftSpotMarket.cumulativeBorrowInterest,
    };
  }

  calcSpotBalance(
    scaledBalance: BN,
    scaledBalanceType: SpotBalanceType,
    decimals: number,
    cumulativeDepositInterest: BN,
    cumulativeBorrowInterest: BN,
  ): { amount: number; uiAmount: number } {
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

  calcSpotBalanceBn(scaledBalance: BN, decimals: number, interest: BN): BN {
    const precisionAdjustment = new BN(10 ** (19 - decimals));
    const balance = scaledBalance.mul(interest).div(precisionAdjustment);
    return balance;
  }

  // PDA helpers

  getMarketPda = (marketType: MarketType, marketIndex: number) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from(`${"perp" in marketType ? "perp" : "spot"}_market`),
        new BN(marketIndex).toArrayLike(Buffer, "le", 2),
      ],
      DRIFT_PROGRAM_ID,
    )[0];

  getUserPda = (authority: PublicKey, subAccountId = 0) =>
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("user"),
        authority.toBuffer(),
        new BN(subAccountId).toArrayLike(Buffer, "le", 2),
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
      accounts.forEach((account, index) => {
        if (account) {
          const spotMarket = this.parseSpotMarket(
            marketPdas[index],
            account.data,
          );
          this.spotMarkets.set(spotMarket.marketIndex, spotMarket);
        }
      });
    }

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
      accounts.forEach((account, index) => {
        if (account) {
          const perpMarket = this.parsePerpMarket(
            marketPdas[index],
            account.data,
          );
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
        poolId: m.poolId,
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

    const spotMarketIndexes = spotPositions.map((p) => p.marketIndex);
    const perpMarketIndexes = perpPositions.map((p) => p.marketIndex);
    await Promise.all([
      this.fetchAndParseSpotMarkets(spotMarketIndexes),
      this.fetchAndParsePerpMarkets(perpMarketIndexes),
    ]);

    const spotPositionsExt = await Promise.all(
      spotPositions.map(async (p) => {
        const spotMarket = this.spotMarkets.get(p.marketIndex);

        const { amount, uiAmount } = this.calcSpotBalance(
          p.scaledBalance,
          p.balanceType,
          spotMarket!.decimals,
          spotMarket!.cumulativeDepositInterest,
          spotMarket!.cumulativeBorrowInterest,
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
      name: charsToName(name),
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

    await this.fetchMarketConfigs(skipCache);

    return await Promise.all(
      subAccountsInfoAndIds.map(([accountInfo, subAccountId]) =>
        this.parseDriftUser(accountInfo, subAccountId),
      ),
    );
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
}
