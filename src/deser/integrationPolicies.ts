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

export function decodeTransferPolicy(
  buffer: Buffer<ArrayBufferLike>,
): TransferPolicy {
  const allowlist = [];
  let offset = 0;
  const allowlistLength = buffer.readUInt32LE(offset);
  offset += 4;
  for (let i = 0; i < allowlistLength; i++) {
    const publicKey = new PublicKey(buffer.subarray(offset, offset + 32));
    offset += 32;
    allowlist.push(publicKey);
  }
  return { allowlist };
}
