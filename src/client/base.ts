import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  AccountInfo,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  TransactionSignature,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { getSimulationResult, parseProgramLogs } from "../utils/helpers";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  getAccount,
  getAssociatedTokenAddressSync,
  unpackMint,
  Mint,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getExtensionData,
  ExtensionType,
} from "@solana/spl-token";
import { WSOL, USDC, JITO_TIP_DEFAULT, ALT_PROGRAM_ID } from "../constants";

import {
  ExtCctpProgram,
  ExtDriftProgram,
  ExtKaminoProgram,
  ExtMarinadeProgram,
  ExtSplProgram,
  ExtStakePoolProgram,
  GlamMintProgram,
  GlamProtocolProgram,
  getExtCctpProgram,
  getExtDriftProgram,
  getExtKaminoProgram,
  getExtMarinadeProgram,
  getExtSplProgram,
  getExtStakePoolProgram,
  getGlamMintProgram,
  getGlamProtocolProgram,
} from "../glamExports";
import { ClusterNetwork, GlamClientConfig } from "../clientConfig";
import {
  RequestQueue,
  StateAccount,
  StateAccountType,
  StateModel,
} from "../models";
import { AssetMeta, ASSETS_MAINNET, ASSETS_TESTS } from "./assets";
import { GlamError } from "../error";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { BlockhashWithCache } from "../utils/blockhash";
import {
  getEscrowPda,
  getExtraMetasPda,
  getMintPda,
  getOpenfundsPda,
  getRequestQueuePda,
  getVaultPda,
} from "../utils/glamPDAs";
import { TokenMetadata, unpack } from "@solana/spl-token-metadata";
import { getGlamLookupTableAccounts } from "../utils/glamApi";
import {
  DriftProtocolPolicy,
  DriftVaultsPolicy,
} from "../deser/integrationPolicies";

const DEFAULT_PRIORITY_FEE = 10_000; // microLamports
const LOOKUP_TABLES = [
  new PublicKey("284iwGtA9X9aLy3KsyV8uT2pXLARhYbiSi5SiM2g47M2"), // kamino lending
  new PublicKey("D9cnvzswDikQDf53k4HpQ3KJ9y1Fv3HGGDFYMXnK5T6c"), // drift
  new PublicKey("EiWSskK5HXnBTptiS5DH6gpAJRVNQ3cAhTKBGaiaysAb"), // drift
];

export const isBrowser =
  process.env.ANCHOR_BROWSER ||
  (typeof window !== "undefined" && !window.process?.hasOwnProperty("type"));

export type TxOptions = {
  signer?: PublicKey;
  computeUnitLimit?: number;
  getPriorityFeeMicroLamports?: (tx: VersionedTransaction) => Promise<number>;
  maxFeeLamports?: number;
  useMaxFee?: boolean;
  jitoTipLamports?: number;
  preInstructions?: TransactionInstruction[];
  lookupTables?: PublicKey[] | AddressLookupTableAccount[];
  simulate?: boolean;
};

export type TokenAccount = {
  owner: PublicKey;
  pubkey: PublicKey; // ata
  mint: PublicKey;
  programId: PublicKey;
  decimals: number;
  amount: string;
  uiAmount: number;
  frozen: boolean;
};

export class BaseClient {
  cluster: ClusterNetwork;
  provider: anchor.Provider;
  blockhashWithCache: BlockhashWithCache;

  protocolProgram: GlamProtocolProgram;
  mintProgram: GlamMintProgram;
  extSplProgram: ExtSplProgram;
  extDriftProgram: ExtDriftProgram;
  extKaminoProgram: ExtKaminoProgram;
  extMarinadeProgram: ExtMarinadeProgram;
  extStakePoolProgram: ExtStakePoolProgram;
  extCctpProgram: ExtCctpProgram;

  private _statePda?: PublicKey;

  public constructor(config?: GlamClientConfig) {
    if (config?.provider) {
      this.provider = config?.provider;
    } else {
      const defaultProvider = anchor.AnchorProvider.env();
      const url = defaultProvider.connection.rpcEndpoint;
      const connection = new Connection(url, { commitment: "confirmed" });
      this.provider = new anchor.AnchorProvider(
        connection,
        config?.wallet || defaultProvider.wallet,
        {
          ...defaultProvider.opts,
          commitment: "confirmed",
          preflightCommitment: "confirmed",
        },
      );
      anchor.setProvider(this.provider);
    }

    this.cluster = config?.cluster || this.detectedCluster;
    this.protocolProgram = getGlamProtocolProgram(this.provider);
    this.mintProgram = getGlamMintProgram(this.provider);
    this.extSplProgram = getExtSplProgram(this.provider);
    this.extDriftProgram = getExtDriftProgram(this.provider);
    this.extKaminoProgram = getExtKaminoProgram(this.provider);
    this.extMarinadeProgram = getExtMarinadeProgram(this.provider);
    this.extStakePoolProgram = getExtStakePoolProgram(this.provider);
    this.extCctpProgram = getExtCctpProgram(this.provider);

    if (config?.statePda) {
      this.statePda = config.statePda;
    }

    this.blockhashWithCache = new BlockhashWithCache(
      this.provider,
      false, // always disable browser cache (use in-memory cache instead), for in-app browser compatibility
    );
  }

  get detectedCluster(): ClusterNetwork {
    const rpcUrl = this.provider.connection.rpcEndpoint;
    if (rpcUrl.includes("devnet")) {
      return ClusterNetwork.Devnet;
    }
    if (rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1")) {
      return ClusterNetwork.Custom;
    }
    return ClusterNetwork.Mainnet;
  }

  get statePda(): PublicKey {
    if (!this._statePda) {
      throw new Error("State PDA is not specified");
    }
    return this._statePda;
  }

  set statePda(statePda: PublicKey) {
    this._statePda = statePda;
  }

  get isMainnet(): boolean {
    return this.cluster === ClusterNetwork.Mainnet;
  }

  isPhantomConnected(): boolean {
    if (!isBrowser) return false;

    // Phantom automatically estimates fees
    // https://docs.phantom.app/developer-powertools/solana-priority-fees#how-phantom-applies-priority-fees-to-dapp-transactions

    // @ts-ignore
    const isPhantom = !!window?.phantom?.solana?.isPhantom;
    // @ts-ignore
    const isConnected = !!window?.phantom?.solana?.isConnected;
    return isPhantom && isConnected;
  }

  /**
   * Get metadata of an asset for pricing
   *
   * @param assetMint Token mint of the asset
   * @returns Metadata of the asset
   */
  getAssetMeta(assetMint: string): AssetMeta {
    let assetMeta = ASSETS_MAINNET.get(assetMint);
    if (!assetMeta && !this.isMainnet) {
      assetMeta = ASSETS_TESTS.get(assetMint);
    }
    if (!assetMeta) {
      throw new Error("Invalid asset: " + assetMint);
    }
    return assetMeta;
  }

  private async getComputeBudgetIxs(
    vTx: VersionedTransaction,
    computeUnitLimit: number,
    getPriorityFeeMicroLamports?: (tx: VersionedTransaction) => Promise<number>,
    maxFeeLamports?: number,
    useMaxFee?: boolean,
  ): Promise<Array<TransactionInstruction>> {
    // ComputeBudgetProgram.setComputeUnitLimit costs 150 CUs
    // Add 20% more CUs to account for variable execution
    computeUnitLimit += 150;
    computeUnitLimit *= 1.2;

    let priorityFeeMicroLamports = DEFAULT_PRIORITY_FEE;
    if (useMaxFee && maxFeeLamports) {
      priorityFeeMicroLamports = Math.ceil(
        (maxFeeLamports * 1_000_000) / computeUnitLimit,
      );
    } else if (getPriorityFeeMicroLamports) {
      try {
        const feeEstimate = await getPriorityFeeMicroLamports(vTx);
        if (
          maxFeeLamports &&
          feeEstimate * computeUnitLimit > maxFeeLamports * 1_000_000
        ) {
          priorityFeeMicroLamports = Math.ceil(
            (maxFeeLamports * 1_000_000) / computeUnitLimit,
          );
          console.log(
            `Estimated priority fee: (${feeEstimate} microLamports per CU, ${computeUnitLimit} CUs, total ${(feeEstimate * computeUnitLimit) / 1_000_000} lamports)`,
          );
          console.log(
            `Estimated total fee is than max fee (${maxFeeLamports} lamports). Overriding priority fee to ${priorityFeeMicroLamports} microLamports.`,
          );
        } else {
          priorityFeeMicroLamports = Math.ceil(feeEstimate);
        }
      } catch (e) {}
    }

    if (process.env.NODE_ENV === "development") {
      console.log(
        `Final priority fee to use: ${priorityFeeMicroLamports} microLamports`,
      );
    }

    return [
      ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFeeMicroLamports,
      }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnitLimit }),
    ];
  }

  /**
   * Fetches lookup tables for the current GLAM instance
   */
  public async findLookupTables(): Promise<AddressLookupTableAccount[]> {
    const glamLookupTableAccounts = await getGlamLookupTableAccounts(
      this.statePda,
    );
    if (glamLookupTableAccounts.length > 0) {
      return glamLookupTableAccounts;
    }

    // Fetch all accounts owned by the ALT program
    // This is very likely to hit the RPC error "Request deprioritized due to number of accounts requested. Slow down requests or add filters to narrow down results"
    const accounts = await this.provider.connection.getProgramAccounts(
      ALT_PROGRAM_ID,
      {
        filters: [
          { memcmp: { offset: 0, bytes: bs58.encode([1, 0, 0, 0]) } },
          { memcmp: { offset: 56, bytes: this.statePda.toBase58() } }, // 1st entry in the table is the state PDA
          { memcmp: { offset: 88, bytes: this.vaultPda.toBase58() } }, // 2st entry in the table is the vault PDA
        ],
      },
    );
    return accounts.map(
      ({ pubkey, account }) =>
        new AddressLookupTableAccount({
          key: pubkey,
          state: AddressLookupTableAccount.deserialize(account.data),
        }),
    );
  }

  public async intoVersionedTransaction(
    tx: Transaction,
    {
      lookupTables = [],
      signer,
      computeUnitLimit,
      getPriorityFeeMicroLamports,
      maxFeeLamports,
      useMaxFee = false,
      jitoTipLamports,
      simulate = false,
    }: TxOptions,
  ): Promise<VersionedTransaction> {
    signer = signer || this.getSigner();

    const instructions = tx.instructions;

    // Set Jito tip if provided
    if (jitoTipLamports) {
      instructions.unshift(
        SystemProgram.transfer({
          fromPubkey: signer,
          toPubkey: JITO_TIP_DEFAULT,
          lamports: jitoTipLamports,
        }),
      );
    }

    const lookupTableAccounts: AddressLookupTableAccount[] = [];
    if (lookupTables.every((t) => t instanceof AddressLookupTableAccount)) {
      const accounts = await this.fetchAddressLookupTableAccounts([
        ...LOOKUP_TABLES,
      ]);
      lookupTableAccounts.push(...lookupTables, ...accounts);
    } else {
      const accounts = await this.fetchAddressLookupTableAccounts([
        ...lookupTables,
        ...LOOKUP_TABLES,
      ]);
      lookupTableAccounts.push(...accounts);
    }

    const glamLookupTableAccounts = await getGlamLookupTableAccounts(
      this.statePda,
    );
    lookupTableAccounts.push(...glamLookupTableAccounts);

    // console.log(
    //   "lookupTableAccounts:",
    //   lookupTableAccounts.map((t) => t.key.toBase58()),
    // );

    const recentBlockhash = (await this.blockhashWithCache.get()).blockhash;

    const { unitsConsumed, error, serializedTx } = await getSimulationResult(
      this.provider.connection,
      instructions,
      signer,
      lookupTableAccounts,
    );
    computeUnitLimit = unitsConsumed;

    // by default, a simulation error doesn't prevent the tx from being sent
    // - gui: wallet apps usually do the simulation themselves, we should ignore the simulation error here by default
    // - cli: we should set simulate=true
    if (error && simulate) {
      console.log("Tx (base64):", serializedTx);
      console.error("Simulation failed:", error.message);
      console.error(
        "If error message is too obscure, inspect and simulate the tx in explorer: https://explorer.solana.com/tx/inspector",
      );
      throw error;
    }

    if (computeUnitLimit) {
      const vTx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: signer,
          recentBlockhash,
          instructions,
        }).compileToV0Message(lookupTableAccounts),
      );
      const cuIxs = await this.getComputeBudgetIxs(
        vTx,
        computeUnitLimit,
        getPriorityFeeMicroLamports,
        maxFeeLamports,
        useMaxFee,
      );
      instructions.unshift(...cuIxs);
    }

    return new VersionedTransaction(
      new TransactionMessage({
        payerKey: signer,
        recentBlockhash,
        instructions,
      }).compileToV0Message(lookupTableAccounts),
    );
  }

  async sendAndConfirm(
    tx: VersionedTransaction | Transaction,
    additionalSigners: Keypair[] = [],
  ): Promise<TransactionSignature> {
    const connection = this.provider.connection;

    // Mainnet only: use dedicated connection for sending transactions if available
    const txConnection =
      this.cluster === ClusterNetwork.Mainnet
        ? new Connection(
            process.env?.NEXT_PUBLIC_TX_RPC ||
              process.env.TX_RPC ||
              connection.rpcEndpoint,
            {
              commitment: "confirmed",
            },
          )
        : connection;

    // This is just a convenient method so that in tests we can send legacy
    // txs, for example transfer SOL, create ATA, etc.
    if (tx instanceof Transaction) {
      return await sendAndConfirmTransaction(
        txConnection,
        tx,
        [this.wallet.payer, ...additionalSigners],
        {
          skipPreflight: true,
        },
      );
    }

    let serializedTx: Uint8Array;

    // Anchor provider.sendAndConfirm forces a signature with the wallet, which we don't want
    // https://github.com/coral-xyz/anchor/blob/v0.30.0/ts/packages/anchor/src/provider.ts#L159
    const wallet = this.getWallet();
    const signedTx = await wallet.signTransaction(tx);
    if (additionalSigners && additionalSigners.length > 0) {
      signedTx.sign(additionalSigners);
    }
    serializedTx = signedTx.serialize();

    const txSig = await txConnection.sendRawTransaction(serializedTx, {
      // skip simulation since we just did it to compute CUs
      // however this means that we need to reconstruct the error, if
      // the tx fails on chain execution.
      skipPreflight: true,
    });

    if (process.env.NODE_ENV === "development") {
      console.log("Confirming tx:", txSig);
    }

    const latestBlockhash = await this.blockhashWithCache.get();
    const res = await connection.confirmTransaction({
      ...latestBlockhash,
      signature: txSig,
    });

    // if the tx fails, throw an error including logs
    if (res.value.err) {
      const errTx = await connection.getTransaction(txSig, {
        maxSupportedTransactionVersion: 0,
      });
      throw new GlamError(
        parseProgramLogs(errTx?.meta?.logMessages),
        errTx?.meta?.err || undefined,
        errTx?.meta?.logMessages || [],
      );
    }
    return txSig;
  }

  /**
   * Fetches multiple address lookup table accounts.
   *
   * @param pubkeys Array of lookup table public keys.
   * @returns
   */
  public async fetchAddressLookupTableAccounts(
    pubkeys?: string[] | PublicKey[],
  ): Promise<AddressLookupTableAccount[]> {
    if (!pubkeys) {
      throw new Error("addressLookupTableAddresses is undefined");
    }

    if (pubkeys.length === 0) {
      return [];
    }

    const addressLookupTableAccountInfos =
      await this.provider.connection.getMultipleAccountsInfo(
        pubkeys.map((key: string | PublicKey) => new PublicKey(key)),
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const tableAddress = pubkeys[index];
      if (accountInfo) {
        const tableAccount = new AddressLookupTableAccount({
          key: new PublicKey(tableAddress),
          state: AddressLookupTableAccount.deserialize(accountInfo.data),
        });
        acc.push(tableAccount);
      }
      return acc;
    }, new Array<AddressLookupTableAccount>());
  }

  getWallet(): Wallet {
    return (this.provider as AnchorProvider).wallet as Wallet;
  }

  getSigner(): PublicKey {
    const publicKey = this.provider?.publicKey;
    if (!publicKey) {
      throw new Error(
        "Signer public key cannot be retrieved from anchor provider",
      );
    }
    return publicKey;
  }

  get signer(): PublicKey {
    return this.getSigner();
  }

  get wallet(): Wallet {
    return this.getWallet();
  }

  // derived from state pda
  get vaultPda(): PublicKey {
    return getVaultPda(this.statePda, this.protocolProgram.programId);
  }

  // derived from state pda
  get openfundsPda(): PublicKey {
    return getOpenfundsPda(this.statePda, this.protocolProgram.programId);
  }

  // derived from state pda
  get mintPda(): PublicKey {
    return getMintPda(this.statePda, 0, this.mintProgram.programId);
  }

  // derived from mint pda
  get escrowPda(): PublicKey {
    return getEscrowPda(this.mintPda, this.mintProgram.programId);
  }

  // derived from mint pda
  get extraMetasPda(): PublicKey {
    return getExtraMetasPda(this.mintPda);
  }

  // derived from mint pda
  get requestQueuePda(): PublicKey {
    return getRequestQueuePda(this.mintPda, this.mintProgram.programId);
  }

  /**
   * Fetch all the token accounts (including token program and token 2022 program) owned by the specified account.
   *
   * @param owner
   * @returns
   */
  async getTokenAccountsByOwner(owner: PublicKey): Promise<TokenAccount[]> {
    const [tokenAccounts, token2022Accounts] = await Promise.all(
      [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID].map(
        async (programId) =>
          await this.provider.connection.getParsedTokenAccountsByOwner(owner, {
            programId,
          }),
      ),
    );
    const parseTokenAccountInfo = (accountInfo: any) => {
      const accountData = accountInfo.account.data.parsed.info;
      return {
        owner,
        pubkey: new PublicKey(accountInfo.pubkey),
        mint: new PublicKey(accountData.mint),
        decimals: accountData.tokenAmount.decimals, // number
        amount: accountData.tokenAmount.amount, // string
        uiAmount: accountData.tokenAmount.uiAmount, // number
        frozen: accountData.state === "frozen",
      };
    };
    return tokenAccounts.value
      .map((accountInfo) => ({
        ...parseTokenAccountInfo(accountInfo),
        programId: TOKEN_PROGRAM_ID,
      }))
      .concat(
        token2022Accounts.value.map((accountInfo) => ({
          ...parseTokenAccountInfo(accountInfo),
          programId: TOKEN_2022_PROGRAM_ID,
        })),
      );
  }

  /**
   * Returns user's SOL and token balances
   */
  public async getSolAndTokenBalances(owner: PublicKey) {
    const balanceLamports = await this.provider.connection.getBalance(owner);
    const tokenAccounts = await this.getTokenAccountsByOwner(owner);
    const uiAmount = balanceLamports / LAMPORTS_PER_SOL;

    return {
      balanceLamports,
      uiAmount, // SOL amount
      tokenAccounts,
    };
  }

  /**
   * Returns user's token account for the given mint and token program ID
   */
  public getAta(
    mint: PublicKey,
    owner: PublicKey,
    tokenProgram = TOKEN_PROGRAM_ID,
  ): PublicKey {
    return getAssociatedTokenAddressSync(mint, owner, true, tokenProgram);
  }

  /**
   * Returns glam vault's token account for the given mint and token program ID
   */
  public getVaultAta(mint: PublicKey, tokenProgramId?: PublicKey): PublicKey {
    return this.getAta(mint, this.vaultPda, tokenProgramId);
  }

  /**
   * Returns user's glam mint token account
   */
  public getMintAta(user?: PublicKey): PublicKey {
    return this.getAta(
      this.mintPda,
      user || this.signer,
      TOKEN_2022_PROGRAM_ID,
    );
  }

  /**
   * Returns glam vault's SOL balance
   */
  public async getVaultBalance(): Promise<number> {
    const lamports = await this.provider.connection.getBalance(this.vaultPda);
    return lamports / LAMPORTS_PER_SOL;
  }

  /**
   * Returns glam vault's SOL balance in lamports
   */
  public async getVaultLamports(): Promise<number> {
    return await this.provider.connection.getBalance(this.vaultPda);
  }

  /**
   * Returns glam vault's token balance for the given mint
   */
  public async getVaultTokenBalance(
    mintPubkey: PublicKey,
  ): Promise<{ amount: BN; uiAmount: number }> {
    const { mint, tokenProgram } =
      await this.fetchMintAndTokenProgram(mintPubkey);
    const ata = this.getVaultAta(mintPubkey, tokenProgram);

    try {
      const account = await getAccount(
        this.provider.connection,
        ata,
        "confirmed",
        tokenProgram,
      );
      return {
        amount: new BN(account.amount.toString()),
        uiAmount: Number(account.amount) / Math.pow(10, mint.decimals),
      };
    } catch (e) {
      if (e instanceof TokenAccountNotFoundError) {
        return { amount: new BN(0), uiAmount: 0 };
      }
      throw e;
    }
  }

  private parseMintAccountInfo(
    accountInfo: AccountInfo<Buffer>,
    pubkey: PublicKey,
  ): { mint: Mint; tokenProgram: PublicKey } {
    if (!accountInfo) {
      throw new Error(`Mint ${pubkey} not found`);
    }
    const tokenProgram = accountInfo.owner;
    const mint = unpackMint(pubkey, accountInfo, tokenProgram);
    return { mint, tokenProgram };
  }

  /**
   * Fetches mint accounts and token program IDs for the given mint pubkeys
   */
  public async fetchMintsAndTokenPrograms(
    mintPubkeys: PublicKey[],
  ): Promise<{ mint: Mint; tokenProgram: PublicKey }[]> {
    const accountsInfo = (
      await this.provider.connection.getMultipleAccountsInfo(
        mintPubkeys,
        "confirmed",
      )
    ).filter((info): info is AccountInfo<Buffer> => info !== null);
    if (accountsInfo.length !== mintPubkeys.length) {
      throw new Error(
        `Failed to fetch mint accounts for ${mintPubkeys.length} mints`,
      );
    }
    return accountsInfo.map((info, i) =>
      this.parseMintAccountInfo(info, mintPubkeys[i]),
    );
  }

  /**
   * Fetches mint account and token program ID for the given mint pubkey
   */
  public async fetchMintAndTokenProgram(
    mintPubkey: PublicKey,
  ): Promise<{ mint: Mint; tokenProgram: PublicKey }> {
    const info = await this.provider.connection.getAccountInfo(
      mintPubkey,
      "confirmed",
    );
    if (!info) {
      throw new Error(
        `Failed to fetch mint account for ${mintPubkey.toBase58()}`,
      );
    }
    return this.parseMintAccountInfo(info, mintPubkey);
  }

  /**
   * Returns user's glam mint token balance
   */
  public async getMintTokenBalance(
    owner?: PublicKey,
  ): Promise<{ amount: BN; uiAmount: number }> {
    const account = await getAccount(
      this.provider.connection,
      this.getMintAta(owner), // glam mint ata
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );
    return {
      amount: new BN(account.amount.toString()),
      uiAmount: Number(account.amount) / 10 ** 9,
    };
  }

  async isLockupEnabled(): Promise<boolean> {
    if (!this.statePda) {
      throw new Error("State PDA is not specified");
    }

    const { mint } = await this.fetchMintAndTokenProgram(this.mintPda);
    const extMetadata = getExtensionData(
      ExtensionType.TokenMetadata,
      mint.tlvData,
    );
    const tokenMetadata = extMetadata
      ? unpack(extMetadata)
      : ({} as TokenMetadata);
    for (const [k, v] of tokenMetadata?.additionalMetadata) {
      if (k === "LockupPeriodSeconds") {
        return parseInt(v) > 0;
      }
    }
    return false;
  }

  public async fetchStateAccount(statePda?: PublicKey): Promise<StateAccount> {
    return await this.protocolProgram.account.stateAccount.fetch(
      statePda || this.statePda,
    );
  }

  public async fetchRequestQueue(
    requestQueuePda?: PublicKey,
  ): Promise<RequestQueue> {
    return this.mintProgram.account.requestQueue.fetch(
      requestQueuePda || this.requestQueuePda,
    );
  }

  /**
   * Generates instructions to wrap SOL into wSOL if the vault doesn't have enough wSOL
   *
   * @param lamports Desired amount of wSOL
   * @returns Array of instructions, null if no instructions are needed
   */
  public async maybeWrapSol(
    lamports: number | BN,
    signer?: PublicKey,
  ): Promise<TransactionInstruction[]> {
    const glamSigner = signer || this.getSigner();
    const vaultWsolAta = this.getAta(WSOL, this.vaultPda);
    let wsolBalance = new BN(0);
    try {
      wsolBalance = new BN(
        (
          await this.provider.connection.getTokenAccountBalance(vaultWsolAta)
        ).value.amount,
      );
    } catch (err) {}
    const solBalance = new BN(
      await this.provider.connection.getBalance(this.vaultPda),
    );
    const delta = new BN(lamports).sub(wsolBalance); // wSOL amount needed
    if (solBalance.lt(delta)) {
      throw new Error(
        `Insufficient funds in vault to complete the transaction. SOL balance (lamports): ${solBalance}, lamports needed: ${lamports}`,
      );
    }
    if (delta.gt(new BN(0)) && solBalance.gte(delta)) {
      return [
        createAssociatedTokenAccountIdempotentInstruction(
          glamSigner,
          vaultWsolAta,
          this.vaultPda,
          WSOL,
        ),
        await this.protocolProgram.methods
          .systemTransfer(delta)
          .accounts({
            glamState: this.statePda,
            glamSigner,
            to: vaultWsolAta,
          })
          .instruction(),
        createSyncNativeInstruction(vaultWsolAta),
      ];
    }

    return [];
  }

  /**
   * @deprecated
   */
  getAssetIdFromCurrency(currency: string): string {
    switch (currency.toUpperCase()) {
      case "SOL":
      case "WSOL":
        return WSOL.toBase58();
      case "USD":
      case "USDC":
        return USDC.toBase58();
    }
    return "";
  }

  /**
   * @deprecated
   */
  public async listGlamStates(): Promise<PublicKey[]> {
    const bytes = Uint8Array.from([
      0x31, 0x68, 0xa8, 0xd6, 0x86, 0xb4, 0xad, 0x9a,
    ]);
    const accounts = await this.provider.connection.getProgramAccounts(
      this.protocolProgram.programId,
      {
        filters: [{ memcmp: { offset: 0, bytes: bs58.encode(bytes) } }],
      },
    );
    return accounts.map((a) => a.pubkey);
  }

  /**
   * Builds a StateModel from onchain accounts (state, mint, etc)
   *
   * @param statePda Optional state PDA
   */
  public async fetchStateModel(statePda?: PublicKey): Promise<StateModel> {
    const glamStatePda = statePda || this.statePda;
    const stateAccount = await this.fetchStateAccount(glamStatePda);

    if (!stateAccount.mint.equals(PublicKey.default)) {
      const mintPubkey = glamStatePda.equals(this.statePda)
        ? this.mintPda
        : getMintPda(glamStatePda, 0, this.mintProgram.programId);
      const requestQueuePda = glamStatePda.equals(this.statePda)
        ? this.requestQueuePda
        : getRequestQueuePda(mintPubkey, this.mintProgram.programId);

      const { mint } = await this.fetchMintAndTokenProgram(mintPubkey);

      // fetch request queue only if state account is a tokenized vault
      const requestQueue = StateAccountType.equals(
        stateAccount.accountType,
        StateAccountType.TOKENIZED_VAULT,
      )
        ? await this.fetchRequestQueue(requestQueuePda)
        : undefined;

      return StateModel.fromOnchainAccounts(
        glamStatePda,
        stateAccount,
        mint,
        requestQueue,
        this.protocolProgram.programId,
      );
    }

    return StateModel.fromOnchainAccounts(
      glamStatePda,
      stateAccount,
      undefined,
      undefined,
      this.protocolProgram.programId,
    );
  }

  /**
   * Fetches glam state models and applies filters
   *
   * @param filterOptions Filter options
   */
  public async fetchGlamStates(filterOptions?: {
    owner?: PublicKey;
    delegate?: PublicKey;
    type?: string;
  }): Promise<StateModel[]> {
    const { owner, delegate, type } = filterOptions || {};

    const stateAccounts = await this.protocolProgram.account.stateAccount.all();
    const filteredStateAccounts = stateAccounts
      .filter((s) => !type || Object.keys(s.account.accountType)[0] === type)
      .filter(
        (s) =>
          // if neither owner nor delegate is set, return all
          // if owner is set, return states owned by the owner
          // if delegate is set, return states with the delegate
          (!owner && !delegate) ||
          (owner && s.account.owner.equals(owner)) ||
          (delegate &&
            s.account.delegateAcls.some((acl) => acl.pubkey.equals(delegate))),
      );

    let mintsCache = new Map<string, Mint>();
    const mintPubkeys = filteredStateAccounts
      .map((s) => s.account.mint)
      .filter((p) => !p.equals(PublicKey.default));
    const mints = await this.fetchMintsAndTokenPrograms(mintPubkeys);
    for (let i = 0; i < mintPubkeys.length; i++) {
      mintsCache.set(mintPubkeys[i].toBase58(), mints[i].mint);
    }

    // { publicKey, account: RequestQueue }[]
    const requestQueues = await this.mintProgram.account.requestQueue.all();
    const requestQueueMap = new Map(
      requestQueues.map((r) => [r.publicKey.toBase58(), r.account]),
    );

    return filteredStateAccounts.map(({ publicKey, account: stateAccount }) => {
      const mint = mintsCache.get(stateAccount.mint.toBase58());
      const requestQueuePda = mint
        ? getRequestQueuePda(stateAccount.mint, this.mintProgram.programId)
        : PublicKey.default;
      const requestQueue = requestQueueMap.get(requestQueuePda.toBase58());

      return StateModel.fromOnchainAccounts(
        publicKey,
        stateAccount,
        mint,
        requestQueue,
        this.protocolProgram.programId,
      );
    });
  }

  public async fetchProtocolPolicy<T>(
    integProgramId: PublicKey,
    protocolBitflag: number,
    policyClass: { decode(buffer: Buffer): T },
  ): Promise<T | null> {
    const stateAccount = await this.fetchStateAccount();
    const integrationPolicy = stateAccount.integrationAcls?.find((acl) =>
      acl.integrationProgram.equals(integProgramId),
    );
    const policyData = integrationPolicy?.protocolPolicies?.find(
      (policy: any) => policy.protocolBitflag === protocolBitflag,
    )?.data;
    if (policyData) {
      return policyClass.decode(policyData);
    }
    return null;
  }
}
