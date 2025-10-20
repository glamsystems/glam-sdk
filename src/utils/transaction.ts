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
} from "@solana/web3.js";
import { GlamProtocolIdlJson } from "../glamExports";

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
    // Set an arbitrarily high number in simulation so we can be sure the transaction will succeed
    // and we get the real compute units used
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
    getErrorFromRpcResponse(rpcResponse);

    return {
      unitsConsumed: rpcResponse.value.unitsConsumed,
      serializedTx,
    };
  } catch (e) {
    return { error: e as Error, serializedTx };
  }
};

const getErrorFromRpcResponse = (
  rpcResponse: RpcResponseAndContext<SimulatedTransactionResponse>,
) => {
  // Note: `confirmTransaction` does not throw an error if the confirmation does not succeed,
  // but rather a `TransactionError` object. so we handle that here

  const error = rpcResponse.value.err;
  if (error) {
    // Can be a string or an object (literally just {}, no further typing is provided by the library)
    // https://github.com/solana-labs/solana-web3.js/blob/4436ba5189548fc3444a9f6efb51098272926945/packages/library-legacy/src/connection.ts#L2930
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
