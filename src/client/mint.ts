import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { BaseClient, BaseTxBuilder, TokenAccount, TxOptions } from "./base";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  TOKEN_2022_PROGRAM_ID,
  unpackAccount,
} from "@solana/spl-token";
import {
  MintIdlModel,
  RequestType,
  StateAccountType,
  StateIdlModel,
} from "../models";
import { TRANSFER_HOOK_PROGRAM } from "../constants";
import { fetchMintAndTokenProgram } from "../utils/accounts";
import { getAccountPolicyPda, getStatePda } from "../utils/glamPDAs";
import { ClusterNetwork } from "../clientConfig";
import { charsToName } from "../utils/common";
import { BN } from "@coral-xyz/anchor";
import { UpdateStateParams } from "./state";

export type InitMintParams = {
  accountType: StateAccountType;
  name: number[];
  symbol: string;
  uri: string;
  baseAssetMint: PublicKey;
  decimals?: number;
} & Partial<MintIdlModel>;

export type UpdateMintParams = {
  permanentDelegate?: PublicKey;
  defaultAccountStateFrozen?: boolean;
  lockupPeriod?: number;
  maxCap?: BN;
  minSubscription?: BN;
  minRedemption?: BN;
  allowlist?: PublicKey[];
  blocklist?: PublicKey[];
};

class MintTxBuilder extends BaseTxBuilder {
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
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
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
   * Freezes or unfreezes token accounts
   *
   * @param tokenAccounts List of token accounts to freeze or unfreeze
   * @param frozen If true, the token accounts will be frozen; otherwise, they will be unfrozen
   * @param txOptions
   */
  public async setTokenAccountsStates(
    tokenAccounts: PublicKey[],
    frozen: boolean,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
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

    return await this.base.intoVersionedTransaction(tx, txOptions);
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
  ): Promise<VersionedTransaction> {
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

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  /**
   * Burns tokens from a token account
   *
   * @param from Owner of the token account
   * @param amount Amount of tokens to burn
   * @param forceThaw If true, automatically unfree the token account before burning
   * @param txOptions
   */
  public async burn(
    from: PublicKey,
    amount: BN,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const fromAta = this.base.getMintAta(from);

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
            { pubkey: fromAta, isSigner: false, isWritable: true },
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
        fromTokenAccount: fromAta,
        from,
      })
      .preInstructions(preInstructions)
      .transaction();

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }

  /**
   * Transfers tokens from one token account to another
   *
   * @param from Owner of the sender token account
   * @param to Owner of the recipient token account
   * @param amount Amount of tokens to transfer
   * @param forceThaw If true, automatically unfree the token accounts before transfer
   * @param txOptions
   */
  public async forceTransfer(
    from: PublicKey,
    to: PublicKey,
    amount: BN,
    forceThaw: boolean = false,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.signer;
    const fromAta = this.base.getMintAta(from);
    const toAta = this.base.getMintAta(to);

    const preInstructions = [];
    preInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        this.base.signer,
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
        fromTokenAccount: fromAta,
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

    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}

class TxBuilder extends BaseTxBuilder {
  public async initialize(
    initMintParams: InitMintParams,
    stateParams: UpdateStateParams | null,
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.signer;

    const decimals: number | null =
      typeof initMintParams.decimals === "number"
        ? initMintParams.decimals
        : null;

    const stateInitKey = [
      ...Buffer.from(
        anchor.utils.sha256.hash(charsToName(initMintParams.name)),
      ).subarray(0, 8),
    ];
    const statePda = getStatePda(
      stateInitKey,
      glamSigner,
      this.base.protocolProgram.programId,
    );

    const postInstructions = txOptions.postInstructions || [];

    // If stateParams is provided and is not empty, update the state account as a post instruction
    if (stateParams && Object.keys(stateParams).length > 0) {
      const updateStateIx = await this.base.protocolProgram.methods
        .updateState(new StateIdlModel(stateParams))
        .accounts({
          glamState: statePda,
          glamSigner,
        })
        .instruction();
      postInstructions.push(updateStateIx);
    }

    try {
      this.base.statePda = statePda;
      const tx = await this.base.mintProgram.methods
        .initializeMint(
          new MintIdlModel(initMintParams), // acconType, baseAssetMint, and decmials are dropped,
          stateInitKey,
          initMintParams.accountType,
          decimals,
        )
        .accounts({
          glamState: this.base.statePda,
          signer: txOptions.signer || this.base.signer,
          newMint: this.base.mintPda,
          extraMetasAccount: this.base.extraMetasPda,
          baseAssetMint: initMintParams.baseAssetMint,
        })
        .postInstructions(postInstructions)
        .transaction();
      return await this.base.intoVersionedTransaction(tx, txOptions);
    } catch (error) {
      // @ts-ignore force resetting statePda to undefined
      this.base.statePda = undefined;
      throw error;
    }
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
        glamSigner: txOptions.signer || this.base.signer,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async pauseSubscription(txOptions: TxOptions = {}) {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.mintProgram.methods
      .emergencyUpdateMint({
        requestType: RequestType.SUBSCRIPTION,
        setPaused: true,
      })
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        glamSigner,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async unpauseSubscription(txOptions: TxOptions = {}) {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.mintProgram.methods
      .emergencyUpdateMint({
        requestType: RequestType.SUBSCRIPTION,
        setPaused: false,
      })
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        glamSigner,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async pauseRedemption(txOptions: TxOptions = {}) {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.mintProgram.methods
      .emergencyUpdateMint({
        requestType: RequestType.REDEMPTION,
        setPaused: true,
      })
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        glamSigner,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async unpauseRedemption(txOptions: TxOptions = {}) {
    const glamSigner = txOptions.signer || this.base.signer;
    const tx = await this.base.mintProgram.methods
      .emergencyUpdateMint({
        requestType: RequestType.REDEMPTION,
        setPaused: false,
      })
      .accounts({
        glamState: this.base.statePda,
        glamMint: this.base.mintPda,
        glamSigner,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, txOptions);
    return vTx;
  }

  public async closeMintIx(signer?: PublicKey) {
    return await this.base.mintProgram.methods
      .closeMint()
      .accounts({
        glamState: this.base.statePda,
        glamSigner: signer || this.base.signer,
        glamMint: this.base.mintPda,
        extraMetasAccount: this.base.extraMetasPda,
      })
      .instruction();
  }

  public async closeMint(txOptions: TxOptions = {}) {
    const ix = await this.closeMintIx(txOptions.signer);
    const tx = this.build(ix, txOptions);
    return await this.base.intoVersionedTransaction(tx, txOptions);
  }
}

export class MintClient {
  public readonly mintTxBuilder: MintTxBuilder;
  public readonly txBuilder: TxBuilder;

  public constructor(readonly base: BaseClient) {
    this.mintTxBuilder = new MintTxBuilder(base);
    this.txBuilder = new TxBuilder(base);
  }

  /**
   * Fetches token holders of the GLAM mint using helius RPC
   */
  public async fetchTokenHolders(
    showZeroBalance: boolean = true,
  ): Promise<TokenAccount[]> {
    // `getTokenAccounts` is a helius only RPC endpoint, we hardcode the URL here
    // in case users choose to use a non-helius RPC. Fall back to getHolders if
    // helius API key is not provided

    const heliusApiKey =
      process.env.NEXT_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY;
    if (!heliusApiKey || this.base.cluster !== ClusterNetwork.Mainnet) {
      return await this.getHolders(showZeroBalance);
    }

    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`,
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

    const { mint, tokenProgram } = await fetchMintAndTokenProgram(
      this.base.provider.connection,
      this.base.mintPda,
    );

    return tokenAccounts.map((ta: any) => ({
      owner: new PublicKey(ta.owner),
      pubkey: new PublicKey(ta.address),
      mint: this.base.mintPda,
      programId: tokenProgram,
      decimals: mint.decimals,
      amount: ta.amount,
      uiAmount: Number(ta.amount) / 10 ** mint.decimals,
      frozen: ta.frozen,
    }));
  }

  // Can be very slow. Use fetchTokenHolders when possible.
  public async getHolders(
    showZeroBalance: boolean = true,
  ): Promise<TokenAccount[]> {
    const connection = this.base.provider.connection;

    // FIXME: enable dataSize filter
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
    const { mint, tokenProgram } = await fetchMintAndTokenProgram(
      this.base.provider.connection,
      this.base.mintPda,
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
          programId: tokenProgram,
          decimals: mint.decimals,
          amount: tokenAccount.amount.toString(),
          uiAmount: Number(tokenAccount.amount) / 10 ** mint.decimals,
          frozen: tokenAccount.isFrozen,
        } as TokenAccount;
      })
      .filter((ta) => showZeroBalance || ta.uiAmount > 0);
  }

  public async initialize(
    initMintParams: InitMintParams,
    txOptions: TxOptions = {},
  ) {
    const vTx = await this.txBuilder.initialize(
      initMintParams,
      null,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  public async initializeWithStateParams(
    initMintParams: InitMintParams,
    stateParams: UpdateStateParams,
    txOptions: TxOptions = {},
  ) {
    const vTx = await this.txBuilder.initialize(
      initMintParams,
      stateParams,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  public async update(
    mintModel: Partial<MintIdlModel>,
    txOptions: TxOptions = {},
  ) {
    const vTx = await this.txBuilder.update(mintModel, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async pauseSubscription(txOptions: TxOptions = {}) {
    const vTx = await this.txBuilder.pauseSubscription(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async unpauseSubscription(txOptions: TxOptions = {}) {
    const vTx = await this.txBuilder.unpauseSubscription(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async pauseRedemption(txOptions: TxOptions = {}) {
    const vTx = await this.txBuilder.pauseRedemption(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async unpauseRedemption(txOptions: TxOptions = {}) {
    const vTx = await this.txBuilder.unpauseRedemption(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async close(txOptions: TxOptions = {}) {
    const vTx = await this.txBuilder.closeMint(txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async mint(
    to: PublicKey,
    amount: BN | number,
    unfreeze: boolean = false,
    txOptions: TxOptions = {},
  ) {
    const vTx = await this.mintTxBuilder.mint(to, amount, unfreeze, txOptions);
    return await this.base.sendAndConfirm(vTx);
  }

  public async burn(
    from: PublicKey,
    amount: BN | number,
    unfreeze: boolean = false,
    txOptions: TxOptions = {},
  ) {
    const vTx = await this.mintTxBuilder.burn(
      from,
      amount,
      unfreeze,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  public async createTokenAccount(
    owner: PublicKey,
    setFrozen: boolean,
    txOptions: TxOptions = {},
  ) {
    const vTx = await this.mintTxBuilder.createTokenAccount(
      owner,
      setFrozen,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  public async setTokenAccountsStates(
    tokenAccounts: PublicKey[],
    frozen: boolean,
    txOptions: TxOptions = {},
  ) {
    const vTx = await this.mintTxBuilder.setTokenAccountsStates(
      tokenAccounts,
      frozen,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }

  public async forceTransfer(
    from: PublicKey,
    to: PublicKey,
    amount: BN | number,
    unfreeze: boolean = false,
    txOptions: TxOptions = {},
  ) {
    const vTx = await this.mintTxBuilder.forceTransfer(
      from,
      to,
      amount,
      unfreeze,
      txOptions,
    );
    return await this.base.sendAndConfirm(vTx);
  }
}
