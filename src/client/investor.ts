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
import { TRANSFER_HOOK_PROGRAM, USDC, WSOL } from "../constants";
import { getAccountPolicyPda } from "../utils/glamPDAs";

export class InvestorClient {
  public constructor(readonly base: BaseClient) {}

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

  public async queuedRedeem(
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.queuedRedeemTx(asset, amount, mintId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async fulfill(
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.fulfillTx(asset, mintId, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async claim(
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    // Claim asset redeemed from redeemed shares
    if (asset.equals(WSOL) || asset.equals(USDC)) {
      const tx = await this.claimAssetTx(asset, mintId, txOptions);
      return await this.base.sendAndConfirm(tx);
    }

    // Claim shares after subscription is fulfilled
    const glamMint = this.base.mintPda;
    if (glamMint.equals(asset)) {
      const tx = await this.claimShareTx(asset, mintId, txOptions);
      return await this.base.sendAndConfirm(tx);
    }

    throw new Error(`Invalid asset to claim: ${asset.toBase58()}`);
  }

  public async subscribeTx(
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !(asset.equals(WSOL) || asset.equals(USDC))) {
      throw new Error(
        "Not supported. Only WSOL and USDC are allowed, and mintId must be 0",
      );
    }

    const signer = txOptions.signer || this.base.getSigner();

    // glam mint token to receive
    const glamMint = this.base.mintPda;
    const mintTo = this.base.getMintAta(signer);

    // asset token to transfer to vault
    const vault = this.base.vaultPda;
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
    if (await this.base.isLockupEnabled()) {
      signerPolicy = getAccountPolicyPda(this.base.getMintAta(signer));
      console.log(
        `signerPolicy: ${signerPolicy} for signer ${signer} and token account ${mintTo}`,
      );
    }

    // @ts-ignore
    const tx = await this.base.program.methods
      .subscribe(0, amount)
      .accounts({
        glamState: this.base.statePda,
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
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !(asset.equals(WSOL) || asset.equals(USDC))) {
      throw new Error(
        "Not supported. Only WSOL and USDC are allowed, and mintId must be 0",
      );
    }

    const signer = txOptions.signer || this.base.getSigner();

    // asset token to transfer to escrow
    const escrow = this.base.escrowPda;
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
        glamState: this.base.statePda,
        signer,
        depositAsset: asset,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async queuedRedeemTx(
    asset: PublicKey,
    amount: BN,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !(asset.equals(WSOL) || asset.equals(USDC))) {
      throw new Error(
        "Not supported. Only WSOL and USDC are allowed, and mintId must be 0",
      );
    }

    const signer = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.mintPda;

    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        this.base.getMintAta(signer),
        signer,
        glamMint,
        TOKEN_2022_PROGRAM_ID,
      ),
    ];

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
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !(asset.equals(WSOL) || asset.equals(USDC))) {
      throw new Error(
        "Not supported. Only WSOL and USDC are allowed, and mintId must be 0",
      );
    }

    const signer = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;
    const vaultAssetAta = this.base.getAta(asset, vault);

    const glamMint = this.base.mintPda;
    const escrow = this.base.escrowPda;
    const escrowMintAta = this.base.getMintAta(escrow);
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
        glamState: this.base.statePda,
        glamMint,
        signer,
        asset,
      })
      .preInstructions(preInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async claimAssetTx(
    asset: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    if (mintId !== 0 || !(asset.equals(WSOL) || asset.equals(USDC))) {
      throw new Error(
        "Not supported. Only WSOL and USDC are allowed, and mintId must be 0",
      );
    }
    const signer = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.mintPda;
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
    const glamMint = this.base.mintPda;
    const signerAta = this.base.getAta(asset, signer, TOKEN_2022_PROGRAM_ID);
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
