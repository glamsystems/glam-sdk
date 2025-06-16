import {
  struct,
  u8,
  u16,
  u32,
  u64,
  u128,
  i64,
  bool,
  publicKey,
  array,
} from "@coral-xyz/borsh";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

const MAX_RESERVES = 25;

export const VaultAllocationLayout = struct([
  publicKey("reserve"),
  publicKey("ctokenVault"),
  u64("targetAllocationWeight"),
  u64("tokenAllocationCap"),
  u64("ctokenVaultBump"),

  array(u64(), 127, "configPadding"),

  u64("ctokenAllocation"),
  u64("lastInvestSlot"),
  u128("tokenTargetAllocationSf"),

  array(u64(), 128, "statePadding"),
]);

export const KVaultStateLayout = struct([
  array(u8(), 8, "discriminator"),

  // Admin
  publicKey("vaultAdminAuthority"),

  publicKey("baseVaultAuthority"),
  u64("baseVaultAuthorityBump"),

  publicKey("tokenMint"),
  u64("tokenMintDecimals"),
  publicKey("tokenVault"),
  publicKey("tokenProgram"),

  // shares
  publicKey("sharesMint"),
  u64("sharesMintDecimals"),

  // accounting
  u64("tokenAvailable"),
  u64("sharesIssued"),

  u64("availableCrankFunds"),
  u64("padding0"),

  u64("performanceFeeBps"),
  u64("managementFeeBps"),
  u64("lastFeeChargeTimestamp"),
  u128("prevAumSf"),
  u128("pendingFeesSf"),

  array(VaultAllocationLayout, MAX_RESERVES, "vaultAllocationStrategy"),
  array(u128(), 256, "padding1"),

  // General config
  u64("minDepositAmount"),
  u64("minWithdrawAmount"),
  u64("minInvestAmount"),
  u64("minInvestDelaySlots"),
  u64("crankFundFeePerReserve"),

  publicKey("pendingAdmin"),

  u128("cumulativeEarnedInterestSf"),
  u128("cumulativeMgmtFeesSf"),
  u128("cumulativePerfFeesSf"),

  array(u8(), 40, "name"),
  publicKey("vaultLookupTable"),
  publicKey("vaultFarm"),

  u64("creationTimestamp"),

  u64("padding2"),
  publicKey("allocationAdmin"),

  array(u128(), 242, "padding3"),
]);

export interface KVaultAllocation {
  reserve: PublicKey;
  ctokenVault: PublicKey;
  targetAllocationWeight: BN;
  tokenAllocationCap: BN;
  ctokenVaultBump: BN;

  configPadding: BN[];

  ctokenAllocation: BN;
  lastInvestSlot: BN;
  tokenTargetAllocationSf: BN;

  statePadding: BN[];
}

export interface KVaultState {
  discriminator: number[];

  // Admin
  vaultAdminAuthority: PublicKey;

  baseVaultAuthority: PublicKey;
  baseVaultAuthorityBump: BN;

  tokenMint: PublicKey;
  tokenMintDecimals: BN;
  tokenVault: PublicKey;
  tokenProgram: PublicKey;

  // shares
  sharesMint: PublicKey;
  sharesMintDecimals: BN;

  // accounting
  tokenAvailable: BN;
  sharesIssued: BN;

  availableCrankFunds: BN;
  padding0: BN;

  performanceFeeBps: BN;
  managementFeeBps: BN;
  lastFeeChargeTimestamp: BN;
  prevAumSf: BN;
  pendingFeesSf: BN;

  vaultAllocationStrategy: KVaultAllocation[];
  padding1: BN[];

  // General config
  minDepositAmount: BN;
  minWithdrawAmount: BN;
  minInvestAmount: BN;
  minInvestDelaySlots: BN;
  crankFundFeePerReserve: BN;

  pendingAdmin: PublicKey;

  cumulativeEarnedInterestSf: BN;
  cumulativeMgmtFeesSf: BN;
  cumulativePerfFeesSf: BN;

  name: number[];
  vaultLookupTable: PublicKey;
  vaultFarm: PublicKey;

  creationTimestamp: BN;

  padding2: BN;
  allocationAdmin: PublicKey;

  padding3: BN[];
}
