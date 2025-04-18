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
  SignatureResult,
  StakeProgram,
} from "@solana/web3.js";
import {
  MARINADE_PROGRAM_ID,
  MARINADE_TICKET_SIZE,
  STAKE_ACCOUNT_SIZE,
  METEORA_DLMM_PROGRAM,
  METEORA_POSITION_SIZE,
  KAMINO_LENDING_PROGRAM,
  KAMINO_OBTRIGATION_SIZE,
} from "../constants";
import { binIdToBinArrayIndex, deriveBinArray } from "@meteora-ag/dlmm";
import { BN } from "@coral-xyz/anchor";

export const fetchStakeAccounts = async (
  connection: Connection,
  withdrawAuthority: PublicKey,
): Promise<PublicKey[]> => {
  const accounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          dataSize: STAKE_ACCOUNT_SIZE,
        },
        {
          memcmp: {
            offset: 12,
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

export const fetchMarinadeTicketAccounts = async (
  connection: Connection,
  beneficiary: PublicKey,
) =>
  await connection.getParsedProgramAccounts(MARINADE_PROGRAM_ID, {
    filters: [
      {
        dataSize: MARINADE_TICKET_SIZE,
      },
      {
        memcmp: {
          offset: 40,
          bytes: beneficiary.toBase58(),
        },
      },
    ],
  });

export const fetchKaminoObligations = async (
  connection: Connection,
  owner: PublicKey,
) => {
  const accounts = await connection.getParsedProgramAccounts(
    KAMINO_LENDING_PROGRAM,
    {
      filters: [
        {
          dataSize: KAMINO_OBTRIGATION_SIZE,
        },
        {
          memcmp: {
            offset: 64,
            bytes: owner.toBase58(),
          },
        },
      ],
    },
  );
  return accounts.map((a) => a.pubkey);
};

export const fetchMeteoraPositions = async (
  connection: Connection,
  owner: PublicKey,
) => {
  const accounts = await connection.getParsedProgramAccounts(
    METEORA_DLMM_PROGRAM,
    {
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
    },
  );
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

export const getSimulationComputeUnits = async (
  connection: Connection,
  instructions: Array<TransactionInstruction>,
  payer: PublicKey,
  lookupTables?: Array<AddressLookupTableAccount>,
): Promise<number | undefined> => {
  const testInstructions = [
    // Set an arbitrarily high number in simulation
    // so we can be sure the transaction will succeed
    // and get the real compute units used
    ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
    ...instructions,
  ];

  const testTransaction = new VersionedTransaction(
    new TransactionMessage({
      instructions: testInstructions,
      payerKey: payer,
      // RecentBlockhash can by any public key during simulation
      // since 'replaceRecentBlockhash' is set to 'true' below
      recentBlockhash: PublicKey.default.toString(),
    }).compileToV0Message(lookupTables),
  );

  const rpcResponse = await connection.simulateTransaction(testTransaction, {
    replaceRecentBlockhash: true,
    sigVerify: false,
  });

  getErrorFromRPCResponse(rpcResponse);
  return rpcResponse.value.unitsConsumed || undefined;
};

const getErrorFromRPCResponse = (
  rpcResponse: RpcResponseAndContext<
    SignatureResult | SimulatedTransactionResponse
  >,
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
        // [
        //   1,
        //   {
        //     "Custom": 1
        //   }
        // ]
        // See also https://solana.stackexchange.com/a/931/294
        throw new Error(
          `Error in transaction: instruction index ${instructionError[0]}, custom program error ${instructionError[1]["Custom"]}`,
        );
      }
    }
    throw Error(error.toString());
  }
};
