import { BN } from "@coral-xyz/anchor";
import {
  PublicKey,
  TransactionInstruction,
  TransactionSignature,
  VersionedTransaction,
  AccountMeta,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";

import { BaseClient, TxOptions } from "./base";
import { JUPITER_API_DEFAULT, WSOL } from "../constants";
import { STAKE_POOLS_MAP } from "./assets";
import { JupiterSwapPolicy } from "../models";

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

// Jupiter API for tokens and prices
const JUPITER_API =
  process.env.NEXT_PUBLIC_JUPITER_API ||
  process.env.JUPITER_API ||
  JUPITER_API_DEFAULT;

// Jupiter API for swap
const JUPITER_SWAP_API =
  process.env.NEXT_PUBLIC_JUPITER_SWAP_API ||
  process.env.JUPITER_SWAP_API ||
  JUPITER_API_DEFAULT + "/swap/v1";

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

export async function fetchProgramLabels(): Promise<{ [key: string]: string }> {
  const res = await fetch(`${JUPITER_SWAP_API}/program-id-to-label`);
  const data = await res.json();
  return data;
}

export async function getQuoteResponse(quoteParams: QuoteParams): Promise<any> {
  const res = await fetch(
    `${JUPITER_SWAP_API}/quote?` +
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

export async function getSwapInstructions(
  quoteResponse: any,
  from: PublicKey,
): Promise<any> {
  const res = await fetch(`${JUPITER_SWAP_API}/swap-instructions`, {
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

class TxBuilder {
  public constructor(readonly base: BaseClient) {}

  async setJupiterSwapPolicy(
    policy: JupiterSwapPolicy,
    txOptions: TxOptions = {},
  ): Promise<VersionedTransaction> {
    const glamSigner = txOptions.signer || this.base.getSigner();
    const tx = await this.base.protocolProgram.methods
      .setJupiterSwapPolicy(policy)
      .accounts({
        glamState: this.base.statePda,
        glamSigner,
      })
      .transaction();
    return this.base.intoVersionedTransaction(tx, txOptions);
  }

  async swap(
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
        resolvedQuoteResponse = await getQuoteResponse(quoteParams);
      }

      inputMint = new PublicKey(
        quoteParams?.inputMint || resolvedQuoteResponse!.inputMint,
      );
      outputMint = new PublicKey(
        quoteParams?.outputMint || resolvedQuoteResponse!.outputMint,
      );
      amount = new BN(quoteParams?.amount || resolvedQuoteResponse!.inAmount);

      const ins = await getSwapInstructions(resolvedQuoteResponse, glamVault);
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
    const tx = await this.base.protocolProgram.methods
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

  getPreInstructions = async (
    signer: PublicKey,
    inputMint: PublicKey,
    outputMint: PublicKey,
    amount: BN,
    inputTokenProgram: PublicKey = TOKEN_PROGRAM_ID,
    outputTokenProgram: PublicKey = TOKEN_PROGRAM_ID,
  ): Promise<TransactionInstruction[]> => {
    const preInstructions = [
      createAssociatedTokenAccountIdempotentInstruction(
        signer,
        this.base.getVaultAta(outputMint, outputTokenProgram),
        this.base.vaultPda,
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
}

export class JupiterSwapClient {
  public readonly txBuilder: TxBuilder;

  public constructor(readonly base: BaseClient) {
    this.txBuilder = new TxBuilder(base);
  }

  public async swap(
    options: {
      quoteParams?: QuoteParams;
      quoteResponse?: QuoteResponse;
      swapInstructions?: SwapInstructions;
    },
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.swap(options, txOptions);
    return await this.base.sendAndConfirm(tx);
  }

  public async setJupiterSwapPolicy(
    policy: JupiterSwapPolicy,
    txOptions: TxOptions = {},
  ): Promise<TransactionSignature> {
    const tx = await this.txBuilder.setJupiterSwapPolicy(policy, txOptions);
    return await this.base.sendAndConfirm(tx);
  }
}
