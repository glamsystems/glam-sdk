import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionSignature,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  TOKEN_2022_PROGRAM_ID,
  closeAccount,
  createCloseAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

import { BaseClient, TxOptions } from "./base";
import { TRANSFER_HOOK_PROGRAM, WSOL } from "../constants";
import { StateModel } from "../models";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { ASSETS_MAINNET } from "./assets";

export class InvestorClient {
  public constructor(readonly base: BaseClient) {}

  public async subscribe(
    statePda: PublicKey,
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    queued: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await (queued
      ? this.queuedSubscribeTx(statePda, asset, amount, mintId, txOptions)
      : this.subscribeTx(statePda, asset, amount, mintId, txOptions));
    return await this.base.sendAndConfirm(tx);
  }

  public async queuedRedeem(
    statePda: PublicKey,
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.queuedRedeemTx(
      statePda,
      asset,
      amount,
      mintId,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async fulfill(
    statePda: PublicKey,
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.fulfillTx(statePda, asset, mintId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async claim(
    statePda: PublicKey,
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    // Claim WSOL from redeemed shares
    if (asset.equals(WSOL)) {
      const tx = await this.claimAssetTx(statePda, asset, mintId, txOptions);
      return await this.base.sendAndConfirm(tx);
    }

    // Claim shares after subscription is fulfilled
    const glamMint = this.base.getMintPda(statePda, mintId);
    if (glamMint.equals(asset)) {
      const tx = await this.claimShareTx(statePda, asset, mintId, txOptions);
      return await this.base.sendAndConfirm(tx);
    }

    throw new Error(`Invalid asset to claim: ${asset.toBase58()}`);
  }

  public async subscribeTx(
    glamState: PublicKey,
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !asset.equals(WSOL)) {
      throw new Error("Only WSOL is supported & mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();

    // glam mint token to receive
    const glamMint = this.base.getMintPda(glamState, mintId);
    const mintTo = this.base.getMintAta(signer, glamMint);

    // asset token to transfer to vault
    const vault = this.base.getVaultPda(glamState);
    const vaultInput = this.base.getAta(asset, vault);
    const signerInput = this.base.getAta(asset, signer);

    const wrapSolIxs = asset.equals(WSOL)
      ? [
          createAssociatedTokenAccountIdempotentInstruction(
            signer,
            signerInput,
            signer,
            asset,
          ),
          SystemProgram.transfer({
            fromPubkey: signer,
            toPubkey: signerInput,
            lamports: amount.toNumber(),
          }),
          createSyncNativeInstruction(signerInput),
        ]
      : [];
    let preInstructions: TransactionInstruction[] = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        vaultInput,
        vault,
        asset,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        mintTo,
        signer,
        glamMint,
        TOKEN_2022_PROGRAM_ID,
      ),
      ...wrapSolIxs,
      ...(txOptions.preInstructions || []),
    ];

    const postInstructions = asset.equals(WSOL)
      ? [createCloseAccountInstruction(signerInput, signer, signer)]
      : [];

    // Check if lockup is enabled on the fund, if so, add signerPolicy
    let signerPolicy = null;
    if (await this.base.isLockupEnabled(glamState)) {
      signerPolicy = this.base.getAccountPolicyPda(glamState, signer);
      console.log(
        `signerPolicy: ${signerPolicy} for signer ${signer} and token account ${mintTo}`,
      );
    }

    // @ts-ignore
    const tx = await this.base.program.methods
      .subscribe(0, amount)
      .accounts({
        glamState,
        glamMint,
        signer,
        depositAsset: asset,
        signerPolicy,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async queuedSubscribeTx(
    glamState: PublicKey,
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !asset.equals(WSOL)) {
      throw new Error("Only WSOL is supported & mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();

    // asset token to transfer to escrow
    const escrow = this.base.getEscrowPda(glamState);
    const escrowAta = this.base.getAta(asset, escrow);
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
    let preInstructions: TransactionInstruction[] = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        escrowAta,
        escrow,
        asset,
      ),
      ...wrapSolIxs,
      ...(txOptions.preInstructions || []),
    ];

    const postInstructions = asset.equals(WSOL)
      ? [createCloseAccountInstruction(signerAta, signer, signer)]
      : [];

    // @ts-ignore
    const tx = await this.base.program.methods
      .queuedSubscribe(0, amount)
      .accounts({
        glamState,
        signer,
        depositAsset: asset,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async queuedRedeemTx(
    glamState: PublicKey,
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !asset.equals(WSOL)) {
      throw new Error("Only WSOL is supported & mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);

    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        this.base.getMintAta(signer, glamMint),
        signer,
        glamMint,
        TOKEN_2022_PROGRAM_ID,
      ),
    ];

    const remainingAccounts: PublicKey[] = [];
    if (await this.base.isLockupEnabled(glamState)) {
      const extraMetasAccount = this.base.getExtraMetasPda(glamState, mintId);
      const signerPolicy = this.base.getAccountPolicyPda(glamState, signer);
      const escrow = this.base.getEscrowPda(glamState);
      const escrowPolicy = this.base.getAccountPolicyPda(glamState, escrow);
      remainingAccounts.push(
        ...[
          extraMetasAccount,
          glamState,
          signerPolicy,
          escrowPolicy,
          TRANSFER_HOOK_PROGRAM,
        ],
      );
    }

    const tx = await this.base.program.methods
      .queuedRedeem(0, amount)
      .accounts({
        glamState,
        glamMint,
        signer,
      })
      .preInstructions(preInstructions)
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
    glamState: PublicKey,
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !asset.equals(WSOL)) {
      throw new Error("Only WSOL is supported & mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();
    const vault = this.base.getVaultPda(glamState);
    const vaultAssetAta = this.base.getAta(asset, vault);

    const glamMint = this.base.getMintPda(glamState, mintId);
    const escrow = this.base.getEscrowPda(glamState);
    const escrowMintAta = this.base.getMintAta(escrow, glamMint);
    const escrowAssetAta = this.base.getAta(asset, escrow);

    let preInstructions: TransactionInstruction[] = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        escrowMintAta,
        escrow,
        glamMint,
        TOKEN_2022_PROGRAM_ID,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        escrowAssetAta,
        escrow,
        asset,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        vaultAssetAta,
        vault,
        asset,
      ),
      ...(txOptions.preInstructions || []),
    ];

    const tx = await this.base.program.methods
      .fulfill(mintId)
      .accounts({
        glamState,
        glamMint,
        signer,
        asset,
      })
      .preInstructions(preInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimAssetTx(
    glamState: PublicKey,
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !asset.equals(WSOL)) {
      throw new Error("Only WSOL is supported & mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);
    const signerAta = this.base.getAta(asset, signer);

    const tx = await this.base.program.methods
      .claim(0)
      .accounts({
        glamState,
        signer,
        tokenMint: asset,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          signer,
          signerAta,
          signer,
          asset,
        ),
      ])
      .postInstructions([
        createCloseAccountInstruction(signerAta, signer, signer),
      ])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimShareTx(
    glamState: PublicKey,
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0) {
      throw new Error("mintId must be 0");
    }

    const signer = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);
    const signerAta = this.base.getAta(asset, signer, TOKEN_2022_PROGRAM_ID);
    const escrow = this.base.getEscrowPda(glamState);

    const remainingAccounts: PublicKey[] = [];
    if (await this.base.isLockupEnabled(glamState)) {
      const extraMetasAccount = this.base.getExtraMetasPda(glamState, mintId);
      const signerPolicy = this.base.getAccountPolicyPda(glamState, signer);
      const escrowPolicy = this.base.getAccountPolicyPda(glamState, escrow);
      remainingAccounts.push(
        ...[
          extraMetasAccount,
          glamState,
          escrowPolicy,
          signerPolicy,
          TRANSFER_HOOK_PROGRAM,
        ],
      );
    }

    const tx = await this.base.program.methods
      .claim(0)
      .accounts({
        glamState,
        signer,
        tokenMint: asset,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          signer,
          signerAta,
          signer,
          asset,
          TOKEN_2022_PROGRAM_ID,
        ),
      ])
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
