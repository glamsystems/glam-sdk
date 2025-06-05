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

export const DriftVaultLayout = struct([
  array(u8(), 8, "discriminator"),
  // Basic vault info
  array(u8(), 32, "name"), // [u8; 32]
  publicKey("pubkey"),
  publicKey("manager"),
  publicKey("tokenAccount"),
  publicKey("userStats"),
  publicKey("user"),
  publicKey("delegate"),
  publicKey("liquidationDelegate"),

  // Share accounting
  u128("userShares"),
  u128("totalShares"),

  // Timestamps
  i64("lastFeeUpdateTs"),
  i64("liquidationStartTs"),
  i64("redeemPeriod"),

  // Withdrawal tracking
  u64("totalWithdrawRequested"),

  // Capacity and fees
  u64("maxTokens"),
  i64("managementFee"),
  i64("initTs"),

  // Deposit/withdrawal accounting
  i64("netDeposits"),
  i64("managerNetDeposits"),
  u64("totalDeposits"),
  u64("totalWithdraws"),
  u64("managerTotalDeposits"),
  u64("managerTotalWithdraws"),
  i64("managerTotalFee"),
  i64("managerTotalProfitShare"),
  u64("minDepositAmount"),

  // Manager withdraw request
  struct(
    [u128("shares"), u64("amount"), i64("ts")],
    "lastManagerWithdrawRequest",
  ),

  // Configuration
  u32("sharesBase"),
  u32("profitShare"),
  u32("hurdleRate"),
  u16("spotMarketIndex"),
  u8("bump"),
  bool("permissioned"),

  // Final padding
  array(u64(), 8, "padding"), // [u64; 8]
]);

export interface DriftVault {
  discriminator: number[];
  name: number[];
  pubkey: PublicKey;
  manager: PublicKey;
  tokenAccount: PublicKey;
  userStats: PublicKey;
  user: PublicKey;
  delegate: PublicKey;
  liquidationDelegate: PublicKey;
  userShares: BN;
  totalShares: BN;
  lastFeeUpdateTs: BN;
  liquidationStartTs: BN;
  redeemPeriod: BN;
  totalWithdrawRequested: BN;
  maxTokens: BN;
  managementFee: BN;
  initTs: BN;
  netDeposits: BN;
  managerNetDeposits: BN;
  totalDeposits: BN;
  totalWithdraws: BN;
  managerTotalDeposits: BN;
  managerTotalWithdraws: BN;
  managerTotalFee: BN;
  managerTotalProfitShare: BN;
  minDepositAmount: BN;
  lastManagerWithdrawRequest: {
    shares: BN;
    amount: BN;
    ts: BN;
  };
  sharesBase: number;
  profitShare: number;
  hurdleRate: number;
  spotMarketIndex: number;
  bump: number;
  permissioned: boolean;
  padding: bigint[];
}
