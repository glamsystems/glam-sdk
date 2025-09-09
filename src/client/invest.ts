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
  TOKEN_PROGRAM_ID,
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
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.fulfillTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async claim(
    requestType: RequestType,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    if (RequestType.equals(requestType, RequestType.SUBSCRIPTION)) {
      const tx = await this.claimSharesTx(txOptions);
      return await this.base.sendAndConfirm(tx);
    }

    const tx = await this.claimTokensTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async fetchPendingRequest(): Promise<PendingRequest | null> {
    const queue = await this.base.fetchRequestQueue();
    if (!queue) {
      return null;
    }
    return (
      queue.data.find((r: PendingRequest) => r.user.equals(this.base.signer)) ||
      null
    );
  }

  public async subscribeTx(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const { baseAssetMint: depositAsset } = await this.base.fetchStateModel();
    if (!depositAsset) {
      throw new Error("Base asset not found in glam state");
    }

    const signer = txOptions.signer || this.base.getSigner();
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
    const { baseAssetMint: depositAsset } = await this.base.fetchStateModel();
    if (!depositAsset) {
      throw new Error("Base asset not found in glam state");
    }
    const { tokenProgram: depositTokenProgram } =
      await this.base.fetchMintAndTokenProgram(depositAsset);

    const signer = txOptions.signer || this.base.getSigner();
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
    // FIXME: identify request type from request queue data
    let requestType = RequestType.REDEMPTION;
    const signer = txOptions.signer || this.base.signer;
    let recoverTokenMint = this.base.mintPda;
    let recoverTokenProgram = TOKEN_2022_PROGRAM_ID;

    if (RequestType.equals(requestType, RequestType.SUBSCRIPTION)) {
      const { baseAssetMint: baseAsset, baseAssetTokenProgram } =
        await this.base.fetchStateModel();
      if (!baseAsset) {
        throw new Error("Base asset not found in glam state");
      }
      recoverTokenMint = baseAsset;
      recoverTokenProgram =
        baseAssetTokenProgram == 0 ? TOKEN_PROGRAM_ID : TOKEN_2022_PROGRAM_ID;
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
        signer: this.base.getSigner(),
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
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const { baseAssetMint: baseAsset } = await this.base.fetchStateModel();
    if (!baseAsset) {
      throw new Error("Base asset not found in glam state");
    }

    const signer = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.mintPda;

    const { tokenProgram: depositTokenProgram } =
      await this.base.fetchMintAndTokenProgram(baseAsset);
    const tx = await this.base.mintProgram.methods
      .fulfill()
      .accounts({
        glamState: this.base.statePda,
        glamMint,
        signer,
        asset: baseAsset,
        depositTokenProgram,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimTokensTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const stateModel = await this.base.fetchStateModel();
    if (!stateModel.baseAssetMint) {
      throw new Error("Base asset not found in glam state");
    }

    const { tokenProgram: claimTokenProgram } =
      await this.base.fetchMintAndTokenProgram(stateModel.baseAssetMint);

    const signer = txOptions.signer || this.base.getSigner();
    const signerAta = this.base.getAta(
      stateModel.baseAssetMint,
      signer,
      claimTokenProgram,
    );
    const escrowAta = this.base.getAta(
      stateModel.baseAssetMint,
      this.base.escrowPda,
      claimTokenProgram,
    );

    const preInstructions = [
      ...(txOptions.preInstructions || []),
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        signerAta,
        signer,
        stateModel.baseAssetMint,
      ),
    ];

    // Close wSOL ata so user gets SOL
    const postInstructions = stateModel.baseAssetMint.equals(WSOL)
      ? [createCloseAccountInstruction(signerAta, signer, signer)]
      : [];

    const tx = await this.base.mintProgram.methods
      .claim()
      .accountsPartial({
        glamState: this.base.statePda,
        glamEscrow: this.base.escrowPda,
        glamMint: this.base.mintPda,
        signer,
        claimTokenMint: stateModel.baseAssetMint,
        signerAta,
        escrowAta,
        signerPolicy: null, // not needed for claiming redemption
        claimTokenProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimSharesTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();
    const signerShareAta = this.base.getMintAta();
    const escrowShareAta = this.base.getMintAta(this.base.escrowPda);

    let signerPolicy = null;
    const remainingAccounts: AccountMeta[] = [];
    if (await this.base.isLockupEnabled()) {
      const extraMetasAccount = this.base.extraMetasPda;
      const escrowPolicy = getAccountPolicyPda(signerShareAta);
      signerPolicy = getAccountPolicyPda(signerShareAta);
      remainingAccounts.push(
        ...[
          extraMetasAccount,
          escrowPolicy,
          signerPolicy,
          TRANSFER_HOOK_PROGRAM,
        ].map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
      );
    }

    const tx = await this.base.mintProgram.methods
      .claim()
      .accountsPartial({
        glamState: this.base.statePda,
        glamEscrow: this.base.escrowPda,
        glamMint: this.base.mintPda,
        signer,
        claimTokenMint: this.base.mintPda,
        signerAta: signerShareAta,
        escrowAta: escrowShareAta,
        signerPolicy,
        claimTokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}
