import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import {
  AddressLookupTableAccount,
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
import { getSimulationResult, parseProgramLogs } from "../utils/transaction";
import { buildComputeBudgetInstructions } from "../utils/computeBudget";
import { fetchAddressLookupTableAccounts } from "../utils/lookupTables";
import {
  fetchMintAndTokenProgram,
  fetchMintsAndTokenPrograms,
  getTokenAccountsByOwner,
} from "../utils/accounts";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  getAccount,
  getAssociatedTokenAddressSync,
  Mint,
  getExtensionData,
  ExtensionType,
} from "@solana/spl-token";
import { JITO_TIP_DEFAULT, ALT_PROGRAM_ID } from "../constants";

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

const LOOKUP_TABLES = [
  new PublicKey("284iwGtA9X9aLy3KsyV8uT2pXLARhYbiSi5SiM2g47M2"), // kamino lending
  new PublicKey("D9cnvzswDikQDf53k4HpQ3KJ9y1Fv3HGGDFYMXnK5T6c"), // drift
  new PublicKey("EiWSskK5HXnBTptiS5DH6gpAJRVNQ3cAhTKBGaiaysAb"), // drift
];

export type TxOptions = {
  signer?: PublicKey;
  computeUnitLimit?: number;
  getPriorityFeeMicroLamports?: (tx: VersionedTransaction) => Promise<number>;
  maxFeeLamports?: number;
  useMaxFee?: boolean;
  jitoTipLamports?: number;
  preInstructions?: TransactionInstruction[];
  postInstructions?: TransactionInstruction[];
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

  private _protocolProgram?: GlamProtocolProgram;
  private _mintProgram?: GlamMintProgram;
  private _extSplProgram?: ExtSplProgram;
  private _extDriftProgram?: ExtDriftProgram;
  private _extKaminoProgram?: ExtKaminoProgram;
  private _extMarinadeProgram?: ExtMarinadeProgram;
  private _extStakePoolProgram?: ExtStakePoolProgram;
  private _extCctpProgram?: ExtCctpProgram;

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

    this.cluster =
      config?.cluster ||
      ClusterNetwork.fromUrl(this.provider.connection.rpcEndpoint);

    if (config?.statePda) {
      this.statePda = config.statePda;
    }

    this.blockhashWithCache = new BlockhashWithCache(
      this.provider,
      false, // always disable browser cache (use in-memory cache instead), for in-app browser compatibility
    );
  }

  get protocolProgram(): GlamProtocolProgram {
    if (!this._protocolProgram) {
      this._protocolProgram = getGlamProtocolProgram(this.provider);
    }
    return this._protocolProgram;
  }

  get mintProgram(): GlamMintProgram {
    if (!this._mintProgram) {
      this._mintProgram = getGlamMintProgram(this.provider);
    }
    return this._mintProgram;
  }

  get extSplProgram(): ExtSplProgram {
    if (!this._extSplProgram) {
      this._extSplProgram = getExtSplProgram(this.provider);
    }
    return this._extSplProgram;
  }

  get extDriftProgram(): ExtDriftProgram {
    if (!this._extDriftProgram) {
      this._extDriftProgram = getExtDriftProgram(this.provider);
    }
    return this._extDriftProgram;
  }

  get extKaminoProgram(): ExtKaminoProgram {
    if (!this._extKaminoProgram) {
      this._extKaminoProgram = getExtKaminoProgram(this.provider);
    }
    return this._extKaminoProgram;
  }

  get extMarinadeProgram(): ExtMarinadeProgram {
    if (!this._extMarinadeProgram) {
      this._extMarinadeProgram = getExtMarinadeProgram(this.provider);
    }
    return this._extMarinadeProgram;
  }

  get extStakePoolProgram(): ExtStakePoolProgram {
    if (!this._extStakePoolProgram) {
      this._extStakePoolProgram = getExtStakePoolProgram(this.provider);
    }
    return this._extStakePoolProgram;
  }

  get extCctpProgram(): ExtCctpProgram {
    if (!this._extCctpProgram) {
      this._extCctpProgram = getExtCctpProgram(this.provider);
    }
    return this._extCctpProgram;
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

  get isPhantomConnected(): boolean {
    const isBrowser =
      process.env.ANCHOR_BROWSER ||
      (typeof window !== "undefined" &&
        !window.process?.hasOwnProperty("type"));

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
   * Fetches lookup tables for the current GLAM instance
   */
  public async findGlamLookupTables(): Promise<AddressLookupTableAccount[]> {
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
    signer = signer || this.signer;

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

    // Fetch custom lookup tables and default lookup tables
    const lookupTableAccounts: AddressLookupTableAccount[] = [];
    if (lookupTables.every((t) => t instanceof AddressLookupTableAccount)) {
      const accounts = await fetchAddressLookupTableAccounts(
        this.provider.connection,
        LOOKUP_TABLES,
      );
      lookupTableAccounts.push(...lookupTables, ...accounts);
    } else {
      const accounts = await fetchAddressLookupTableAccounts(
        this.provider.connection,
        [...lookupTables, ...LOOKUP_TABLES],
      );
      lookupTableAccounts.push(...accounts);
    }

    if (this._statePda) {
      // Fetch GLAM specific lookup tables
      const glamLookupTableAccounts = await getGlamLookupTableAccounts(
        this.statePda,
      );
      lookupTableAccounts.push(...glamLookupTableAccounts);
    }

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

    // Add CU instructions if jitoTipLamports is not provided and computeUnitLimit is provided
    if (!jitoTipLamports && computeUnitLimit) {
      const vTx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: signer,
          recentBlockhash,
          instructions,
        }).compileToV0Message(lookupTableAccounts),
      );
      const cuIxs = await buildComputeBudgetInstructions(
        vTx,
        computeUnitLimit,
        {
          getPriorityFeeMicroLamports,
          maxFeeLamports,
          useMaxFee,
        },
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

  public async sendAndConfirm(
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
    const wallet = this.wallet;
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

  get connection(): Connection {
    return this.provider.connection;
  }

  get signer(): PublicKey {
    const publicKey = this.provider?.publicKey;
    if (!publicKey) {
      throw new Error(
        "Signer public key cannot be retrieved from anchor provider",
      );
    }
    return publicKey;
  }

  get wallet(): Wallet {
    const anchorProvider = this.provider as AnchorProvider;
    if (!anchorProvider?.wallet) {
      throw new Error("Wallet cannot be retrieved from anchor provider");
    }
    return anchorProvider.wallet as Wallet;
  }

  // derived from state pda
  get vaultPda(): PublicKey {
    return getVaultPda(this.statePda, this.protocolProgram.programId);
  }

  // @deprecated
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
   * Returns SOL and token balances of the given owner pubkey
   */
  public async getSolAndTokenBalances(owner: PublicKey) {
    const balanceLamports = await this.provider.connection.getBalance(owner);
    const tokenAccounts = await getTokenAccountsByOwner(
      this.provider.connection,
      owner,
    );
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
    const lamports = await this.getVaultLamports();
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
    const { mint, tokenProgram } = await fetchMintAndTokenProgram(
      this.provider.connection,
      mintPubkey,
    );
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

    const { mint } = await fetchMintAndTokenProgram(
      this.provider.connection,
      this.mintPda,
    );
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

      const { mint } = await fetchMintAndTokenProgram(
        this.provider.connection,
        mintPubkey,
      );

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
    const mints = await fetchMintsAndTokenPrograms(
      this.provider.connection,
      mintPubkeys,
    );
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
