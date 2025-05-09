import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  ComputeBudgetProgram,
  SystemProgram,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { BaseClient, TxOptions } from "./base";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
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
import { WSOL } from "../constants";
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

    const statePda = getStatePda(stateModel, this.base.program.programId);
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
      const tx = await this.base.program.methods
        .initializeState(new StateIdlModel(stateModel))
        .accountsPartial({
          glamState: statePda,
          glamSigner,
          glamVault: this.base.vaultPda,
        })
        .transaction();
      const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
      const txSig = await this.base.sendAndConfirm(vTx);

      return [txSig, statePda];
    }

    // let extraMetasAccount =
    //   mints && mints[0].lockUpPeriod && mints[0].lockUpPeriod > 0
    //     ? this.base.extraMetasPda
    //     : null;

    // Initialize state and add mint in one transaction
    if (mints && mints.length > 0 && singleTx) {
      const initStateIx = await this.base.program.methods
        .initializeState(new StateIdlModel(stateModel))
        .accountsPartial({
          glamState: statePda,
          glamSigner,
          glamVault: this.base.vaultPda,
        })
        .instruction();

      const tx = await this.base.program.methods
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
    const tx = await this.base.program.methods
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
        const tx = await this.base.program.methods
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
    const tx = await this.base.program.methods
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
    const tx = await this.base.program.methods
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
    const tx = await this.base.program.methods
      .emergencyUpdateState(new StateIdlModel(updated))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async close(txOptions: TxOptions = {}): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const tx = await this.base.program.methods
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
      this.base.program.programId,
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

      const mintPda = getMintPda(statePda, i, this.base.program.programId);
      mint.uri = `https://api.glam.systems/metadata/${mintPda}`;
      mint.statePubkey = statePda;
      mint.imageUri = `https://api.glam.systems/v0/sparkle?key=${mintPda}&format=png`;
    });

    // convert partial share class models to full share class models
    partialStateModel.mints = (partialStateModel.mints || []).map(
      (s) => new MintModel(s),
    );

    return new StateModel(partialStateModel, this.base.program.programId);
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

  public async closeTokenAccounts(
    tokenAccounts: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.closeTokenAccountsTx(tokenAccounts, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Close vault's token accounts, all token accounts must use the same token program
   */
  public async closeTokenAccountIx(
    tokenAccounts: PublicKey[],
    tokenProgram: PublicKey = TOKEN_PROGRAM_ID,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    return await this.base.program.methods
      .tokenCloseAccount()
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        tokenAccount: tokenAccounts[0],
        cpiProgram: tokenProgram,
      })
      .remainingAccounts(
        tokenAccounts.slice(1).map((account) => ({
          pubkey: account,
          isSigner: false,
          isWritable: true,
        })),
      )
      .instruction();
  }

  public async closeTokenAccountsTx(
    accounts: PublicKey[],
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const accountsInfo =
      await this.base.provider.connection.getMultipleAccountsInfo(accounts);
    if (accounts.length !== accountsInfo.filter((a) => !!a).length) {
      throw new Error("Some token accounts do not exist");
    }

    // split token accounts into 2 arrays by owner program
    const tokenAccountsByProgram = new Map<PublicKey, PublicKey[]>([
      [TOKEN_PROGRAM_ID, []],
      [TOKEN_2022_PROGRAM_ID, []],
    ]);
    accountsInfo.forEach((accountInfo, i) => {
      [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].forEach((programId) => {
        if (accountInfo?.owner.equals(programId)) {
          tokenAccountsByProgram.get(programId)?.push(accounts[i]);
        }
      });
    });

    const ixs = (
      await Promise.all(
        Array.from(tokenAccountsByProgram.entries()).map(
          async ([programId, accounts]) => {
            if (accounts.length === 0) return null;
            return this.closeTokenAccountIx(
              accounts,
              new PublicKey(programId),
              txOptions,
            );
          },
        ),
      )
    ).filter((ix) => ix !== null);

    if (ixs.length === 0) {
      throw new Error("No token accounts to close");
    }

    const tx = new Transaction();
    tx.add(...ixs);

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  /* Deposit & Withdraw */

  public async deposit(
    asset: PublicKey | string,
    amount: number | BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(new PublicKey(asset), amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async depositSol(
    lamports: number | BN,
    wrap = true,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositSolTx(lamports, wrap, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async depositSolTx(
    lamports: number | BN,
    wrap = true,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();

    const _lamports =
      lamports instanceof BN ? BigInt(lamports.toString()) : lamports;
    if (!wrap) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: signer,
          toPubkey: this.base.vaultPda,
          lamports: _lamports,
        }),
      );
      return await this.base.intoVersionedTransaction(tx, txOptions);
    }

    const vaultAta = this.base.getAta(WSOL, this.base.vaultPda);
    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        vaultAta,
        this.base.vaultPda,
        WSOL,
      ),
      SystemProgram.transfer({
        fromPubkey: signer,
        toPubkey: vaultAta,
        lamports: _lamports,
      }),
      createSyncNativeInstruction(vaultAta),
    );
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async withdraw(
    asset: PublicKey | string,
    amount: number | BN,
    txOptions: TxOptions = {} as TxOptions,
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawTx(new PublicKey(asset), amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async depositTx(
    asset: PublicKey,
    amount: number | BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();

    const { mint, tokenProgram } =
      await this.base.fetchMintAndTokenProgram(asset);

    const signerAta = this.base.getAta(asset, signer, tokenProgram);
    const vaultAta = this.base.getAta(asset, this.base.vaultPda, tokenProgram);

    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        vaultAta,
        this.base.vaultPda,
        asset,
        tokenProgram,
      ),
      createTransferCheckedInstruction(
        signerAta,
        asset,
        vaultAta,
        signer,
        new BN(amount).toNumber(),
        mint.decimals,
        [],
        tokenProgram,
      ),
    );

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async withdrawIxs(
    asset: PublicKey,
    amount: number | BN,
    txOptions: TxOptions,
  ): Promise<TransactionInstruction[]> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { tokenProgram } = await this.base.fetchMintAndTokenProgram(asset);
    const signerAta = this.base.getAta(asset, glamSigner, tokenProgram);

    return [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        signerAta,
        glamSigner,
        asset,
        tokenProgram,
      ),
      await this.base.program.methods
        .withdraw(new BN(amount))
        .accounts({
          glamState: this.base.statePda,
          glamSigner,
          asset,
          tokenProgram,
        })
        .instruction(),
    ];
  }

  public async withdrawTx(
    asset: PublicKey,
    amount: number | BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { tokenProgram } = await this.base.fetchMintAndTokenProgram(asset);
    const signerAta = this.base.getAta(asset, glamSigner, tokenProgram);

    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        signerAta,
        glamSigner,
        asset,
        tokenProgram,
      ),
    ];
    const postInstructions = [];

    if (asset.equals(WSOL)) {
      const wrapSolIxs = await this.base.maybeWrapSol(amount, glamSigner);
      preInstructions.push(...wrapSolIxs);
      // If we need to wrap SOL, it means the wSOL balance will be drained,
      // and we close the wSOL token account for convenience
      postInstructions.push(
        await this.closeTokenAccountIx([
          this.base.getAta(WSOL, this.base.vaultPda),
        ]),
      );
    }

    const tx = await this.base.program.methods
      .withdraw(new BN(amount))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        asset,
        tokenProgram,
      })
      .preInstructions(preInstructions)
      .postInstructions(postInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}
