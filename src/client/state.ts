import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BaseClient, TxOptions } from "./base";

import {
  CompanyModel,
  DelegateAcl,
  StateModel,
  FundOpenfundsModel,
  ManagerModel,
  MintModel,
  MintOpenfundsModel,
  CreatedModel,
  Metadata,
  StateIdlModel,
} from "../models";
import { getMintPda, getStatePda } from "../utils/glamPDAs";

export class StateClient {
  public constructor(readonly base: BaseClient) {}

  public async create(
    partialStateModel: Partial<StateModel>,
    singleTx: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<[TransactionSignature, PublicKey]> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    let stateModel = this.enrichStateModel(partialStateModel);

    // @ts-ignore
    const statePda = getStatePda(
      stateModel,
      this.base.protocolProgram.programId,
    );
    this.base.statePda = statePda;
    console.log(`State PDA set to GlamClient: ${statePda}`);

    const mints = stateModel.mints;
    stateModel.mints = [];

    if (mints && mints.length > 1) {
      throw new Error("Multiple mints not supported. Only 1 mint is allowed.");
    }

    // No mint, only need to initialize the state
    if (mints && mints.length === 0) {
      // @ts-ignore
      const tx = await this.base.protocolProgram.methods
        .initializeState(new StateIdlModel(stateModel))
        .accountsPartial({
          glamState: statePda,
          glamSigner,
        })
        .transaction();
      const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
      const txSig = await this.base.sendAndConfirm(vTx);

      return [txSig, statePda];
    }

    // Initialize state and add mint in one transaction
    if (mints && mints.length > 0 && singleTx) {
      const initStateIx = await this.base.protocolProgram.methods
        .initializeState(new StateIdlModel(stateModel))
        .accountsPartial({
          glamState: statePda,
          glamSigner,
        })
        .instruction();

      const tx = await this.base.protocolProgram.methods
        .addMint(mints[0])
        .accounts({
          glamState: statePda,
          glamSigner,
          newMint: this.base.mintPda,
          extraMetasAccount: this.base.extraMetasPda,
        })
        .preInstructions([initStateIx])
        .transaction();
      const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
      const txSig = await this.base.sendAndConfirm(vTx);

      return [txSig, statePda];
    }

    // Initialize state and add mints in separate transactions
    const tx = await this.base.protocolProgram.methods
      .initializeState(new StateIdlModel(stateModel))
      .accountsPartial({
        glamState: statePda,
        glamVault: this.base.vaultPda,
        glamSigner,
        openfundsMetadata: this.base.openfundsPda,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    const txSig = await this.base.sendAndConfirm(vTx);

    await Promise.all(
      (mints || []).map(async (mint, j: number) => {
        const tx = await this.base.protocolProgram.methods
          .addMint(mint)
          .accounts({
            glamState: statePda,
            glamSigner,
            newMint: this.base.mintPda,
            extraMetasAccount: this.base.extraMetasPda,
          })
          .transaction();
        const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
        return await this.base.sendAndConfirm(vTx);
      }),
    );
    return [txSig, statePda];
  }

  public async update(
    updated: Partial<StateModel>,
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
    updated: Partial<StateModel>,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vTx = await this.emergencyUpdateStateTx(updated, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async updateStateTx(
    updated: Partial<StateModel>,
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
    updated: Partial<StateModel>,
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
  enrichStateModel(partialStateModel: Partial<StateModel>): StateModel {
    const owner = this.base.getSigner();
    const defaultDate = new Date().toISOString().split("T")[0];

    if (!partialStateModel?.name) {
      throw new Error("Name must be specified in partial state model");
    }

    // createdKey = hash state name and get first 8 bytes
    // useful for computing state account PDA in the future
    partialStateModel.created = new CreatedModel({
      key: [
        ...Buffer.from(
          anchor.utils.sha256.hash(partialStateModel.name),
        ).subarray(0, 8),
      ],
    });

    partialStateModel.rawOpenfunds = new FundOpenfundsModel(
      partialStateModel.rawOpenfunds ?? {},
    );

    partialStateModel.owner = new ManagerModel({
      ...partialStateModel.owner,
      pubkey: owner,
    });

    partialStateModel.company = new CompanyModel({
      ...partialStateModel.company,
    });

    if (partialStateModel.mints?.length == 1) {
      const mint = partialStateModel.mints[0];
      partialStateModel.rawOpenfunds.fundCurrency =
        partialStateModel.rawOpenfunds?.fundCurrency ||
        mint.rawOpenfunds?.shareClassCurrency ||
        null;
    } else if (
      partialStateModel.mints?.length &&
      partialStateModel.mints.length > 1
    ) {
      throw new Error(
        "Multiple mints are not supported. Only 1 mint is allowed.",
      );
    }

    if (partialStateModel.enabled) {
      partialStateModel.rawOpenfunds.fundLaunchDate =
        partialStateModel.rawOpenfunds?.fundLaunchDate || defaultDate;
    }

    // fields containing fund id / pda
    const statePda = getStatePda(
      partialStateModel,
      this.base.protocolProgram.programId,
    );
    partialStateModel.uri =
      partialStateModel.uri || `https://gui.glam.systems/products/${statePda}`;
    partialStateModel.metadata = new Metadata({
      ...partialStateModel.metadata,
      uri: `https://api.glam.systems/v0/openfunds?fund=${statePda}`,
      template: { openfunds: {} },
    });

    // build openfunds models for each share classes
    (partialStateModel.mints || []).forEach((mint: MintModel, i: number) => {
      if (mint.rawOpenfunds) {
        if (mint.rawOpenfunds.shareClassLifecycle === "active") {
          mint.rawOpenfunds.shareClassLaunchDate =
            mint.rawOpenfunds.shareClassLaunchDate || defaultDate;
        }
        mint.rawOpenfunds = new MintOpenfundsModel(mint.rawOpenfunds);
        mint.isRawOpenfunds = true;
      } else {
        mint.isRawOpenfunds = false;
      }

      const mintPda = getMintPda(
        statePda,
        i,
        this.base.protocolProgram.programId,
      );
      mint.uri = `https://api.glam.systems/metadata/${mintPda}`;
      mint.statePubkey = statePda;
      mint.imageUri = `https://api.glam.systems/v0/sparkle?key=${mintPda}&format=png`;
    });

    // convert partial share class models to full share class models
    partialStateModel.mints = (partialStateModel.mints || []).map(
      (s) => new MintModel(s),
    );

    return new StateModel(
      partialStateModel,
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
          permissions: [],
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
