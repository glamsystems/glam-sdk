import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction, TransactionSignature } from "@solana/web3.js";
import { BaseClient, TokenAccount, TxOptions } from "./base";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";
import { MintIdlModel, MintModel, StateAccountType } from "../models";
import { SEED_STATE, TRANSFER_HOOK_PROGRAM } from "../constants";
import { getAccountPolicyPda } from "../utils/glamPDAs";
import { ClusterNetwork } from "../clientConfig";

export class MintClient {
  public constructor(readonly base: BaseClient) {}

  /**
   * Fetches token holders of the GLAM mint
   */
  public async fetchTokenHolders(
    showZeroBalance: boolean = true,
  ): Promise<TokenAccount[]> {
    // `getTokenAccounts` is a helius only RPC endpoint, we hardcode the URL here
    // in case users choose to use a non-helius RPC
    // Fall back to getHolders if helius API key is not provided

    const heliusApiKey =
      process.env.NEXT_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      return await this.getHolders(showZeroBalance);
    }

    const cluster =
      this.base.cluster === ClusterNetwork.Mainnet ? "mainnet" : "devnet";
    const response = await fetch(
      `https://${cluster}.helius-rpc.com/?api-key=${heliusApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getTokenAccounts",
          params: {
            mint: this.base.mintPda.toBase58(),
            options: { showZeroBalance },
          },
        }),
      },
    );

    const data = await response.json();
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

  // Can be very slow. Use fetchTokenHolders when possible.
  // FIXME: enable dataSize filter
  public async getHolders(
    showZeroBalance: boolean = true,
  ): Promise<TokenAccount[]> {
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
    return accounts
      .map((a) => {
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
      })
      .filter((ta) => showZeroBalance || ta.uiAmount > 0);
  }

  public async initialize(
    mintModel: Partial<MintModel>,
    accountType: StateAccountType,
    txOptions: TxOptions = {},
  ) {
    if (!mintModel.name) {
      throw new Error("Mint name must be specified");
    }

    let glamMintDecimals = 9;
    let baseAssetTokenProgram: PublicKey | null = null;
    if (StateAccountType.equals(accountType, StateAccountType.FUND)) {
      if (!mintModel.asset) {
        throw new Error("Mint asset must be specified for account type FUND");
      }
      // Set glam mint decimals to the same as deposit asset
      const { mint, tokenProgram } = await this.base.fetchMintAndTokenProgram(
        mintModel.asset,
      );
      glamMintDecimals = mint.decimals;
      baseAssetTokenProgram = tokenProgram;
    }

    const stateInitKey = [
      ...Buffer.from(anchor.utils.sha256.hash(mintModel.name)).subarray(0, 8),
    ];
    const [statePda, _] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEED_STATE),
        this.base.signer.toBuffer(),
        Uint8Array.from(stateInitKey),
      ],
      this.base.protocolProgram.programId, // state account owner is the protocol program
    );
    this.base.statePda = statePda;

    const tx = await this.base.mintProgram.methods
      .initializeMint(
        new MintIdlModel(mintModel),
        stateInitKey,
        accountType,
        glamMintDecimals,
      )
      .accounts({
        glamState: this.base.statePda,
        signer: this.base.signer,
        newMint: this.base.mintPda,
        extraMetasAccount: this.base.extraMetasPda,
        baseAssetMint: mintModel.asset,
        baseAssetTokenProgram,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async update(
    mintModel: Partial<MintIdlModel>,
    txOptions: TxOptions = {},
  ) {
    const tx = await this.base.mintProgram.methods
      .updateMint(new MintIdlModel(mintModel))
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async updateApplyTimelock(txOptions: TxOptions = {}) {
    const tx = await this.base.mintProgram.methods
      .updateMintApplyTimelock()
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
    const tx = await this.base.mintProgram.methods
      .emergencyUpdateMint(new MintIdlModel(mintModel))
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async closeMintIx() {
    return await this.base.mintProgram.methods
      .closeMint()
      .accounts({
        glamState: this.base.statePda,
        glamSigner: this.base.signer,
        glamMint: this.base.mintPda,
        extraMetasAccount: this.base.extraMetasPda,
      })
      .instruction();
  }

  public async close(txOptions: TxOptions = {}) {
    const ixs = txOptions.preInstructions || [];
    ixs.push(await this.closeMintIx());

    const tx = new Transaction();
    tx.add(...ixs);

    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Creates a glam mint token account
   *
   * @param owner Owner of the token account
   * @param setFrozen If true, the token account will be frozen immediately
   * @param txOptions
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
   * Freezes or unfreezes token accounts of a glam mint
   *
   * @param tokenAccounts List of token accounts to freeze or unfreeze
   * @param frozen If true, the token accounts will be frozen; otherwise, they will be unfrozen
   * @param txOptions
   */
  public async setTokenAccountsStates(
    tokenAccounts: PublicKey[],
    frozen: boolean,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.mintProgram.methods
      .setTokenAccountsStates(frozen)
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
   * Mints tokens to recipient. Token account will be created if it does not exist.
   *
   * @param recipient Recipient public key
   * @param amount Amount of tokens to mint
   * @param forceThaw If true, automatically unfreeze the token account before minting
   * @param txOptions
   */
  public async mint(
    recipient: PublicKey,
    amount: anchor.BN,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamSigner = txOptions.signer || this.base.signer;
    const mintTo = this.base.getMintAta(recipient);

    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        glamSigner,
        mintTo,
        recipient,
        this.base.mintPda,
        TOKEN_2022_PROGRAM_ID,
      ),
    ];
    if (forceThaw) {
      preInstructions.push(
        await this.base.mintProgram.methods
          .setTokenAccountsStates(false)
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

    const tx = await this.base.mintProgram.methods
      .mintTokens(amount)
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
   * Burns tokens from a token account
   *
   * @param amount Amount of tokens to burn
   * @param from Owner of the token account
   * @param forceThaw If true, automatically unfree the token account before burning
   * @param txOptions
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
        await this.base.mintProgram.methods
          .setTokenAccountsStates(false)
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

    const tx = await this.base.mintProgram.methods
      .burnTokens(amount)
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
   * Transfers tokens from one token account to another
   *
   * @param amount Amount of tokens to transfer
   * @param from Owner of the sender token account
   * @param to Owner of the recipient token account
   * @param forceThaw If true, automatically unfree the token accounts before transfer
   * @param txOptions
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
        await this.base.mintProgram.methods
          .setTokenAccountsStates(false)
          .accounts({
            glamState: this.base.statePda,
            glamSigner,
            glamMint: this.base.mintPda,
          })
          .remainingAccounts([
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
      const fromPolicy = getAccountPolicyPda(fromAta);
      const toPolicy = getAccountPolicyPda(toAta);
      toPolicyAccount = toPolicy;
      remainingAccounts.push(
        ...[extraMetasAccount, fromPolicy, toPolicy, TRANSFER_HOOK_PROGRAM],
      );
    }
    const tx = await this.base.mintProgram.methods
      .forceTransferTokens(amount)
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
