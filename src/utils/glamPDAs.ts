import { PublicKey } from "@solana/web3.js";
import { StateModel } from "../models";
import * as anchor from "@coral-xyz/anchor";
import {
  SEED_ACCOUNT_POLICY,
  SEED_ESCROW,
  SEED_EXTRA_ACCOUNT_METAS,
  SEED_METADATA,
  SEED_MINT,
  SEED_REQUEST_QUEUE,
  SEED_STATE,
  SEED_VAULT,
  TRANSFER_HOOK_PROGRAM,
} from "../constants";

export function getStatePda(
  stateModel: Partial<StateModel>,
  programId: PublicKey,
  owner?: PublicKey,
): PublicKey {
  if (!stateModel?.created?.key && !stateModel?.name) {
    throw new Error("State model must have created key or name");
  }

  const createdKey = stateModel?.created?.key || [
    ...Buffer.from(anchor.utils.sha256.hash(stateModel?.name!)).subarray(0, 8),
  ];

  const _owner = owner || stateModel?.owner?.pubkey;
  if (!_owner) {
    throw new Error("Owner must be specified explicitly or set in state model");
  }

  const [pda, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_STATE), _owner.toBuffer(), Uint8Array.from(createdKey)],
    programId,
  );
  return pda;
}

export function getVaultPda(
  statePda: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [pda, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_VAULT), statePda.toBuffer()],
    programId,
  );
  return pda;
}

export function getOpenfundsPda(
  statePda: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [pda, _] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_METADATA), statePda.toBuffer()],
    programId,
  );
  return pda;
}

export function getMintPda(
  statePda: PublicKey,
  mintIdx: number,
  programId: PublicKey,
): PublicKey {
  const [pda, _] = PublicKey.findProgramAddressSync(
    [
      Buffer.from(SEED_MINT),
      Uint8Array.from([mintIdx % 256]),
      statePda.toBuffer(),
    ],
    programId,
  );
  return pda;
}

export function getEscrowPda(
  mintPda: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [pda, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ESCROW), mintPda.toBuffer()],
    programId,
  );
  return pda;
}

export function getRequestQueuePda(
  glamMint: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [pda, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_REQUEST_QUEUE), glamMint.toBuffer()],
    programId,
  );
  return pda;
}

export function getExtraMetasPda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_EXTRA_ACCOUNT_METAS), mint.toBuffer()],
    TRANSFER_HOOK_PROGRAM,
  )[0];
}

export function getAccountPolicyPda(tokenAccount: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_ACCOUNT_POLICY), tokenAccount.toBuffer()],
    TRANSFER_HOOK_PROGRAM,
  )[0];
}
