import * as anchor from "@coral-xyz/anchor";
import {
  VersionedTransaction,
  TransactionSignature,
  PublicKey,
} from "@solana/web3.js";
import { BaseClient, TxOptions } from "./base";
import { StateModel, CreatedModel, StateIdlModel } from "../models";
import { getStatePda } from "../utils/glamPDAs";
import { charsToName } from "../utils/helpers";

class TxBuilder {
  constructor(private base: BaseClient) {}

  async create(
    partialStateModel: Partial<StateIdlModel>,
    baseAssetMint: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const stateModel = this.enrichStateModel(partialStateModel);

    const { id: statePda } = stateModel;

    const tx = await this.base.protocolProgram.methods
      .initializeState(new StateIdlModel(stateModel))
      .accountsPartial({
        glamState: statePda,
        glamSigner,
        baseAssetMint,
      })
      .transaction();

    this.base.statePda = statePda;
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  async update(
    updated: Partial<StateIdlModel>,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.protocolProgram.methods
      .updateState(new StateIdlModel(updated))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  async updateApplyTimelock(
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
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

  async extend(
    newBytes: number,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const tx = await this.base.protocolProgram.methods
      .extendState(newBytes)
      .accounts({
        glamState: this.base.statePda,
        glamSigner: this.base.signer,
      })
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  async close(txOptions: TxOptions = {}): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const tx = await this.base.protocolProgram.methods
      .closeState()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  /**
   * Create an enriched state model from a partial IDL state model
   */
  private enrichStateModel(stateModel: Partial<StateIdlModel>): StateModel {
    if (!stateModel?.name) {
      throw new Error("Name must be specified in partial state model");
    }

    // stateInitKey = hash state name and get first 8 bytes
    // useful for computing state account PDA in the future
    const stateInitKey = [
      ...Buffer.from(
        anchor.utils.sha256.hash(charsToName(stateModel.name)),
      ).subarray(0, 8),
    ];
    stateModel.created = new CreatedModel({ key: stateInitKey });
    stateModel.owner = stateModel.owner || this.base.signer;

    const statePda = getStatePda(
      stateModel,
      this.base.protocolProgram.programId,
    );
    stateModel.uri =
      stateModel.uri || `https://gui.glam.systems/products/${statePda}`;

    return new StateModel(
      { ...stateModel, id: statePda },
      this.base.protocolProgram.programId,
    );
  }
}

export class StateClient {
  public readonly txBuilder: TxBuilder;

  public constructor(readonly base: BaseClient) {
    this.txBuilder = new TxBuilder(base);
  }

  /**
   * Creates a new GLAM state
   */
  public async create(
    partialStateModel: Partial<StateIdlModel>,
    baseAssetMint: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.create(
      partialStateModel,
      baseAssetMint,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Updates GLAM state
   */
  public async update(
    updated: Partial<StateIdlModel>,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.update(updated, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Applies timelock updates to GLAM state
   */
  public async updateApplyTimelock(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.updateApplyTimelock(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Extends GLAM state account size
   */
  public async extend(
    newBytes: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.extend(newBytes, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Closes GLAM state account
   */
  public async close(txOptions: TxOptions = {}): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.close(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }
}
