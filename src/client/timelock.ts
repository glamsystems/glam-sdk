import { VersionedTransaction, TransactionSignature } from "@solana/web3.js";
import { BaseClient, TxOptions } from "./base";
import { StateAccountType, StateIdlModel } from "../models";
import { StateClient } from "./state";

class TxBuilder {
  constructor(private base: BaseClient) {}

  /**
   * Builds transaction to apply pending state updates after timelock expires
   */
  async applyStateTimelock(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.protocolProgram.methods
      .updateStateApplyTimelock()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  /**
   * Builds transaction to apply pending mint updates after timelock expires
   */
  async applyMintTimelock(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.mintProgram.methods
      .updateMintApplyTimelock()
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        glamSigner,
      })
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  /**
   * Builds transaction to cancel pending timelock updates
   */
  async cancelTimelock(
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.protocolProgram.methods
      .cancelTimelock()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}

export class TimelockClient {
  public readonly txBuilder: TxBuilder;

  public constructor(
    readonly base: BaseClient,
    readonly stateClient: StateClient,
  ) {
    this.txBuilder = new TxBuilder(base);
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
      vTx = await this.txBuilder.applyStateTimelock(txOptions);
    } else if (
      StateAccountType.equals(accountType, StateAccountType.MINT) ||
      StateAccountType.equals(accountType, StateAccountType.TOKENIZED_VAULT)
    ) {
      // For Mint or TokenizedVault types, apply mint timelock
      vTx = await this.txBuilder.applyMintTimelock(txOptions);
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
    const vTx = await this.txBuilder.cancelTimelock(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }
}
