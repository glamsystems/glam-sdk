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
import { charsToName } from "../utils/helpers";

export class DriftVault {
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
  vaultProtocol: boolean;
  fuelDistributionMode: number;
  feeUpdateStatus: number;
  padding1: number;
  lastCumulativeFuelPerShareTs: number;
  cumulativeFuelPerShare: BN;
  cumulativeFuel: BN;
  padding: BN[];

  static _layout = struct([
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
    bool("vaultProtocol"),
    u8("fuelDistributionMode"),
    u8("feeUpdateStatus"),
    u8("padding1"),
    u32("lastCumulativeFuelPerShareTs"),
    u128("cumulativeFuelPerShare"),
    u128("cumulativeFuel"),

    // Final padding
    array(u64(), 3, "padding"), // [u64; 3]
  ]);

  static decode(buffer: Buffer): DriftVault {
    const data = DriftVault._layout.decode(buffer);
    const instance = new DriftVault();
    Object.assign(instance, data);
    return instance;
  }

  get nameStr(): string {
    return charsToName(this.name);
  }
}

export class DriftSpotMarket {
  discriminator: number[];
  marketPda: PublicKey;
  oracle: PublicKey;
  mint: PublicKey;
  vault: PublicKey;
  name: number[];
  padding1: number[];
  cumulativeDepositInterest: BN;
  cumulativeBorrowInterest: BN;
  padding2: number[];
  decimals: number;
  marketIndex: number;
  padding3: number;
  oracleSource: number;
  padding4: number[];
  tokenProgram: number;
  poolId: number;
  padding5: number[];

  static _layout = struct([
    array(u8(), 8, "discriminator"),
    publicKey("marketPda"),
    publicKey("oracle"),
    publicKey("mint"),
    publicKey("vault"),

    array(u8(), 32, "name"),

    // Padding for bytes between name and cumulativeDepositInterest
    array(u8(), 464 - 168, "padding1"),

    u128("cumulativeDepositInterest"),
    u128("cumulativeBorrowInterest"),

    // Padding for bytes between cumulativeBorrowInterest and decimals
    array(u8(), 680 - 496, "padding2"),

    u32("decimals"), // [680, 684)
    u16("marketIndex"), // [684, 686)
    u8("padding3"), // [686, 687)
    u8("oracleSource"), // [687, 688)
    array(u8(), 46, "padding4"), // [688, 734)
    u8("tokenProgram"), // [734, 735)
    u8("poolId"), // [735, 736)
    array(u8(), 40, "padding5"), // [736, 776)
  ]);

  static decode(buffer: Buffer): DriftSpotMarket {
    const data = DriftSpotMarket._layout.decode(buffer);
    const instance = new DriftSpotMarket();
    Object.assign(instance, data);
    return instance;
  }

  get nameStr(): string {
    return charsToName(this.name);
  }
}

export class DriftPerpMarket {
  discriminator: number[];
  marketPda: PublicKey;
  oracle: PublicKey;
  padding1: number[];
  oracleSource: number;
  padding2: number[];
  name: number[];
  padding3: number[];
  marketIndex: number;

  static _layout = struct([
    array(u8(), 8, "discriminator"), // [0, 8)
    publicKey("marketPda"), // [8, 40)
    publicKey("oracle"), // [40, 72)

    array(u8(), 854, "padding1"), // [72, 926)
    u8("oracleSource"), // [926, 927)
    array(u8(), 73, "padding2"), // [927, 1000)
    array(u8(), 32, "name"), // [1000, 1032)
    array(u8(), 128, "padding3"), // [1032, 1160)
    u16("marketIndex"), // [1160, 1162)
  ]);

  static decode(buffer: Buffer): DriftPerpMarket {
    const data = DriftPerpMarket._layout.decode(buffer);
    const instance = new DriftPerpMarket();
    Object.assign(instance, data);
    return instance;
  }

  get nameStr(): string {
    return charsToName(this.name);
  }
}
