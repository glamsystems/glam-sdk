import {
  VersionedTransaction,
  TransactionSignature,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { BaseClient, BaseTxBuilder, TxOptions } from "./base";
import { StateAccountType } from "../models";
import { StateClient } from "./state";

class TxBuilder extends BaseTxBuilder<TimelockClient> {
  async applyStateTimelockIx(
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    return await this.client.base.protocolProgram.methods
      .updateStateApplyTimelock()
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
      })
      .instruction();
  }

  public async applyStateTimelockTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.applyStateTimelockIx(glamSigner);
    return await this.buildVersionedTx([ix], txOptions);
  }

  async applyMintTimelockIx(
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    return await this.client.base.mintProgram.methods
      .updateMintApplyTimelock()
      .accounts({
        glamState: this.client.base.statePda,
        glamMint: this.client.base.mintPda,
        glamSigner,
      })
      .instruction();
  }

  async applyMintTimelockTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.applyMintTimelockIx(glamSigner);
    return await this.buildVersionedTx([ix], txOptions);
  }

  async cancelTimelockIx(
    glamSigner: PublicKey,
  ): Promise<TransactionInstruction> {
    return await this.client.base.protocolProgram.methods
      .cancelTimelock()
      .accounts({
        glamState: this.client.base.statePda,
        glamSigner,
      })
      .instruction();
  }

  async cancelTimelockTx(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.client.base.signer;
    const ix = await this.cancelTimelockIx(glamSigner);
    return await this.buildVersionedTx([ix], txOptions);
  }
}

export class TimelockClient {
  readonly txBuilder: TxBuilder;

  public constructor(
    readonly base: BaseClient,
    readonly stateClient: StateClient,
  ) {
    this.txBuilder = new TxBuilder(this);
  }

  /**
   * Sets the timelock duration in seconds
   * @param durationSeconds Duration in seconds for timelock period
   */
  public async set(
    durationSeconds: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const txSig = await this.stateClient.update(
      { timelockDuration: durationSeconds },
      txOptions,
    );
    return txSig;
  }

  /**
   * Applies pending timelock updates after timelock expires.
   */
  public async apply(txOptions: TxOptions = {}): Promise<TransactionSignature> {
    const stateAccount = await this.base.fetchStateAccount();
    const accountType = stateAccount.accountType;

    let vTx: VersionedTransaction;
    if (StateAccountType.equals(accountType, StateAccountType.VAULT)) {
      // For Vault type, apply state timelock
      vTx = await this.txBuilder.applyStateTimelockTx(txOptions);
    } else if (
      StateAccountType.equals(accountType, StateAccountType.MINT) ||
      StateAccountType.equals(accountType, StateAccountType.TOKENIZED_VAULT)
    ) {
      // For Mint or TokenizedVault types, apply mint timelock
      vTx = await this.txBuilder.applyMintTimelockTx(txOptions);
    } else {
      throw new Error(
        `Unsupported account type: ${JSON.stringify(accountType)}`,
      );
    }

    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Cancels pending timelock updates
   */
  public async cancel(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.cancelTimelockTx(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }
}
