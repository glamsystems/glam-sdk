import { BN } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  TransactionSignature,
  VersionedTransaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { BaseClient, TxOptions } from "./base";
import { SEED_VAULT } from "../constants";

// Enum matching the Rust VoteAuthorizeEnum
export enum VoteAuthorizeEnum {
  Voter = 0,
  Withdrawer = 1,
}

export class ValidatorClient {
  public constructor(readonly base: BaseClient) {}

  /**
   * Authorize a new authority for the vote account.
   */
  public async voteAuthorize(
    vote: PublicKey,
    newAuthority: PublicKey,
    voteAuthorize: VoteAuthorizeEnum,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    // @ts-ignore
    const tx = await this.base.protocolProgram.methods
      .voteAuthorize(newAuthority, voteAuthorize)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vote,
      })
      .transaction();
    return await this.base.sendAndConfirm(
      await this.base.intoVersionedTransaction(tx, txOptions),
    );
  }

  /**
   * Update the validator identity for the vote account.
   */
  public async voteUpdateValidatorIdentity(
    vote: PublicKey,
    identity: Keypair,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.protocolProgram.methods
      .voteUpdateValidatorIdentity()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vote,
        identity: identity.publicKey,
      })
      .transaction();
    return await this.base.sendAndConfirm(
      await this.base.intoVersionedTransaction(tx, txOptions),
      [identity],
    );
  }

  /**
   * Update the commission for the vote account.
   */
  public async voteUpdateCommission(
    vote: PublicKey,
    newCommission: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.protocolProgram.methods
      .voteUpdateCommission(newCommission)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vote,
      })
      .transaction();
    return await this.base.sendAndConfirm(
      await this.base.intoVersionedTransaction(tx, txOptions),
    );
  }

  /**
   * Withdraw lamports from the vote account to a recipient.
   */
  public async voteWithdraw(
    vote: PublicKey,
    recipient: PublicKey,
    lamports: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.protocolProgram.methods
      .voteWithdraw(new BN(lamports))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        vote,
        recipient,
      })
      .transaction();
    return await this.base.sendAndConfirm(
      await this.base.intoVersionedTransaction(tx, txOptions),
    );
  }
}
