import {
  ComputeBudgetProgram,
  TransactionInstruction,
  VersionedTransaction,
} from "@solana/web3.js";

const DEFAULT_PRIORITY_FEE = 10_000; // microLamports

export type ComputeBudgetOptions = {
  vTx?: VersionedTransaction;
  getPriorityFeeMicroLamports?: (tx: VersionedTransaction) => Promise<number>;
  maxFeeLamports?: number;
  useMaxFee?: boolean;
};

/**
 * Builds compute budget instructions for a transaction
 *
 * @param vTx The versioned transaction to build compute budget for
 * @param computeUnitLimit The compute unit limit
 * @param options Optional priority fee configuration
 * @returns Array of compute budget instructions
 */
export async function buildComputeBudgetInstructions(
  computeUnitLimit: number,
  options?: ComputeBudgetOptions,
): Promise<Array<TransactionInstruction>> {
  const {
    vTx,
    getPriorityFeeMicroLamports,
    maxFeeLamports,
    useMaxFee = false,
  } = options || {};

  // ComputeBudgetProgram.setComputeUnitLimit costs 150 CUs
  // Add 20% more CUs to account for variable execution
  computeUnitLimit += 150;
  computeUnitLimit *= 1.2;

  let priorityFeeMicroLamports = DEFAULT_PRIORITY_FEE;
  if (useMaxFee && maxFeeLamports) {
    priorityFeeMicroLamports = Math.ceil(
      (maxFeeLamports * 1_000_000) / computeUnitLimit,
    );
  } else if (getPriorityFeeMicroLamports && vTx) {
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
    } catch {}
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
