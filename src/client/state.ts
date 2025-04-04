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
import { TRANSFER_HOOK_PROGRAM, WSOL } from "../constants";

type PublicKeyOrString = PublicKey | string;

function getPublicKey(input: PublicKeyOrString) {
  return typeof input === "string" ? new PublicKey(input) : input;
}

export class StateClient {
  public constructor(readonly base: BaseClient) {}

  public async createState(
    partialStateModel: Partial<StateModel>,
    singleTx: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<[TransactionSignature, PublicKey]> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    let stateModel = this.enrichStateModel(partialStateModel);

    // @ts-ignore
    const glamState = this.base.getStatePda(stateModel);
    const glamVault = this.base.getVaultPda(glamState);
    const openfunds = this.base.getOpenfundsPda(glamState);

    const mints = stateModel.mints;
    stateModel.mints = [];

    if (mints && mints.length > 1) {
      throw new Error("Multiple mints not supported");
    }

    // No share class, only need to initialize the state
    if (mints && mints.length === 0) {
      const tx = await this.base.program.methods
        .initializeState(stateModel)
        .accountsPartial({ glamState, glamSigner, glamVault })
        .transaction();
      const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
      const txSig = await this.base.sendAndConfirm(vTx);

      return [txSig, glamState];
    }

    let extraMetasAccount =
      mints &&
      mints[0].lockUpPeriodInSeconds &&
      mints[0].lockUpPeriodInSeconds > 0
        ? this.base.getExtraMetasPda(glamState)
        : null;

    // Initialize state and add mint in one transaction
    if (mints && mints.length > 0 && singleTx) {
      const initStateIx = await this.base.program.methods
        .initializeState(stateModel)
        .accountsPartial({ glamState, glamSigner, glamVault })
        .instruction();

      // FIXME: setting rawOpenfunds to null is a workarond for
      // Access violation in stack frame 5 at address 0x200005ff8 of size 8
      mints[0].rawOpenfunds = null;
      const newMint = this.base.getMintPda(glamState, 0);
      const tx = await this.base.program.methods
        .addMint(mints[0])
        .accounts({
          glamState,
          glamSigner,
          newMint,
          extraMetasAccount,
        })
        .preInstructions([initStateIx])
        .transaction();
      const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
      const txSig = await this.base.sendAndConfirm(vTx);

      return [txSig, glamState];
    }

    // Initialize state and add mints in separate transactions
    const tx = await this.base.program.methods
      .initializeState(stateModel)
      .accountsPartial({
        glamState,
        glamVault,
        glamSigner,
        openfundsMetadata: openfunds,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    const txSig = await this.base.sendAndConfirm(vTx);

    const addMintTxs = await Promise.all(
      (mints || []).map(async (mint, j: number) => {
        const newMint = this.base.getMintPda(glamState, j);

        // FIXME: setting rawOpenfunds to null is a workarond for
        // Access violation in stack frame 5 at address 0x200005ff8 of size 8
        mint.rawOpenfunds = null;
        const tx = await this.base.program.methods
          .addMint(mint)
          .accounts({
            glamState,
            glamSigner,
            newMint,
            extraMetasAccount,
          })
          .transaction();
        const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
        return await this.base.sendAndConfirm(vTx);
      }),
    );
    console.log("addMintTxs", addMintTxs);
    return [txSig, glamState];
  }

  public async updateState(
    glamState: PublicKeyOrString,
    updated: Partial<StateModel>,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    console.log(
      `await glam.state.updateState("${glamState.toString()}", ${JSON.stringify(updated)}, ${JSON.stringify(txOptions)});`,
    );
    const tx = await this.updateStateTx(
      getPublicKey(glamState),
      updated,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async updateStateTx(
    glamState: PublicKey,
    updated: Partial<StateModel>,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.program.methods
      .updateState(new StateIdlModel(updated))
      .accounts({
        glamState,
        glamSigner,
      })
      .preInstructions(txOptions.preInstructions || [])
      .transaction();
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  public async closeState(
    glamState: PublicKey,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const tx = await this.base.program.methods
      .closeState()
      .accounts({
        glamState,
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

    partialStateModel.name = this.base.getName(partialStateModel);

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
      throw new Error("Fund with more than 1 share class is not supported");
    }

    if (partialStateModel.enabled) {
      partialStateModel.rawOpenfunds.fundLaunchDate =
        partialStateModel.rawOpenfunds?.fundLaunchDate || defaultDate;
    }

    // fields containing fund id / pda
    const statePda = this.base.getStatePda(partialStateModel);
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

      const sharePda = this.base.getMintPda(statePda, i);
      mint.uri = `https://api.glam.systems/metadata/${sharePda}`;
      mint.statePubkey = statePda;
      mint.imageUri = `https://api.glam.systems/v0/sparkle?key=${sharePda}&format=png`;
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
    statePda: PublicKey,
    delegates: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const updated = new StateModel({
      delegateAcls: delegates.map((pubkey) => ({
        pubkey,
        permissions: [],
        expiresAt: new BN(0),
      })),
    });
    return await this.updateState(statePda, updated, txOptions);
  }

  public async upsertDelegateAcls(
    glamState: PublicKey,
    delegateAcls: DelegateAcl[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    return await this.updateState(glamState, { delegateAcls }, txOptions);
  }

  public async closeTokenAccounts(
    glamState: PublicKey,
    tokenAccounts: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.closeTokenAccountsTx(
      glamState,
      tokenAccounts,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Close vault's token accounts, all token accounts must use the same token program
   */
  public async closeTokenAccountIx(
    glamState: PublicKey,
    tokenAccounts: PublicKey[],
    tokenProgram: PublicKey = TOKEN_PROGRAM_ID,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    return await this.base.program.methods
      .tokenCloseAccount()
      .accounts({
        glamState,
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
    glamState: PublicKey,
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
              glamState,
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
    glamState: PublicKey | string,
    asset: PublicKey | string,
    amount: number | BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(
      new PublicKey(glamState),
      new PublicKey(asset),
      amount,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async depositSol(
    glamState: PublicKey,
    lamports: number | BN,
    wrap = true,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositSolTx(glamState, lamports, wrap, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async depositSolTx(
    glamState: PublicKey,
    lamports: number | BN,
    wrap = true,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();
    const vault = this.base.getVaultPda(glamState);

    const _lamports =
      lamports instanceof BN ? BigInt(lamports.toString()) : lamports;
    if (!wrap) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: signer,
          toPubkey: vault,
          lamports: _lamports,
        }),
      );
      return await this.base.intoVersionedTransaction(tx, txOptions);
    }

    const vaultAta = this.base.getAta(WSOL, vault);
    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        vaultAta,
        vault,
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
    glamState: PublicKey,
    asset: PublicKey | string,
    amount: number | BN,
    txOptions: TxOptions = {} as TxOptions,
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawTx(
      glamState,
      new PublicKey(asset),
      amount,
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async depositTx(
    statePda: PublicKey,
    asset: PublicKey,
    amount: number | BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const signer = txOptions.signer || this.base.getSigner();
    const vault = this.base.getVaultPda(statePda);

    const { mint, tokenProgram } = await this.base.fetchMintWithOwner(asset);

    const signerAta = this.base.getAta(asset, signer, tokenProgram);
    const vaultAta = this.base.getVaultAta(statePda, asset, tokenProgram);

    const tx = new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        vaultAta,
        vault,
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
    glamState: PublicKey,
    asset: PublicKey,
    amount: number | BN,
    txOptions: TxOptions,
  ): Promise<TransactionInstruction[]> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { tokenProgram } = await this.base.fetchMintWithOwner(asset);
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
          glamState,
          glamSigner,
          asset,
          tokenProgram,
        })
        .instruction(),
    ];
  }

  public async withdrawTx(
    glamState: PublicKey,
    asset: PublicKey,
    amount: number | BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const { tokenProgram } = await this.base.fetchMintWithOwner(asset);
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
      const wrapSolIxs = await this.base.maybeWrapSol(
        glamState,
        amount,
        glamSigner,
      );
      preInstructions.push(...wrapSolIxs);
      // If we need to wrap SOL, it means the wSOL balance will be drained,
      // and we close the wSOL token account for convenience
      postInstructions.push(
        await this.closeTokenAccountIx(glamState, [
          this.base.getVaultAta(glamState, WSOL),
        ]),
      );
    }

    const tx = await this.base.program.methods
      .withdraw(new BN(amount))
      .accounts({
        glamState,
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
