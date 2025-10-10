import { PublicKey } from "@solana/web3.js";
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
  initKey: Uint8Array | number[],
  owner: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [pda, _bump] = PublicKey.findProgramAddressSync(
    [Buffer.from(SEED_STATE), owner.toBuffer(), Uint8Array.from(initKey)],
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
