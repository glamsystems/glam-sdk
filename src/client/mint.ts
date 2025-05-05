import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { BaseClient, TokenAccount, TxOptions } from "./base";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";
import { MintIdlModel, MintModel } from "../models";
import { TRANSFER_HOOK_PROGRAM } from "../constants";
import { getAccountPolicyPda } from "../utils/glamPDAs";
import { ClusterNetwork } from "../clientConfig";

export class MintClient {
  public constructor(readonly base: BaseClient) {}

  // `getTokenAccounts` is a helius only RPC endpoint, we have to hardcode the URL here
  // We cannot use NEXT_PUBLIC_SOLANA_RPC because users may choose to use a non-helius RPC
  public async fetchTokenHolders(): Promise<TokenAccount[]> {
    if (!process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
      return await this.getHolders();
    }

    const cluster =
      this.base.cluster === ClusterNetwork.Mainnet ? "mainnet" : "devnet";
    const response = await fetch(
      `https://${cluster}.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getTokenAccounts",
          params: {
            mint: this.base.mintPda.toBase58(),
            options: { showZeroBalance: true },
          },
        }),
      },
    );

    const data = await response.json();
    console.log("Fetched token holders:", data.result);

    const { token_accounts: tokenAccounts } = data.result;

    return tokenAccounts.map((ta: any) => ({
      owner: new PublicKey(ta.owner),
      pubkey: new PublicKey(ta.address),
      mint: this.base.mintPda,
      programId: TOKEN_2022_PROGRAM_ID,
      decimals: 9,
      amount: ta.amount,
      uiAmount: Number(ta.amount) / 10 ** 9,
      frozen: ta.frozen,
    }));
  }

  // Much slower than fetchTokenHolders.
  // Use fetchTokenHolders instead when possible.
  public async getHolders(): Promise<TokenAccount[]> {
    const connection = this.base.provider.connection;

    // dataSize varies due to different sets of extensions enabled
    // const dataSize = 175;
    const accounts = await connection.getProgramAccounts(
      TOKEN_2022_PROGRAM_ID,
      {
        filters: [
          // { dataSize },
          { memcmp: { offset: 0, bytes: this.base.mintPda.toBase58() } },
        ],
      },
    );
    return accounts.map((a) => {
      const { pubkey, account } = a;
      const tokenAccount = unpackAccount(
        pubkey,
        account,
        TOKEN_2022_PROGRAM_ID,
      );
      return {
        owner: tokenAccount.owner,
        pubkey: tokenAccount.address,
        mint: tokenAccount.mint,
        programId: TOKEN_2022_PROGRAM_ID,
        decimals: 9, // always 9 for glam mint
        amount: tokenAccount.amount.toString(),
        uiAmount: Number(tokenAccount.amount) / 10 ** 9,
        frozen: tokenAccount.isFrozen,
      } as TokenAccount;
    });
  }

  public async update(
    mintModel: Partial<MintModel>,
    txOptions: TxOptions = {},
  ) {
    const tx = await this.base.program.methods
      .updateMint(0, new MintIdlModel(mintModel))
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async updateApplyTimelock(txOptions: TxOptions = {}) {
    const tx = await this.base.program.methods
      .updateMintApplyTimelock(0)
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async emergencyUpdate(
    mintModel: Partial<MintModel>,
    txOptions: TxOptions = {},
  ) {
    const tx = await this.base.program.methods
      .emergencyUpdateMint(0, new MintIdlModel(mintModel))
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async closeMintIx() {
    return await this.base.program.methods
      .closeMint(0)
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        extraMetasAccount: this.base.extraMetasPda,
      })
      .instruction();
  }

  public async closeMint(txOptions: TxOptions = {}) {
    const glamSigner = txOptions.signer || this.base.getSigner();

    const tx = await this.base.program.methods
      .closeMint(0)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        glamMint: this.base.mintPda,
        extraMetasAccount: this.base.extraMetasPda,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Create a glam mint token account for the specified user
   *
   * @param owner Owner of the token account
   * @param setFrozen If true, the token account will be frozen
   * @param txOptions
   * @returns Transaction signature
   */
  public async createTokenAccount(
    owner: PublicKey,
    setFrozen: boolean = true,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.mintPda;
    const ata = this.base.getMintAta(owner);
    const ixCreateAta = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      ata,
      owner,
      glamMint,
      TOKEN_2022_PROGRAM_ID,
    );
    return await this.setTokenAccountsStates([ata], setFrozen, {
      preInstructions: [ixCreateAta],
      ...txOptions,
    });
  }

  /**
   * Freeze or unfreeze token accounts of a glam mint
   *
   * @param tokenAccounts List of token accounts to freeze or unfreeze
   * @param frozen If true, the token accounts will be frozen; otherwise, they will be unfrozen
   * @param txOptions
   * @returns Transaction signature
   */
  public async setTokenAccountsStates(
    tokenAccounts: PublicKey[],
    frozen: boolean,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.program.methods
      .setTokenAccountsStates(0, frozen)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        glamMint: this.base.mintPda,
      })
      .remainingAccounts(
        tokenAccounts.map((account) => ({
          pubkey: account,
          isSigner: false,
          isWritable: true,
        })),
      )
      .preInstructions(txOptions.preInstructions || [])
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Mint tokens to recipient. Token account will be created if it does not exist.
   *
   * @param recipient Recipient public key
   * @param amount Amount of tokens to mint
   * @param forceThaw If true, automatically unfreeze the token account before minting
   * @param txOptions
   * @returns Transaction signature
   */
  public async mint(
    recipient: PublicKey,
    amount: anchor.BN,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const mintTo = this.base.getMintAta(recipient);

    const preInstructions = [];
    preInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        mintTo,
        recipient,
        this.base.mintPda,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    if (forceThaw) {
      preInstructions.push(
        await this.base.program.methods
          .setTokenAccountsStates(0, false)
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            glamMint: this.base.mintPda,
          })
          .remainingAccounts([
            { pubkey: mintTo, isSigner: false, isWritable: true },
          ])
          .instruction(),
      );
    }

    let policyAccount = (await this.base.isLockupEnabled())
      ? getAccountPolicyPda(mintTo)
      : null;

    // @ts-ignore
    const tx = await this.base.program.methods
      .mintTokens(0, amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        glamMint: this.base.mintPda,
        recipient,
        policyAccount,
      })
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Burn tokens from a token account
   *
   * @param amount Amount of tokens to burn
   * @param from Owner of the token account
   * @param forceThaw If true, automatically unfree the token account before burning
   * @param txOptions
   * @returns Transaction signature
   */
  public async burn(
    amount: anchor.BN,
    from: PublicKey,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const ata = this.base.getMintAta(from);

    const preInstructions = [];
    if (forceThaw) {
      preInstructions.push(
        await this.base.program.methods
          .setTokenAccountsStates(0, false)
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            glamMint: this.base.mintPda,
          })
          .remainingAccounts([
            { pubkey: ata, isSigner: false, isWritable: true },
          ])
          .instruction(),
      );
    }

    const tx = await this.base.program.methods
      .burnTokens(0, amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        glamMint: this.base.mintPda,
        from,
      })
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Transfer tokens from one token account to another
   *
   * @param amount Amount of tokens to transfer
   * @param from Owner of the sender token account
   * @param to Owner of the recipient token account
   * @param forceThaw If true, automatically unfree the token accounts before transfer
   * @param txOptions
   * @returns
   */
  public async forceTransfer(
    amount: anchor.BN,
    from: PublicKey,
    to: PublicKey,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const fromAta = this.base.getMintAta(from);
    const toAta = this.base.getMintAta(to);

    const preInstructions = [];
    preInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        this.base.getSigner(),
        toAta,
        to,
        this.base.mintPda,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    if (forceThaw) {
      preInstructions.push(
        await this.base.program.methods
          .setTokenAccountsStates(0, false)
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            glamMint: this.base.mintPda,
          })
          .remainingAccounts([
            // fromAta is already unfrozen, still add it to test the ix is idempotent
            { pubkey: fromAta, isSigner: false, isWritable: true },
            { pubkey: toAta, isSigner: false, isWritable: true },
          ])
          .instruction(),
      );
    }

    const remainingAccounts: PublicKey[] = [];
    let toPolicyAccount = null;
    if (await this.base.isLockupEnabled()) {
      const extraMetasAccount = this.base.extraMetasPda;
      const fromPolicy = getAccountPolicyPda(this.base.getMintAta(from));
      const toPolicy = getAccountPolicyPda(this.base.getMintAta(to));
      toPolicyAccount = toPolicy;
      remainingAccounts.push(
        ...[extraMetasAccount, fromPolicy, toPolicy, TRANSFER_HOOK_PROGRAM],
      );
    }
    const tx = await this.base.program.methods
      .forceTransferTokens(0, amount)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        glamMint: this.base.mintPda,
        from,
        to,
        toPolicyAccount,
      })
      .remainingAccounts(
        remainingAccounts.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
      )
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }
}
