import * as anchor from "@coral-xyz/anchor";
import { PublicKey, TransactionSignature } from "@solana/web3.js";
import { BaseClient, TokenAccount, TxOptions } from "./base";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";

export class MintClient {
  public constructor(readonly base: BaseClient) {}

  // `getTokenAccounts` is a helius only RPC endpoint, we have to hardcode the URL here
  // We cannot use NEXT_PUBLIC_SOLANA_RPC because users may choose to use a non-helius RPC
  public async fetchTokenHolders(state: PublicKey): Promise<TokenAccount[]> {
    const mint = this.base.getMintPda(state, 0);
    const response = await fetch(
      `https://${this.base.cluster}.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getTokenAccounts",
          params: {
            mint: mint.toBase58(),
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
      mint,
      programId: TOKEN_2022_PROGRAM_ID,
      decimals: 9,
      amount: ta.amount,
      uiAmount: Number(ta.amount) / 10 ** 9,
      frozen: ta.frozen,
    }));
  }

  // Much slower than fetchTokenHolders.
  // Use fetchTokenHolders instead when possible.
  public async getHolders(state: PublicKey, mintId: number = 0) {
    const mintPda = this.base.getMintPda(state, mintId);
    const connection = this.base.provider.connection;
    let mint;
    try {
      mint = await getMint(
        connection,
        mintPda,
        connection.commitment,
        TOKEN_2022_PROGRAM_ID,
      );
    } catch (e) {
      return [];
    }

    // Size of a glam mint with perment delegate extension enabled
    const dataSize = 175;
    const accounts = await connection.getProgramAccounts(
      TOKEN_2022_PROGRAM_ID,
      {
        filters: [
          { dataSize },
          { memcmp: { offset: 0, bytes: mintPda.toBase58() } },
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
        decimals: mint.decimals,
        amount: tokenAccount.amount.toString(),
        uiAmount: Number(tokenAccount.amount) / 10 ** mint.decimals,
        frozen: tokenAccount.isFrozen,
      } as TokenAccount;
    });
  }

  public async closeMintIx(glamState: PublicKey, mintId: number = 0) {
    const glamMint = this.base.getMintPda(glamState, mintId);
    const extraMetasAccount = this.base.getExtraMetasPda(glamState, mintId);

    // @ts-ignore
    return await this.base.program.methods
      .closeMint(mintId)
      .accounts({
        glamState,
        glamMint,
        extraMetasAccount,
      })
      .instruction();
  }

  public async closeMint(
    glamState: PublicKey,
    mintId: number = 0,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);
    const extraMetasAccount = this.base.getExtraMetasPda(glamState, mintId);

    // @ts-ignore
    const tx = await this.base.program.methods
      .closeMint(mintId)
      .accounts({
        glamState,
        glamSigner,
        glamMint,
        extraMetasAccount,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Create a share class token account for a specific user
   *
   * @param glamState
   * @param owner
   * @param mintId
   * @param txOptions
   * @returns
   */
  public async createTokenAccount(
    glamState: PublicKey,
    owner: PublicKey,
    mintId: number = 0,
    setFrozen: boolean = true,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);
    const ata = this.base.getMintAta(owner, glamMint);
    const ixCreateAta = createAssociatedTokenAccountIdempotentInstruction(
      glamSigner,
      ata,
      owner,
      glamMint,
      TOKEN_2022_PROGRAM_ID,
    );
    return await this.setTokenAccountsStates(
      glamState,
      mintId,
      [ata],
      setFrozen,
      {
        preInstructions: [ixCreateAta],
        ...txOptions,
      },
    );
  }

  /**
   * Freeze or thaw token accounts of a share class
   *
   * @param glamState
   * @param mintId
   * @param frozen
   * @param txOptions
   * @returns
   */
  public async setTokenAccountsStates(
    glamState: PublicKey,
    mintId: number,
    tokenAccounts: PublicKey[],
    frozen: boolean,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);
    const tx = await this.base.program.methods
      .setTokenAccountsStates(mintId, frozen)
      .accounts({
        glamState,
        glamSigner,
        glamMint,
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
   * Mint share to recipient
   *
   * @param glamState
   * @param mintId
   * @param recipient Recipient's wallet address
   * @param amount Amount of shares to mint
   * @param forceThaw If true, force unfreezing token account before minting
   * @param txOptions
   * @returns Transaction signature
   */
  public async mint(
    glamState: PublicKey,
    mintId: number,
    recipient: PublicKey,
    amount: anchor.BN,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);
    const mintTo = this.base.getMintAta(recipient, glamMint);

    const preInstructions = [];
    preInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        mintTo,
        recipient,
        glamMint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    if (forceThaw) {
      preInstructions.push(
        await this.base.program.methods
          .setTokenAccountsStates(mintId, false)
          .accounts({
            glamState,
            glamSigner,
            glamMint,
          })
          .remainingAccounts([
            { pubkey: mintTo, isSigner: false, isWritable: true },
          ])
          .instruction(),
      );
    }

    const tx = await this.base.program.methods
      .mintTokens(0, amount)
      .accounts({
        glamState,
        glamSigner,
        glamMint,
        recipient,
      })
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async burn(
    glamState: PublicKey,
    mintId: number,
    amount: anchor.BN,
    from: PublicKey,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);
    const ata = this.base.getMintAta(from, glamMint);

    const preInstructions = [];
    if (forceThaw) {
      preInstructions.push(
        await this.base.program.methods
          .setTokenAccountsStates(mintId, false)
          .accounts({
            glamState,
            glamSigner,
            glamMint,
          })
          .remainingAccounts([
            { pubkey: ata, isSigner: false, isWritable: true },
          ])
          .instruction(),
      );
    }

    const tx = await this.base.program.methods
      .burnTokens(mintId, amount)
      .accounts({
        glamState,
        glamSigner,
        glamMint,
        from,
      })
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async forceTransfer(
    glamState: PublicKey,
    mintId: number,
    amount: anchor.BN,
    from: PublicKey,
    to: PublicKey,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const glamMint = this.base.getMintPda(glamState, mintId);
    const fromAta = this.base.getMintAta(from, glamMint);
    const toAta = this.base.getMintAta(to, glamMint);

    const preInstructions = [];
    preInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        this.base.getSigner(),
        toAta,
        to,
        glamMint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
    if (forceThaw) {
      preInstructions.push(
        await this.base.program.methods
          .setTokenAccountsStates(mintId, false)
          .accounts({
            glamState,
            glamSigner,
            glamMint,
          })
          .remainingAccounts([
            // fromAta is already unfrozen, still add it to test the ix is idempotent
            { pubkey: fromAta, isSigner: false, isWritable: true },
            { pubkey: toAta, isSigner: false, isWritable: true },
          ])
          .instruction(),
      );
    }

    const tx = await this.base.program.methods
      .forceTransferTokens(mintId, amount)
      .accounts({
        glamState,
        glamSigner,
        glamMint,
        from,
        to,
      })
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }
}
