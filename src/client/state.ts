import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BaseClient, TxOptions } from "./base";

import {
  DelegateAcl,
  StateModel,
  CreatedModel,
  StateIdlModel,
} from "../models";
import { getStatePda } from "../utils/glamPDAs";
import { charsToName } from "../utils/helpers";

export class StateClient {
  public constructor(readonly base: BaseClient) {}

  public async create(
    partialStateModel: Partial<StateIdlModel>,
    txOptions: TxOptions = {},
  ): Promise<[TransactionSignature, PublicKey]> {
    const glamSigner = txOptions.signer || this.base.signer;

    const stateModel = this.enrichStateModel(partialStateModel);
    const statePda = getStatePda(
      stateModel,
      this.base.protocolProgram.programId,
    );

    const tx = await this.base.protocolProgram.methods
      .initializeState(new StateIdlModel(stateModel))
      .accountsPartial({
        glamState: statePda,
        glamSigner,
        baseAssetMint: stateModel.baseAssetMint,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    const txSig = await this.base.sendAndConfirm(vTx);

    this.base.statePda = statePda; // set statePda for GlamClient on success
    return [txSig, statePda];
  }

  public async update(
    updated: Partial<StateIdlModel>,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.updateStateTx(updated, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async updateApplyTimelock(txOptions: TxOptions = {}) {
    const tx = await this.updateStateApplyTimelockTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async emergencyUpdate(
    updated: Partial<StateIdlModel>,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.emergencyUpdateStateTx(updated, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async updateStateTx(
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

  public async updateStateApplyTimelockTx(
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

  public async emergencyUpdateStateTx(
    updated: Partial<StateIdlModel>,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.protocolProgram.methods
      .emergencyUpdateState(new StateIdlModel(updated))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async extend(
    newBytes: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.base.protocolProgram.methods
      .extendState(newBytes)
      .accounts({
        glamState: this.base.statePda,
        glamSigner: this.base.signer,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async close(txOptions: TxOptions = {}): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const tx = await this.base.protocolProgram.methods
      .closeState()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Create a full state model from a partial state model
   */
  enrichStateModel(stateModel: Partial<StateIdlModel>): StateModel {
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

  /**
   * Delete delegates' access to the fund
   *
   * @param statePda
   * @param delegates Public keys of delegates to be deleted
   * @returns
   */
  public async deleteDelegateAcls(
    delegates: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    return await this.update(
      {
        delegateAcls: delegates.map((pubkey) => ({
          pubkey,
          integrationPermissions: [],
          expiresAt: new BN(0),
        })),
      },
      txOptions,
    );
  }

  public async upsertDelegateAcls(
    delegateAcls: DelegateAcl[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    return await this.update({ delegateAcls }, txOptions);
  }
}
