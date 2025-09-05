import { BN } from "@coral-xyz/anchor";
import {
  struct,
  u32,
  u64,
  vec,
  bool,
  publicKey,
  option,
} from "@coral-xyz/borsh";
import { PublicKey } from "@solana/web3.js";

export const MintPolicyLayout = struct([
  u32("lockupPeriod"),
  u64("maxCap"),
  u64("minSubscription"),
  u64("minRedemption"),
  bool("subscriptionPaused"),
  bool("redemptionPaused"),
  u64("reserved"),
  option(vec(publicKey()), "allowlist"),
  option(vec(publicKey()), "blocklist"),
]);

export interface MintPolicy {
  lockupPeriod: number;
  maxCap: BN;
  minSubscription: BN;
  minRedemption: BN;
  subscriptionPaused: boolean;
  redemptionPaused: boolean;
  reserved: BN;
  allowlist: PublicKey[] | null;
  blocklist: PublicKey[] | null;
}

export function encodeMintPolicy(policy: MintPolicy): Buffer {
  // Calculate the required buffer size
  // Fixed fields: 4 + 8 + 8 + 8 + 1 + 1 + 8 = 38 bytes
  // Variable fields: allowlist and blocklist (1 byte option flag + 4 bytes length + 32 bytes per pubkey)
  const allowlistSize = policy.allowlist
    ? 1 + 4 + policy.allowlist.length * 32
    : 1;
  const blocklistSize = policy.blocklist
    ? 1 + 4 + policy.blocklist.length * 32
    : 1;
  const totalSize = 38 + allowlistSize + blocklistSize;

  const buffer = Buffer.alloc(totalSize);
  MintPolicyLayout.encode(policy, buffer);
  return buffer;
}

export interface TransferPolicy {
  allowlist: PublicKey[];
}

export const TransferPolicyLayout = struct([vec(publicKey(), "allowlist")]);

export function encodeTransferPolicy(allowlist: PublicKey[]): Buffer {
  const header = Buffer.alloc(4);
  header.writeUInt32LE(allowlist.length, 0);

  const allowlistBuffer = Buffer.alloc(allowlist.length * 32);
  for (let i = 0; i < allowlist.length; i++) {
    allowlist[i].toBuffer().copy(allowlistBuffer, i * 32);
  }

  return Buffer.concat([header, allowlistBuffer]);
}
