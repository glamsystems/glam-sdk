import * as anchor from "@coral-xyz/anchor";
import {
  VersionedTransaction,
  TransactionSignature,
  PublicKey,
  TransactionInstruction,
  Transaction,
} from "@solana/web3.js";
import { BaseClient, BaseTxBuilder, TxOptions } from "./base";
import { CreatedModel, StateIdlModel, StateAccountType } from "../models";
import { getStatePda } from "../utils/glamPDAs";
import { charsToName } from "../utils/common";

export type InitStateParams = {
  accountType: StateAccountType;
  name: number[];
  baseAssetMint: PublicKey;
} & Partial<StateIdlModel>;

/**
 * A subset of StateIdlModel fields that are updatable using updateState instruction
 */
export type UpdateStateParams = {
  name?: number[];
  owner?: PublicKey;
  portfolioManagerName?: number[];
  timelockDuration?: number;
  assets?: PublicKey[];
  borrowable?: PublicKey[];
};

class TxBuilder extends BaseTxBuilder {
  async initialize(
    params: InitStateParams,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;

    // stateInitKey = hash state name and get first 8 bytes
    // useful for re-computing state account PDA in the future
    const stateInitKey = [
      ...Buffer.from(
        anchor.utils.sha256.hash(charsToName(params.name)),
      ).subarray(0, 8),
    ];
    const created = new CreatedModel({ key: stateInitKey });
    const owner = params.owner || glamSigner;
    const statePda = getStatePda(
      stateInitKey,
      owner,
      this.base.protocolProgram.programId,
    );
    const uri = params.uri || `https://gui.glam.systems/products/${statePda}`;

    // create a StateIdlModel object, baseAssetMint is dropped
    const stateIdlModel = new StateIdlModel({
      ...params,
      created,
      owner,
      uri,
    });
    const tx = await this.base.protocolProgram.methods
      .initializeState(stateIdlModel)
      .accountsPartial({
        glamState: statePda,
        glamSigner,
        baseAssetMint: params.baseAssetMint,
      })
      .preInstructions(txOptions.preInstructions || [])
      .postInstructions(txOptions.postInstructions || [])
      .transaction();

    this.base.statePda = statePda;
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  async update(
    params: UpdateStateParams,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const ix = await this.updateIx(params, txOptions.signer);
    const tx = this.build(ix, txOptions);
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  async updateIx(
    params: UpdateStateParams,
    signer?: PublicKey,
  ): Promise<TransactionInstruction> {
    const glamSigner = signer || this.base.signer;
    return await this.base.protocolProgram.methods
      .updateState(new StateIdlModel(params))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .instruction();
  }

  async updateApplyTimelock(
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.protocolProgram.methods
      .updateStateApplyTimelock()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .postInstructions(txOptions.postInstructions || [])
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
      .preInstructions(txOptions.preInstructions || [])
      .postInstructions(txOptions.postInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  async close(txOptions: TxOptions = {}): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;

    const tx = await this.base.protocolProgram.methods
      .closeState()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .postInstructions(txOptions.postInstructions || [])
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
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
  public async initialize(
    params: InitStateParams,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.initialize(params, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Updates the GLAM state account.
   *
   * If no timelock , the updates will be applied immediately.
   * If timelock is enabled, the updates will be staged and can be applied after the timelock period.
   *
   * Only the fields provided in `params` will be updated; omitted fields remain unchanged.
   */
  public async update(
    params: UpdateStateParams,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.txBuilder.update(params, txOptions);
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
