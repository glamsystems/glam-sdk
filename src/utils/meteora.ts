import { Connection, PublicKey } from "@solana/web3.js";
import { METEORA_DLMM_PROGRAM, METEORA_POSITION_SIZE } from "../constants";
import { binIdToBinArrayIndex, deriveBinArray } from "@meteora-ag/dlmm";
import { BN } from "@coral-xyz/anchor";

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
