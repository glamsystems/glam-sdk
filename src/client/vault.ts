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

  /**
   * Wraps vault SOL to wSOL
   *
   * @param amount
   * @param txOptions
   */
  public async wrap(
    amount: BN | number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.wrapTx(new BN(amount), txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Unwraps vault wSOL to SOL
   *
   * @param txOptions
   */
  public async unwrap(
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.unwrapTx(txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Transfers SOL from vault to another account
   *
   * @param amount
   * @param to
   * @param txOptions
   */
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

  /**
   * Transfers token from vault to another account
   *
   * @param mint
   * @param amount
   * @param txOptions
   */
  public async tokenTransfer(
    mint: PublicKey | string,
    amount: number | BN,
    to: PublicKey | string,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.tokenTransferTx(
      new PublicKey(mint),
      amount,
      new PublicKey(to),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Closes multiple vault token accounts
   *
   * @param tokenAccounts
   * @param txOptions
   */
  public async closeTokenAccounts(
    tokenAccounts: PublicKey[] | string[],
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.closeTokenAccountsTx(
      tokenAccounts.map((pubkey) => new PublicKey(pubkey)),
      txOptions,
    );
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Deposits token to vault
   *
   * @param mint Token mint
   * @param amount
   * @param txOptions
   */
  public async deposit(
    mint: PublicKey | string,
    amount: number | BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositTx(new PublicKey(mint), amount, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /**
   * Deposits SOL to vault
   *
   * @param lamports
   * @param wrap Whether to wrap SOL to wSOL or not
   * @param txOptions
   */
  public async depositSol(
    lamports: number | BN,
    wrap = true,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.depositSolTx(lamports, wrap, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async wrapTx(
    amount: BN,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const to = this.base.getVaultAta(WSOL);

    const tx = await this.base.protocolProgram.methods
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

    const tx = await this.base.extSplProgram.methods
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

    const tx = await this.base.protocolProgram.methods
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
   * Returns an instruction that closes the specified vault token account
   */
  public async closeTokenAccountIx(
    tokenAccount: PublicKey,
    tokenProgram: PublicKey = TOKEN_PROGRAM_ID,
    txOptions: TxOptions,
  ): Promise<TransactionInstruction> {
    return await this.base.extSplProgram.methods
      .tokenCloseAccount()
      .accounts({
        glamState: this.base.statePda,
        glamSigner: txOptions.signer || this.base.signer,
        tokenAccount: tokenAccount,
        cpiProgram: tokenProgram,
      })
      .instruction();
  }

  public async closeTokenAccountsTx(
    pubkeys: PublicKey[],
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const accountsInfo =
      await this.base.provider.connection.getMultipleAccountsInfo(pubkeys);
    if (pubkeys.length !== accountsInfo.filter(Boolean).length) {
      throw new Error("Some token accounts do not exist");
    }

    // split token accounts into 2 arrays by owner program
    const tokenAccountsByProgram = new Map<string, PublicKey[]>([
      [TOKEN_PROGRAM_ID.toBase58(), []],
      [TOKEN_2022_PROGRAM_ID.toBase58(), []],
    ]);
    accountsInfo.forEach((accountInfo, i) => {
      [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].forEach((programId) => {
        if (accountInfo?.owner.equals(programId)) {
          tokenAccountsByProgram.get(programId.toBase58())?.push(pubkeys[i]);
        }
      });
    });

    const ixs = await Promise.all(
      Array.from(tokenAccountsByProgram.entries())
        .filter(([_, accounts]) => accounts.length > 0)
        .map(([programId, accounts]) => {
          return accounts.map((account) =>
            this.closeTokenAccountIx(
              account,
              new PublicKey(programId),
              txOptions,
            ),
          );
        })
        .flat(),
    );

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

  public async tokenTransferTx(
    mint: PublicKey,
    amount: number | BN,
    to: PublicKey,
    txOptions: TxOptions,
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const { mint: mintObj, tokenProgram } =
      await this.base.fetchMintAndTokenProgram(mint);
    const toAta = this.base.getAta(mint, to, tokenProgram);

    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        toAta,
        to,
        mint,
        tokenProgram,
      ),
    ];

    const tx = await this.base.extSplProgram.methods
      .tokenTransferChecked(new BN(amount), mintObj.decimals)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        from: this.base.getVaultAta(mint),
        to: toAta,
        mint,
        cpiProgram: tokenProgram,
      })
      .preInstructions(preInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}
