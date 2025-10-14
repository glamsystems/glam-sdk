import { BN } from "@coral-xyz/anchor";
import {
  AccountMeta,
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { BaseClient, TxOptions } from "./base";
import { TRANSFER_HOOK_PROGRAM, WSOL } from "../constants";
import { getAccountPolicyPda } from "../utils/glamPDAs";
import { PendingRequest, RequestType } from "../models";

export class InvestClient {
  public constructor(readonly base: BaseClient) {}

  public async subscribe(
    amount: BN,
    queued: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await (queued
      ? this.queuedSubscribeTx(amount, txOptions)
      : this.subscribeTx(amount, txOptions));
    return await this.base.sendAndConfirm(tx);
  }

  public async queuedRedeem(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.queuedRedeemTx(amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async cancel(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.cancelTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async fulfill(
    limit: number | null,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.fulfillTx(limit, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Claims the pending request for the signer.
   * @param txOptions
   * @returns
   */
  public async claim(txOptions: TxOptions = {}): Promise<TransactionSignature> {
    const tx = await this.claimTx(null, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async claimForUser(
    user: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.claimTx(user, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async fetchPendingRequest(
    user?: PublicKey,
  ): Promise<PendingRequest | null> {
    const queue = await this.base.fetchRequestQueue();
    if (!queue) {
      return null;
    }
    return (
      queue.data.find((r: PendingRequest) =>
        r.user.equals(user || this.base.signer),
      ) || null
    );
  }

  public async subscribeTx(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();
    const { baseAssetMint: depositAsset } = await this.base.fetchStateModel();

    const mintTo = this.base.getMintAta(signer);
    const signerAta = this.base.getAta(depositAsset, signer);

    const preInstructions: TransactionInstruction[] =
      txOptions.preInstructions || [];
    const postInstructions: TransactionInstruction[] = [];
    if (depositAsset.equals(WSOL)) {
      preInstructions.push(
        ...[
          createAssociatedTokenAccountIdempotentInstruction(
            signer,
            signerAta,
            signer,
            depositAsset,
          ),
          SystemProgram.transfer({
            fromPubkey: signer,
            toPubkey: signerAta,
            lamports: amount.toNumber(),
          }),
          createSyncNativeInstruction(signerAta),
        ],
      );
      postInstructions.push(
        createCloseAccountInstruction(signerAta, signer, signer),
      );
    }

    // Check if lockup is enabled on the fund, if so, add signerPolicy
    let signerPolicy = null;
    if (await this.base.isLockupEnabled()) {
      signerPolicy = getAccountPolicyPda(this.base.getMintAta(signer));
      console.log(
        `signerPolicy: ${signerPolicy} for signer ${signer} (token account ${mintTo})`,
      );
    }

    const { tokenProgram: depositTokenProgram } =
      await this.base.fetchMintAndTokenProgram(depositAsset);
    const tx = await this.base.mintProgram.methods
      .subscribe(amount)
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        signer,
        depositAsset,
        signerPolicy,
        depositTokenProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async queuedSubscribeTx(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();
    const { baseAssetMint: depositAsset } = await this.base.fetchStateModel();
    const { tokenProgram: depositTokenProgram } =
      await this.base.fetchMintAndTokenProgram(depositAsset);

    const signerDepositAta = this.base.getAta(
      depositAsset,
      signer,
      depositTokenProgram,
    );
    const escrowDepositAta = this.base.getAta(
      depositAsset,
      this.base.escrowPda,
      depositTokenProgram,
    );
    const preInstructions: TransactionInstruction[] =
      txOptions.preInstructions || [];
    const postInstructions: TransactionInstruction[] = [];

    if (depositAsset.equals(WSOL)) {
      // Wrap SOL
      preInstructions.push(
        ...[
          createAssociatedTokenAccountIdempotentInstruction(
            signer,
            signerDepositAta,
            signer,
            depositAsset,
          ),
          SystemProgram.transfer({
            fromPubkey: signer,
            toPubkey: signerDepositAta,
            lamports: amount.toNumber(),
          }),
          createSyncNativeInstruction(signerDepositAta),
        ],
      );
      // Close WSOL ata
      postInstructions.push(
        createCloseAccountInstruction(signerDepositAta, signer, signer),
      );
    }

    const tx = await this.base.mintProgram.methods
      .queuedSubscribe(amount)
      .accountsPartial({
        glamState: this.base.statePda,
        glamEscrow: this.base.escrowPda,
        glamMint: this.base.mintPda,
        requestQueue: this.base.requestQueuePda,
        signer,
        depositAsset,
        signerDepositAta,
        escrowDepositAta,
        depositTokenProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async queuedRedeemTx(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();

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

    const tx = await this.base.mintProgram.methods
      .queuedRedeem(amount)
      .accountsPartial({
        glamState: this.base.statePda,
        glamEscrow: this.base.escrowPda,
        glamMint: this.base.mintPda,
        requestQueue: this.base.requestQueuePda,
        signer,
        signerMintAta: this.base.getMintAta(signer),
        escrowMintAta: this.base.getMintAta(this.base.escrowPda),
        systemProgram: SystemProgram.programId,
        token2022Program: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
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

  public async cancelTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.signer;
    const pendingRequest = await this.fetchPendingRequest(signer);
    if (!pendingRequest) {
      throw new Error("No pending request found to cancel.");
    }

    let requestType = pendingRequest.requestType as RequestType;
    let recoverTokenMint = this.base.mintPda;
    let recoverTokenProgram = TOKEN_2022_PROGRAM_ID;

    if (RequestType.equals(requestType, RequestType.SUBSCRIPTION)) {
      const { baseAssetMint, baseAssetTokenProgramId } =
        await this.base.fetchStateModel();
      recoverTokenMint = baseAssetMint;
      recoverTokenProgram = baseAssetTokenProgramId;
    }
    const signerAta = this.base.getAta(
      recoverTokenMint,
      signer,
      recoverTokenProgram,
    );
    const escrowAta = this.base.getAta(
      recoverTokenMint,
      this.base.escrowPda,
      recoverTokenProgram,
    );

    const tx = await this.base.mintProgram.methods
      .cancel()
      .accountsPartial({
        glamState: this.base.statePda,
        glamEscrow: this.base.escrowPda,
        glamMint: this.base.mintPda,
        requestQueue: this.base.requestQueuePda,
        signer,
        recoverTokenMint,
        signerAta,
        escrowAta,
        systemProgram: SystemProgram.programId,
        recoverTokenProgram,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async fulfillTx(
    limit: number | null,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();
    const { baseAssetMint } = await this.base.fetchStateModel();

    const { tokenProgram: depositTokenProgram } =
      await this.base.fetchMintAndTokenProgram(baseAssetMint);
    const tx = await this.base.mintProgram.methods
      .fulfill(limit)
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        signer,
        asset: baseAssetMint,
        depositTokenProgram,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimTx(
    user: PublicKey | null,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.signer;
    const claimUser = user || signer;

    const pendingRequest = await this.fetchPendingRequest(claimUser);
    if (!pendingRequest) {
      throw new Error("No eligible request found to claim.");
    }
    const requestType = pendingRequest.requestType as RequestType;

    let claimUserAta = null;
    let claimUserPolicy = null;
    let claimTokenMint = null;
    let claimTokenProgram = null;
    let escrowAta = null;
    const remainingAccounts: AccountMeta[] = [];
    const postInstructions: TransactionInstruction[] = [];

    // Claim redemption, user gets base asset back
    if (RequestType.equals(requestType, RequestType.REDEMPTION)) {
      const { baseAssetMint, baseAssetTokenProgramId } =
        await this.base.fetchStateModel();
      claimTokenProgram = baseAssetTokenProgramId;
      claimTokenMint = baseAssetMint;
      claimUserAta = this.base.getAta(
        baseAssetMint,
        claimUser,
        claimTokenProgram,
      );
      escrowAta = this.base.getAta(
        baseAssetMint,
        this.base.escrowPda,
        claimTokenProgram,
      );
      // Close wSOL ata so user gets SOL, only possible if signer is claiming for themselves
      baseAssetMint.equals(WSOL) &&
        claimUser.equals(this.base.signer) &&
        postInstructions.push(
          createCloseAccountInstruction(claimUserAta, claimUser, claimUser),
        );
    } else if (RequestType.equals(requestType, RequestType.SUBSCRIPTION)) {
      claimTokenMint = this.base.mintPda;
      claimTokenProgram = TOKEN_2022_PROGRAM_ID;
      claimUserAta = this.base.getMintAta(claimUser);
      escrowAta = this.base.getMintAta(this.base.escrowPda);
      if (await this.base.isLockupEnabled()) {
        const extraMetasAccount = this.base.extraMetasPda;
        const escrowPolicy = getAccountPolicyPda(escrowAta);
        claimUserPolicy = getAccountPolicyPda(claimUserAta);
        [
          extraMetasAccount,
          escrowPolicy,
          claimUserPolicy,
          TRANSFER_HOOK_PROGRAM,
        ].forEach((pubkey) =>
          remainingAccounts.push({
            pubkey,
            isSigner: false,
            isWritable: false,
          }),
        );
      }
    }

    if (
      !claimUserAta ||
      !claimUserPolicy ||
      !claimTokenMint ||
      !claimTokenProgram ||
      !escrowAta
    ) {
      throw new Error("Missing required accounts.");
    }

    const tx = await this.base.mintProgram.methods
      .claim()
      .accountsPartial({
        glamState: this.base.statePda,
        glamEscrow: this.base.escrowPda,
        glamMint: this.base.mintPda,
        signer,
        claimTokenMint,
        claimUser,
        claimUserAta,
        escrowAta,
        claimUserPolicy,
        claimTokenProgram,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}
