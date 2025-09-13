import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  VersionedTransaction,
  TransactionSignature,
  TransactionInstruction,
  Transaction,
  SystemProgram,
} from "@solana/web3.js";

import { BaseClient, TxOptions } from "./base";
import { WSOL } from "../constants";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  createTransferCheckedInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";

export class VaultClient {
  public constructor(readonly base: BaseClient) {}

  /*
   * Client methods
   */

  public async wrap(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.wrapTx(amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async unwrap(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.unwrapTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async systemTransfer(
    amount: BN | number,
    to: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.systemTransferTx(
      new BN(amount),
      new PublicKey(to),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  public async closeTokenAccounts(
    tokenAccounts: PublicKey[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.closeTokenAccountsTx(tokenAccounts, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

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

  public async withdraw(
    asset: PublicKey | string,
    amount: number | BN,
    txOptions: TxOptions = {} as TxOptions,
  ): Promise<TransactionSignature> {
    const tx = await this.withdrawTx(new PublicKey(asset), amount, txOptions);
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

  public async systemTransferTx(
    amount: BN,
    to: PublicKey,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();

    // @ts-ignore
    const tx = await this.base.program.methods
      .systemTransfer(amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        to,
      })
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  /**
   * Returns an instruction that closes multiple vault token accounts
   * All token accounts must be owned by the same token program
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
    txOptions: TxOptions = {},
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

    const tx = await this.base.program.methods
      .withdraw(new BN(amount))
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        asset,
        tokenProgram,
      })
      .preInstructions(preInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}
