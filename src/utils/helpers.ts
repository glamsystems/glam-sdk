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
} from "@solana/web3.js";
import {
  STAKE_ACCOUNT_SIZE,
  METEORA_DLMM_PROGRAM,
  METEORA_POSITION_SIZE,
} from "../constants";
import { binIdToBinArrayIndex, deriveBinArray } from "@meteora-ag/dlmm";
import { BN } from "@coral-xyz/anchor";
import { GlamProtocolIdlJson } from "../glamExports";

export type StakeAccountInfo = {
  address: PublicKey;
  lamports: number;
  state: string;
  voter?: PublicKey; // if undefined, the stake account is not delegated
};

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

export async function fetchLookupTables(
  connection: Connection,
  authority: PublicKey,
  firstEntry: PublicKey,
): Promise<AddressLookupTableAccount[]> {
  const ALT_PROGRAM_ID = new PublicKey(
    "AddressLookupTab1e1111111111111111111111111",
  );

  // Fetch all accounts owned by the ALT program
  // This is currently disabled due to RPC error "Request deprioritized due to number of accounts requested. Slow down requests or add filters to narrow down results"
  // const accounts = await connection.getProgramAccounts(ALT_PROGRAM_ID, {
  //   filters: [
  //     { memcmp: { offset: 22, bytes: authority.toBase58() } },
  //     { memcmp: { offset: 56, bytes: firstEntry.toBase58() } }, // 1st entry in the table
  //   ],
  // });

  // return accounts.map(
  //   ({ pubkey, account }) =>
  //     new AddressLookupTableAccount({
  //       key: pubkey,
  //       state: AddressLookupTableAccount.deserialize(account.data),
  //     }),
  // );
  return [];
}

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

  console.log("error message found in program logs", errorMsgLog);

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

  const rpcResponse = await connection.simulateTransaction(testTx, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  const serializedTx = Buffer.from(testTx.serialize()).toString("base64");

  try {
    getErrorFromRPCResponse(rpcResponse);
  } catch (e) {
    return { error: e as Error, serializedTx };
  }
  return {
    unitsConsumed: rpcResponse.value.unitsConsumed,
    serializedTx,
  };
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
