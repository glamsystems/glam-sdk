import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  TransactionSignature,
  VersionedTransaction,
  AccountMeta,
  Transaction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";

import { BaseClient, TxOptions } from "./base";
import {
  GOVERNANCE_PROGRAM_ID,
  JUP,
  JUP_VOTE_PROGRAM,
  JUPITER_API_DEFAULT,
  MERKLE_DISTRIBUTOR_PROGRAM,
  WSOL,
} from "../constants";
import { STAKE_POOLS_MAP } from "./assets";

export type QuoteParams = {
  inputMint: string;
  outputMint: string;
  amount: number;
  autoSlippage?: boolean;
  autoSlippageCollisionUsdValue?: number;
  slippageBps?: number;
  swapMode?: string;
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
  maxAccounts?: number;
  dexes?: string[];
  excludeDexes?: string[];
};

export type QuoteResponse = {
  inputMint: string;
  inAmount: number | string;
  outputMint: string;
  outAmount: number | string;
  otherAmountThreshold: number | string;
  swapMode: string;
  slippageBps: number;
  platformFee: number | null;
  priceImpactPct: number | string;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
};

export type TokenListItem = {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  tags: string[];
};

export type TokenPrice = {
  mint: string;
  price: number; // USD
};

type JsonAccountMeta = {
  pubkey: string; // not PublicKey but just string
  isSigner: boolean;
  isWritable: boolean;
};

type InstructionFromJupiter = {
  programId: string;
  accounts: JsonAccountMeta[];
  data: string;
};

type SwapInstructions = {
  tokenLedgerInstruction?: InstructionFromJupiter | null;
  otherInstructions?: InstructionFromJupiter[];
  computeBudgetInstructions: InstructionFromJupiter[];
  setupInstructions?: InstructionFromJupiter[];
  swapInstruction: InstructionFromJupiter;
  cleanupInstruction?: InstructionFromJupiter;
  addressLookupTableAddresses: string[];
};

const BASE = new PublicKey("bJ1TRoFo2P6UHVwqdiipp6Qhp2HaaHpLowZ5LHet8Gm");
const JUPITER_API =
  process.env.NEXT_PUBLIC_JUPITER_API ||
  process.env.JUPITER_API ||
  JUPITER_API_DEFAULT;

export async function fetchProgramLabels(): Promise<{ [key: string]: string }> {
  const res = await fetch(`${JUPITER_API}/swap/v1/program-id-to-label`);
  const data = await res.json();
  return data;
}

export async function fetchTokenPrices(
  pubkeys: string[],
): Promise<TokenPrice[]> {
  const res = await fetch(`${JUPITER_API}/price/v3?ids=${pubkeys.join(",")}`);
  const data = await res.json();

  return Object.entries(data).map(([key, val]) => {
    return {
      mint: key,
      price: (val as any).usdPrice,
    };
  });
}

export async function fetchTokensList(): Promise<TokenListItem[]> {
  const response = await fetch(`${JUPITER_API}/tokens/v2/tag?query=verified`);
  const data = await response.json();
  const tokenList = data?.map((t: any) => ({
    address: t.id,
    name: t.name,
    symbol: t.symbol,
    decimals: t.decimals,
    logoURI: t.icon,
    tags: t.tags,
  }));
  return tokenList;
}

export class JupiterSwapClient {
  public constructor(readonly base: BaseClient) {}

  /*
   * Client methods
   */

  public async swap(
    options: {
      quoteParams?: QuoteParams;
      quoteResponse?: QuoteResponse;
      swapInstructions?: SwapInstructions;
    },
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.swapTx(options, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async setMaxSwapSlippage(
    slippageBps: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.setMaxSwapSlippageTx(slippageBps, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  /*
   * API methods
   */

  async swapTx(
    options: {
      quoteParams?: QuoteParams;
      quoteResponse?: QuoteResponse;
      swapInstructions?: SwapInstructions;
    },
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const glamVault = this.base.vaultPda;

    let swapInstruction: InstructionFromJupiter;
    let addressLookupTableAddresses: string[];
    let inputMint: PublicKey;
    let outputMint: PublicKey;
    let amount: BN;

    const { quoteParams, quoteResponse, swapInstructions } = options;

    if (swapInstructions === undefined) {
      let resolvedQuoteResponse = quoteResponse;
      if (resolvedQuoteResponse === undefined) {
        if (quoteParams === undefined) {
          throw new Error(
            "quoteParams must be specified when quoteResponse and swapInstructions are not specified.",
          );
        }
        resolvedQuoteResponse = await this.getQuoteResponse(quoteParams);
      }

      inputMint = new PublicKey(
        quoteParams?.inputMint || resolvedQuoteResponse!.inputMint,
      );
      outputMint = new PublicKey(
        quoteParams?.outputMint || resolvedQuoteResponse!.outputMint,
      );
      amount = new BN(quoteParams?.amount || resolvedQuoteResponse!.inAmount);

      const ins = await this.getSwapInstructions(
        resolvedQuoteResponse,
        glamVault,
      );
      swapInstruction = ins.swapInstruction;
      addressLookupTableAddresses = ins.addressLookupTableAddresses;
    } else {
      // If swapInstructions is provided, we need to extract mints and amount from quoteParams or quoteResponse
      if (quoteParams) {
        inputMint = new PublicKey(quoteParams.inputMint);
        outputMint = new PublicKey(quoteParams.outputMint);
        amount = new BN(quoteParams.amount);
      } else if (quoteResponse) {
        inputMint = new PublicKey(quoteResponse.inputMint);
        outputMint = new PublicKey(quoteResponse.outputMint);
        amount = new BN(quoteResponse.inAmount);
      } else {
        throw new Error(
          "Either quoteParams or quoteResponse must be specified when using swapInstructions.",
        );
      }

      swapInstruction = swapInstructions.swapInstruction;
      addressLookupTableAddresses =
        swapInstructions.addressLookupTableAddresses;
    }

    const lookupTables = addressLookupTableAddresses.map(
      (pubkey) => new PublicKey(pubkey),
    );

    const swapIx: { data: any; keys: AccountMeta[] } =
      this.toTransactionInstruction(swapInstruction, glamVault.toBase58());

    const [inputTokenProgram, outputTokenProgram] = (
      await this.base.fetchMintsAndTokenPrograms([inputMint, outputMint])
    ).map((x) => x.tokenProgram);

    const inputStakePool =
      STAKE_POOLS_MAP.get(inputMint.toBase58())?.poolState || null;
    const outputStakePool =
      STAKE_POOLS_MAP.get(outputMint.toBase58())?.poolState || null;

    const preInstructions = await this.getPreInstructions(
      glamSigner,
      inputMint,
      outputMint,
      amount,
      inputTokenProgram,
      outputTokenProgram,
    );
    // @ts-ignore
    const tx = await this.base.program.methods
      .jupiterSwap(swapIx.data)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        inputMint,
        outputMint,
        inputTokenProgram,
        outputTokenProgram,
        inputStakePool,
        outputStakePool,
      })
      .remainingAccounts(swapIx.keys)
      .preInstructions(preInstructions)
      .transaction();

    return this.base.intoVersionedTransaction(tx, {
      lookupTables,
      ...txOptions,
    });
  }

  public async setMaxSwapSlippageTx(
    slippageBps: number,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    // FIXME: interface has changed, fix this place holder
    const tx = new Transaction();
    return this.base.intoVersionedTransaction(tx, { ...txOptions });
  }

  public async setMaxSwapSlippageIx(
    slippageBps: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionInstruction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    // FIXME: interface has changed, fix this place holder
    const tx = new Transaction();
    return tx.instructions[0];
  }

  /*
   * Utils
   */

  getPreInstructions = async (
    signer: PublicKey,
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    inputTokenProgram: PublicKey = TOKEN_PROGRAM_ID,
    outputTokenProgram: PublicKey = TOKEN_PROGRAM_ID,
  ): Promise<TransactionInstruction[]> => {
    const vault = this.base.vaultPda;
    const ata = this.base.getVaultAta(outputMint, outputTokenProgram);

    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        ata,
        vault,
        outputMint,
        outputTokenProgram,
      ),
    ];

    // Transfer SOL to wSOL ATA if needed for the vault
    if (inputMint.equals(WSOL)) {
      const wrapSolIxs = await this.base.maybeWrapSol(amount, signer);
      preInstructions.push(...wrapSolIxs);
    }

    return preInstructions;
  };

  getTokenProgram = async (mint: PublicKey) => {
    const mintInfo = await this.base.provider.connection.getAccountInfo(mint);
    if (!mintInfo) {
      throw new Error(`AccountInfo not found for mint ${mint.toBase58()}`);
    }
    if (
      ![TOKEN_PROGRAM_ID.toBase58(), TOKEN_2022_PROGRAM_ID.toBase58()].includes(
        mintInfo.owner.toBase58(),
      )
    ) {
      throw new Error(`Invalid mint owner: ${mintInfo.owner.toBase58()}`);
    }
    return mintInfo.owner;
  };

  toTransactionInstruction = (
    ixPayload: InstructionFromJupiter,
    vaultStr: string,
  ) => {
    if (ixPayload === null) {
      throw new Error("ixPayload is null");
    }

    return new TransactionInstruction({
      programId: new PublicKey(ixPayload.programId),
      keys: ixPayload.accounts.map((key: any) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner && key.pubkey != vaultStr,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(ixPayload.data, "base64"),
    });
  };

  public async getQuoteResponse(quoteParams: QuoteParams): Promise<any> {
    const res = await fetch(
      `${JUPITER_API}/swap/v1/quote?` +
        new URLSearchParams(
          Object.entries(quoteParams).map(([key, val]) => [key, String(val)]),
        ),
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error);
    }
    return data;
  }

  async getSwapInstructions(quoteResponse: any, from: PublicKey): Promise<any> {
    const res = await fetch(`${JUPITER_API}/swap/v1/swap-instructions`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey: from.toBase58(),
      }),
    });

    return await res.json();
  }
}

export class JupiterVoteClient {
  public constructor(readonly base: BaseClient) {}

  /*
   * Client methods
   */

  /**
   * Stake JUP. The escrow account will be created if it doesn't exist.
   *
   * @param statePda
   * @param amount
   * @param txOptions
   * @returns
   */
  public async stakeJup(
    amount: BN,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const vault = this.base.vaultPda;
    const escrow = this.getEscrowPda(vault);
    const escrowJupAta = this.base.getAta(JUP, escrow);
    const vaultJupAta = this.base.getAta(JUP, vault);

    const escrowAccountInfo =
      await this.base.provider.connection.getAccountInfo(escrow);
    const escrowCreated = escrowAccountInfo ? true : false;
    const preInstructions = txOptions.preInstructions || [];
    if (!escrowCreated) {
      console.log("Will create escrow account:", escrow.toBase58());
      preInstructions.push(
        await this.base.program.methods
          .jupiterVoteNewEscrow()
          .accounts({
            glamState: this.base.statePda,
            locker: this.stakeLocker,
            escrow,
          })
          .instruction(),
      );
      preInstructions.push(
        await this.base.program.methods
          .jupiterVoteToggleMaxLock(true)
          .accounts({
            glamState: this.base.statePda,
            locker: this.stakeLocker,
            escrow,
          })
          .instruction(),
      );
    }
    preInstructions.push(
      createAssociatedTokenAccountIdempotentInstruction(
        this.base.getSigner(),
        escrowJupAta,
        escrow,
        JUP,
      ),
    );

    const tx = await this.base.program.methods
      .jupiterVoteIncreaseLockedAmount(amount)
      .accounts({
        glamState: this.base.statePda,
        locker: this.stakeLocker,
        escrow,
        escrowTokens: escrowJupAta,
        sourceTokens: vaultJupAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, { ...txOptions });

    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Unstake all staked JUP.
   *
   * @param statePda
   * @param txOptions
   * @returns
   */
  // TODO: support partial unstake
  public async unstakeJup(txOptions: TxOptions = {}) {
    const vault = this.base.vaultPda;
    const escrow = this.getEscrowPda(vault);

    const tx = await this.base.program.methods
      .jupiterVoteToggleMaxLock(false)
      .accounts({
        glamState: this.base.statePda,
        locker: this.stakeLocker,
        escrow,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, { ...txOptions });

    return await this.base.sendAndConfirm(vTx);
  }

  public async withdrawJup(txOptions: TxOptions = {}) {
    const vault = this.base.vaultPda;
    const escrow = this.getEscrowPda(vault);
    const escrowJupAta = this.base.getAta(JUP, escrow);
    const vaultJupAta = this.base.getAta(JUP, vault);

    const tx = await this.base.program.methods
      .jupiterVoteWithdraw()
      .accounts({
        glamState: this.base.statePda,
        locker: this.stakeLocker,
        escrow,
        escrowTokens: escrowJupAta,
        destinationTokens: vaultJupAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([
        createAssociatedTokenAccountIdempotentInstruction(
          this.base.getSigner(),
          vaultJupAta,
          vault,
          JUP,
        ),
      ])
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, { ...txOptions });

    return await this.base.sendAndConfirm(vTx);
  }

  public async claimAndStake(
    distributor: PublicKey,
    amountUnlocked: BN,
    amountLocked: BN,
    proof: number[][],
    txOptions: TxOptions = {},
  ) {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const vault = this.base.vaultPda;
    const escrow = this.getEscrowPda(vault);
    const escrowJupAta = this.base.getAta(JUP, escrow);
    const distributorJupAta = this.base.getAta(JUP, distributor);

    // @ts-ignore
    const tx = await this.base.program.methods
      .merkleDistributorNewClaimAndStake(amountUnlocked, amountLocked, proof)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
        distributor,
        from: distributorJupAta,
        claimStatus: this.getClaimStatus(vault, distributor),
        voterProgram: JUP_VOTE_PROGRAM,
        locker: this.stakeLocker,
        tokenProgram: TOKEN_PROGRAM_ID,
        escrow,
        escrowTokens: escrowJupAta,
      })
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, { ...txOptions });
    return await this.base.sendAndConfirm(vTx);
  }

  public async cancelUnstake(txOptions: TxOptions = {}) {
    const vault = this.base.vaultPda;
    const escrow = this.getEscrowPda(vault);

    const tx = await this.base.program.methods
      .jupiterVoteToggleMaxLock(true)
      .accounts({
        glamState: this.base.statePda,
        locker: this.stakeLocker,
        escrow,
      })
      .transaction();

    const vTx = await this.base.intoVersionedTransaction(tx, { ...txOptions });

    return await this.base.sendAndConfirm(vTx);
  }

  /**
   * Vote on a proposal. The vote account will be created if it doesn't exist.
   *
   * @param proposal
   * @param side
   * @param txOptions
   * @returns
   */
  public async voteOnProposal(
    proposal: PublicKey,
    side: number,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const glamVault = this.base.vaultPda;
    const vote = this.getVotePda(proposal, glamVault);
    const governor = this.getGovernorPda();

    const voteAccountInfo =
      await this.base.provider.connection.getAccountInfo(vote);
    const voteCreated = voteAccountInfo ? true : false;
    const preInstructions = [];
    if (!voteCreated) {
      console.log("Will create vote account:", vote.toBase58());
      preInstructions.push(
        await this.base.program.methods
          .jupiterGovNewVote(glamVault)
          .accountsPartial({
            glamState: this.base.statePda,
            proposal,
            vote,
          })
          .instruction(),
      );
    }

    const escrow = this.getEscrowPda(glamVault);
    const tx = await this.base.program.methods
      .jupiterVoteCastVote(side)
      .accounts({
        glamState: this.base.statePda,
        escrow,
        proposal,
        vote,
        locker: this.stakeLocker,
        governor,
        governProgram: GOVERNANCE_PROGRAM_ID,
      })
      .preInstructions(preInstructions)
      .transaction();
    const vTx = await this.base.intoVersionedTransaction(tx, { ...txOptions });
    return await this.base.sendAndConfirm(vTx);
  }

  /*
   * Utils
   */
  async fetchVotes(proposals: PublicKey[] | string[]) {
    const glamVault = this.base.vaultPda;
    const votes = proposals.map((proposal) =>
      this.getVotePda(new PublicKey(proposal), glamVault),
    );

    const votesAccountInfo =
      await this.base.provider.connection.getMultipleAccountsInfo(votes);
    return votesAccountInfo
      .filter((accountInfo) => accountInfo !== null)
      .map((accountInfo) => ({
        // offsets:
        // 8 (discriminator)
        // 32 (proposal)
        // 32 (voter)
        // 1 (bump)
        // 1 (side)
        proposal: new PublicKey(accountInfo.data.subarray(8, 40)),
        voter: new PublicKey(accountInfo.data.subarray(40, 72)),
        side: accountInfo.data.readUInt8(73),
      }));
  }

  get stakeLocker(): PublicKey {
    const [locker] = PublicKey.findProgramAddressSync(
      [Buffer.from("Locker"), BASE.toBuffer()],
      JUP_VOTE_PROGRAM,
    );
    return locker;
  }

  getClaimStatus(claimant: PublicKey, distributor: PublicKey): PublicKey {
    const [claimStatus] = PublicKey.findProgramAddressSync(
      [Buffer.from("ClaimStatus"), claimant.toBuffer(), distributor.toBuffer()],
      MERKLE_DISTRIBUTOR_PROGRAM,
    );
    return claimStatus;
  }

  getEscrowPda(owner: PublicKey): PublicKey {
    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from("Escrow"), this.stakeLocker.toBuffer(), owner.toBuffer()],
      JUP_VOTE_PROGRAM,
    );
    return escrow;
  }

  getVotePda(proposal: PublicKey, voter: PublicKey): PublicKey {
    const [vote] = PublicKey.findProgramAddressSync(
      [Buffer.from("Vote"), proposal.toBuffer(), voter.toBuffer()],
      GOVERNANCE_PROGRAM_ID,
    );
    return vote;
  }

  getGovernorPda(): PublicKey {
    const [governor] = PublicKey.findProgramAddressSync(
      [Buffer.from("Governor"), BASE.toBuffer()],
      GOVERNANCE_PROGRAM_ID,
    );
    return governor;
  }
}
