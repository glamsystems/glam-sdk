import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  TOKEN_2022_PROGRAM_ID,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { BaseClient, TxOptions } from "./base";
import { TRANSFER_HOOK_PROGRAM, WSOL } from "../constants";
import { getAccountPolicyPda } from "../utils/glamPDAs";

export class InvestClient {
  public constructor(readonly base: BaseClient) {}

  /**
   * Subscribe to a tokenized vault
   *
   * @param asset Deposit asset
   * @param amount
   * @param mintId
   * @param queued by default false, set to true to subscribe in queued mode
   * @param txOptions
   * @returns
   */
  public async subscribe(
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    queued: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await (queued
      ? this.queuedSubscribeTx(asset, amount, mintId, txOptions)
      : this.subscribeTx(asset, amount, mintId, txOptions));
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Request to redeem share tokens of a tokenized vault in queued mode
   *
   * @param amount
   * @param mintId
   * @param txOptions
   * @returns
   */
  public async queuedRedeem(
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.queuedRedeemTx(amount, mintId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Redeem share tokens of a tokenized vault instantly. Preconditions:
   * 1. The vault must allow permissionless fulfillment
   * 2. The vault must have sufficient liquidity
   *
   * @param amount
   * @param mintId
   * @param txOptions
   * @returns
   */
  public async instantRedeem(
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.instantRedeemTx(amount, mintId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async fulfill(
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.fulfillTx(mintId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async claim(
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    // Claim shares after subscription is fulfilled
    const glamMint = this.base.mintPda;
    if (glamMint.equals(asset)) {
      const tx = await this.claimShareTx(asset, mintId, txOptions);
      return await this.base.sendAndConfirm(tx);
    }

    // Claim asset redeemed from shares
    const tx = await this.claimAssetTx(asset, mintId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async subscribeTx(
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0) {
      throw new Error("mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();

    // glam mint token to receive
    const glamMint = this.base.mintPda;
    const mintTo = this.base.getMintAta(signer);

    // asset token to transfer to vault
    const signerAta = this.base.getAta(asset, signer);

    const wrapSolIxs = asset.equals(WSOL)
      ? [
          createAssociatedTokenAccountIdempotentInstruction(
            signer,
            signerAta,
            signer,
            asset,
          ),
          SystemProgram.transfer({
            fromPubkey: signer,
            toPubkey: signerAta,
            lamports: amount.toNumber(),
          }),
          createSyncNativeInstruction(signerAta),
        ]
      : [];
    const preInstructions: TransactionInstruction[] = [
      ...wrapSolIxs,
      ...(txOptions.preInstructions || []),
    ];

    const postInstructions = asset.equals(WSOL)
      ? [createCloseAccountInstruction(signerAta, signer, signer)]
      : [];

    // Check if lockup is enabled on the fund, if so, add signerPolicy
    let signerPolicy = null;
    if (await this.base.isLockupEnabled()) {
      signerPolicy = getAccountPolicyPda(this.base.getMintAta(signer));
      console.log(
        `signerPolicy: ${signerPolicy} for signer ${signer} and token account ${mintTo}`,
      );
    }

    const tx = await this.base.program.methods
      .subscribe(0, amount)
      .accounts({
        glamState: this.base.statePda,
        glamMint,
        signer,
        depositAsset: asset,
        signerPolicy,
        depositTokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async queuedSubscribeTx(
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0) {
      throw new Error("mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();

    // asset token to transfer to escrow
    const signerAta = this.base.getAta(asset, signer);

    const wrapSolIxs = asset.equals(WSOL)
      ? [
          createAssociatedTokenAccountIdempotentInstruction(
            signer,
            signerAta,
            signer,
            asset,
          ),
          SystemProgram.transfer({
            fromPubkey: signer,
            toPubkey: signerAta,
            lamports: amount.toNumber(),
          }),
          createSyncNativeInstruction(signerAta),
        ]
      : [];
    const preInstructions: TransactionInstruction[] = [
      ...wrapSolIxs,
      ...(txOptions.preInstructions || []),
    ];

    const postInstructions = asset.equals(WSOL)
      ? [createCloseAccountInstruction(signerAta, signer, signer)]
      : [];

    const tx = await this.base.program.methods
      .queuedSubscribe(0, amount)
      .accounts({
        glamState: this.base.statePda,
        signer,
        depositAsset: asset,
        depositTokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async instantRedeemTx(
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0) {
      throw new Error("mintId must be 0");
    }

    // Instant redemption flow is realized by enqueueing a redemption, fulfilling it, and then claiming the tokens in a single transaction.

    const preInstructions = txOptions.preInstructions || [];

    const signer = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.mintPda;
    const stateModel = await this.base.fetchStateModel();
    const baseAsset = stateModel.baseAsset!;
    const signerAta = this.base.getAta(baseAsset, signer);

    const fulfillIx = await this.base.program.methods
      .fulfill(mintId)
      .accounts({
        glamState: this.base.statePda,
        glamMint,
        signer,
        asset: baseAsset,
        depositTokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    preInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        signerAta,
        signer,
        baseAsset,
      ),
    );
    const claimIx = await this.base.program.methods
      .claim(0)
      .accounts({
        glamState: this.base.statePda,
        signer,
        tokenMint: baseAsset,
        claimTokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    const remainingAccounts: PublicKey[] = [];
    if (await this.base.isLockupEnabled()) {
      const extraMetasAccount = this.base.extraMetasPda;
      const signerPolicy = getAccountPolicyPda(this.base.getMintAta(signer));
      const escrow = this.base.escrowPda;
      const escrowPolicy = getAccountPolicyPda(this.base.getMintAta(escrow));
      remainingAccounts.push(
        ...[
          extraMetasAccount,
          signerPolicy,
          escrowPolicy,
          TRANSFER_HOOK_PROGRAM,
        ],
      );
    }

    const tx = await this.base.program.methods
      .queuedRedeem(0, amount)
      .accounts({
        glamState: this.base.statePda,
        glamMint,
        signer,
      })
      .remainingAccounts(
        remainingAccounts.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
      )
      .preInstructions(preInstructions)
      .postInstructions([fulfillIx, claimIx])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async queuedRedeemTx(
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0) {
      throw new Error("mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.mintPda;

    const remainingAccounts: PublicKey[] = [];
    if (await this.base.isLockupEnabled()) {
      const extraMetasAccount = this.base.extraMetasPda;
      const signerPolicy = getAccountPolicyPda(this.base.getMintAta(signer));
      const escrow = this.base.escrowPda;
      const escrowPolicy = getAccountPolicyPda(this.base.getMintAta(escrow));
      remainingAccounts.push(
        ...[
          extraMetasAccount,
          signerPolicy,
          escrowPolicy,
          TRANSFER_HOOK_PROGRAM,
        ],
      );
    }

    const tx = await this.base.program.methods
      .queuedRedeem(0, amount)
      .accounts({
        glamState: this.base.statePda,
        glamMint,
        signer,
      })
      .remainingAccounts(
        remainingAccounts.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
      )
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async fulfillTx(
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0) {
      throw new Error("mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();
    const stateModel = await this.base.fetchStateModel();
    const baseAsset = stateModel.baseAsset!;
    const glamMint = this.base.mintPda;

    const tx = await this.base.program.methods
      .fulfill(mintId)
      .accounts({
        glamState: this.base.statePda,
        glamMint,
        signer,
        asset: baseAsset,
        depositTokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimAssetTx(
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0) {
      throw new Error("mintId must be 0");
    }
    const signer = txOptions.signer || this.base.getSigner();
    const signerAta = this.base.getAta(asset, signer);

    // Close wSOL ata so user gets SOL
    const postInstructions = asset.equals(WSOL)
      ? [createCloseAccountInstruction(signerAta, signer, signer)]
      : [];

    const tx = await this.base.program.methods
      .claim(0)
      .accounts({
        glamState: this.base.statePda,
        signer,
        tokenMint: asset,
        claimTokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          signer,
          signerAta,
          signer,
          asset,
        ),
      ])
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimShareTx(
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0) {
      throw new Error("mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();
    const escrow = this.base.escrowPda;

    const remainingAccounts: PublicKey[] = [];
    if (await this.base.isLockupEnabled()) {
      const extraMetasAccount = this.base.extraMetasPda;
      const signerPolicy = getAccountPolicyPda(this.base.getMintAta(signer));
      const escrowPolicy = getAccountPolicyPda(this.base.getMintAta(escrow));
      remainingAccounts.push(
        ...[
          extraMetasAccount,
          escrowPolicy,
          signerPolicy,
          TRANSFER_HOOK_PROGRAM,
        ],
      );
    }

    const tx = await this.base.program.methods
      .claim(0)
      .accounts({
        glamState: this.base.statePda,
        signer,
        tokenMint: asset,
        claimTokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .remainingAccounts(
        remainingAccounts.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
      )
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}
