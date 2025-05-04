import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
} from "@solana/web3.js";

import { BaseClient, TxOptions } from "./base";
import { WSOL } from "../constants";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export class WSolClient {
  public constructor(readonly base: BaseClient) {}

  /*
   * Client methods
   */

  public async wrap(
    amount: BN,
    txOptions: TxOptions = {} as TxOptions,
  ): Promise<TransactionSignature> {
    const tx = await this.wrapTx(amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async unwrap(
    txOptions: TxOptions = {} as TxOptions,
  ): Promise<TransactionSignature> {
    const tx = await this.unwrapTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /*
   * API methods
   */

  public async wrapTx(
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const to = this.base.getVaultAta(WSOL);

    // @ts-ignore
    const tx = await this.base.program.methods
      .systemTransfer(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        to,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          glamSigner,
          to,
          this.base.vaultPda,
          WSOL,
        ),
      ])
      .postInstructions([createSyncNativeInstruction(to)])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async unwrapTx(txOptions: TxOptions): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tokenAccount = this.base.getVaultAta(WSOL);

    const tx = await this.base.program.methods
      .tokenCloseAccount()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        tokenAccount,
        cpiProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}
