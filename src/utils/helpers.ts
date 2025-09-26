import {
  Connection,
  PublicKey,
  TransactionInstruction,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  VersionedTransaction,
  TransactionMessage,
  RpcResponseAndContext,
  SimulatedTransactionResponse,
  StakeProgram,
  ParsedAccountData,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  STAKE_ACCOUNT_SIZE,
  METEORA_DLMM_PROGRAM,
  METEORA_POSITION_SIZE,
} from "../constants";
import { binIdToBinArrayIndex, deriveBinArray } from "@meteora-ag/dlmm";
import { BN } from "@coral-xyz/anchor";
import { GlamProtocolIdlJson } from "../glamExports";
import { type TokenAccount } from "../client/base";
import {
  AccountLayout,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";

export type StakeAccountInfo = {
  address: PublicKey;
  lamports: number;
  state: string;
  voter?: PublicKey; // if undefined, the stake account is not delegated
};

// Example response from Helius:
// {
//   "jsonrpc": "2.0",
//   "id": "1",
//   "result": {
//     "accounts": [
//       {
//         "pubkey": "CxELquR1gPP8wHe33gZ4QxqGB3sZ9RSwsJ2KshVewkFY",
//         "account": {
//           "lamports": 15298080,
//           "owner": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
//           "data": [
//             "2R9jLfiAQ9bgdcw6h8s44439",
//             "base64"
//           ],
//           "executable": false,
//           "rentEpoch": 28,
//           "space": 165
//         }
//       }
//     ],
//     "paginationKey": "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
//     "totalResults": 25000
//   }
// }
export async function getProgramAccountsV2(
  programId: PublicKey,
  limit: number = 100,
  filters?: any[],
) {
  const heliusApiKey =
    process.env.NEXT_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY;

  let allAccounts = [];
  let paginationKey = null;
  let encoding = "base64";

  do {
    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getProgramAccountsV2",
          params: [
            programId.toBase58(),
            {
              encoding,
              filters,
              limit,
              ...(paginationKey && { paginationKey }),
            },
          ],
        }),
      },
    );

    const data = await response.json();
    data.result.accounts.forEach(({ pubkey, account }) => {
      const [acountData, encoding] = account.data;
      let decodedData;
      if (encoding === "base64") {
        decodedData = Buffer.from(acountData, "base64");
      }
      if (!decodedData) {
        throw new Error("Failed to decode base64 account data");
      }
      allAccounts.push({
        pubkey: new PublicKey(pubkey),
        account: {
          ...account,
          owner: new PublicKey(account.owner),
          data: decodedData,
        },
      });
    });

    paginationKey = data.result.paginationKey;
  } while (paginationKey);

  return allAccounts;
}

export async function getProgramAccountsWithRetry(
  connection: Connection,
  programId: PublicKey,
  filters?: any[],
) {
  const maxRetries = 3;
  const delayMs = 1000;
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await connection.getProgramAccounts(programId, { filters });
    } catch (error: any) {
      lastError = error;

      if (error.code !== -32600 || attempt === maxRetries) {
        break;
      }

      // Increase delay for each retry
      console.warn(
        `Attempt ${attempt} failed, retrying in ${delayMs * attempt}ms:`,
        error.message,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw new Error(
    `Failed after ${maxRetries} attempts. Last error: ${lastError.message}`,
  );
}

/**
 * Fetches all the token accounts owned by the specified pubkey.
 */
export async function getTokenAccountsByOwner(
  connection: Connection,
  owner: PublicKey,
): Promise<TokenAccount[]> {
  const tokenAccounts = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });
  const token2022Accounts = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const mintPubkeys = [] as PublicKey[];
  const parseTokenAccountInfo = (pubkey: PublicKey, account: any) => {
    const { mint, amount, state } = AccountLayout.decode(account.data);
    mintPubkeys.push(mint);
    return {
      owner,
      pubkey,
      mint,
      amount: amount.toString(),
      frozen: state !== 1,
    };
  };

  // Parse token accounts
  const partialTokenAccounts = tokenAccounts.value
    .map(({ pubkey, account }) => ({
      ...parseTokenAccountInfo(pubkey, account),
      programId: TOKEN_PROGRAM_ID,
    }))
    .concat(
      token2022Accounts.value.map(({ pubkey, account }) => ({
        ...parseTokenAccountInfo(pubkey, account),
        programId: TOKEN_2022_PROGRAM_ID,
      })),
    );

  // Get mint decimals
  const mintDecimalMap = new Map<string, number>();
  const mintAccountsInfo =
    await connection.getMultipleAccountsInfo(mintPubkeys);
  mintAccountsInfo.forEach((accountInfo, i) => {
    if (accountInfo) {
      const mint = unpackMint(mintPubkeys[i], accountInfo, accountInfo.owner);
      mintDecimalMap.set(mintPubkeys[i].toBase58(), mint.decimals);
    }
  });

  // Enrich token accounts with decimals and uiAmount
  return partialTokenAccounts
    .map((ta) => {
      const decimals = mintDecimalMap.get(ta.mint.toBase58());
      if (!decimals) {
        return null;
      }
      return {
        ...ta,
        decimals,
        uiAmount: Number(ta.amount) / 10 ** decimals,
      } as TokenAccount;
    })
    .filter((ta) => ta !== null);
}

export async function getSolAndTokenBalances(
  connection: Connection,
  owner: PublicKey,
) {
  const balanceLamports = await connection.getBalance(owner);
  const tokenAccounts = await getTokenAccountsByOwner(connection, owner);
  const uiAmount = balanceLamports / LAMPORTS_PER_SOL;

  return {
    balanceLamports,
    uiAmount,
    tokenAccounts,
  };
}

export const findStakeAccounts = async (
  connection: Connection,
  withdrawAuthority: PublicKey,
): Promise<PublicKey[]> => {
  // stake authority offset: 12
  // withdraw authority offset: 44
  const accounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          dataSize: STAKE_ACCOUNT_SIZE,
        },
        {
          memcmp: {
            offset: 44,
            bytes: withdrawAuthority.toBase58(),
          },
        },
      ],
    },
  );
  // order by lamports desc
  return accounts
    .sort((a, b) => b.account.lamports - a.account.lamports)
    .map((a) => a.pubkey);
};

export const getStakeAccountsWithStates = async (
  connection: Connection,
  withdrawAuthority: PublicKey,
): Promise<StakeAccountInfo[]> => {
  // stake authority offset: 12
  // withdraw authority offset: 44
  const accounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          dataSize: STAKE_ACCOUNT_SIZE,
        },
        {
          memcmp: {
            offset: 44,
            bytes: withdrawAuthority.toBase58(),
          },
        },
      ],
    },
  );

  const epochInfo = await connection.getEpochInfo();
  const stakes = await Promise.all(
    accounts.map(async (account) => {
      const delegation = (account.account.data as ParsedAccountData).parsed.info
        .stake?.delegation;

      let state = "undelegated";

      if (!delegation) {
        return {
          address: account.pubkey,
          lamports: account.account.lamports,
          state,
        };
      }

      // possible state if delegated: active, inactive, activating, deactivating
      const { activationEpoch, deactivationEpoch, voter } = delegation;
      if (activationEpoch == epochInfo.epoch) {
        state = "activating";
      } else if (deactivationEpoch == epochInfo.epoch) {
        state = "deactivating";
      } else if (epochInfo.epoch > deactivationEpoch) {
        state = "inactive";
      } else if (epochInfo.epoch > activationEpoch) {
        state = "active";
      }

      return {
        address: account.pubkey,
        lamports: account.account.lamports,
        voter: new PublicKey(voter),
        state,
      };
    }),
  );

  // order by lamports desc
  return stakes.sort((a, b) => b.lamports - a.lamports);
};

export const fetchMeteoraPositions = async (
  connection: Connection,
  owner: PublicKey,
) => {
  const accounts = await connection.getProgramAccounts(METEORA_DLMM_PROGRAM, {
    filters: [
      {
        dataSize: METEORA_POSITION_SIZE,
      },
      {
        memcmp: {
          offset: 40,
          bytes: owner.toBase58(),
        },
      },
    ],
  });
  return accounts.map((a) => a.pubkey);
};

export const parseMeteoraPosition = async (
  connection: Connection,
  position: PublicKey,
) => {
  const positionAccountInfo = await connection.getAccountInfo(position);
  if (!positionAccountInfo) {
    throw new Error("Position not found");
  }
  const positionData = positionAccountInfo.data;

  const lbPair = new PublicKey(positionData.subarray(8, 40));
  const lowerBinId = positionData.subarray(7912, 7916).readInt32LE();
  const upperBinId = positionData.subarray(7916, 7920).readInt32LE();

  const lowerBinArrayIndex = binIdToBinArrayIndex(new BN(lowerBinId));
  const [binArrayLower] = deriveBinArray(
    lbPair,
    lowerBinArrayIndex,
    METEORA_DLMM_PROGRAM,
  );

  const upperBinArrayIndex = BN.max(
    lowerBinArrayIndex.add(new BN(1)),
    binIdToBinArrayIndex(new BN(upperBinId)),
  );
  const [binArrayUpper] = deriveBinArray(
    lbPair,
    upperBinArrayIndex,
    METEORA_DLMM_PROGRAM,
  );

  return {
    lbPair,
    lowerBinId,
    upperBinId,
    binArrayLower,
    binArrayUpper,
  };
};

/**
 * Parses program logs to extract error message
 */
export function parseProgramLogs(logs?: null | string[]): string {
  // "Error Message:" indicates an anchor program error
  // Other messages are manually sourced & handled
  const errorMsgLog = (logs || []).find(
    (log) =>
      log.includes("Error Message:") ||
      log.includes("Error: insufficient funds"),
  );

  // console.log("error message found in program logs", errorMsgLog);

  if (errorMsgLog) {
    if (errorMsgLog.includes("Error Message:")) {
      return errorMsgLog.split("Error Message:")[1].trim();
    } else {
      return "Insufficient funds";
    }
  }

  return "Unknown error";
}

export const getSimulationResult = async (
  connection: Connection,
  instructions: Array<TransactionInstruction>,
  payer: PublicKey,
  lookupTables?: Array<AddressLookupTableAccount>,
): Promise<{
  unitsConsumed?: number;
  error?: Error;
  serializedTx?: String;
}> => {
  const testIxs = [
    // Set an arbitrarily high number in simulation
    // so we can be sure the transaction will succeed
    // and get the real compute units used
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ...instructions,
  ];

  const testTx = new VersionedTransaction(
    new TransactionMessage({
      instructions: testIxs,
      payerKey: payer,
      // RecentBlockhash can by any public key during simulation
      // since 'replaceRecentBlockhash' is set to 'true' below
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message(lookupTables),
  );

  const serializedTx = Buffer.from(testTx.serialize()).toString("base64");
  try {
    const rpcResponse = await connection.simulateTransaction(testTx, {
      replaceRecentBlockhash: true,
      sigVerify: false,
    });
    getErrorFromRPCResponse(rpcResponse);

    return {
      unitsConsumed: rpcResponse.value.unitsConsumed,
      serializedTx,
    };
  } catch (e) {
    return { error: e as Error, serializedTx };
  }
};

const getErrorFromRPCResponse = (
  rpcResponse: RpcResponseAndContext<SimulatedTransactionResponse>,
) => {
  // Note: `confirmTransaction` does not throw an error if the confirmation does not succeed,
  // but rather a `TransactionError` object. so we handle that here
  // See https://solana-labs.github.io/solana-web3.js/classes/Connection.html#confirmTransaction.confirmTransaction-1

  const error = rpcResponse.value.err;
  if (error) {
    // Can be a string or an object (literally just {}, no further typing is provided by the library)
    // https://github.com/solana-labs/solana-web3.js/blob/4436ba5189548fc3444a9f6efb51098272926945/packages/library-legacy/src/connection.ts#L2930
    // TODO: if still occurs in web3.js 2 (unlikely), fix it.
    if (typeof error === "object") {
      const errorKeys = Object.keys(error);
      if (errorKeys.length === 1) {
        if (errorKeys[0] !== "InstructionError") {
          throw new Error(`Unknown RPC error: ${error}`);
        }
        // @ts-ignore due to missing typing information mentioned above.
        const instructionError = error["InstructionError"];
        // An instruction error is a custom program error and looks like:
        // [1, {"Custom": 1}]
        // See also https://solana.stackexchange.com/a/931/294
        const customErrorCode = instructionError[1]["Custom"];
        const { errors: glamErrors } = GlamProtocolIdlJson;
        const glamError = glamErrors.find((e) => e.code === customErrorCode);
        if (glamError?.msg) {
          throw new Error(glamError.msg);
        }
        // Unrecognized error code, try to parse program logs to get error message
        const errMsg = parseProgramLogs(rpcResponse.value.logs);
        throw new Error(errMsg);
      }
    }
    throw Error("Unknown error");
  }
};

export const setsAreEqual = (a: Set<any>, b: Set<any>) => {
  if (a.size !== b.size) return false;
  for (let item of a) {
    if (!b.has(item)) return false;
  }
  return true;
};

export function charsToName(chars: number[] | Buffer): string {
  return String.fromCharCode(...chars)
    .replace(/\0/g, "")
    .trim();
}

export function nameToChars(name: string): number[] {
  return Array.from(Buffer.from(name).subarray(0, 32));
}

export function formatBits(bitmask: number, padding: number = 16): string {
  return bitmask.toString(2).padStart(padding, "0");
}
