import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import Decimal from "decimal.js";
import { BigFractionBytes } from "../../utils";

export const DEFAULT_OBLIGATION_ARGS = { tag: 0, id: 0 };
export const EVENT_AUTHORITY = new PublicKey(
  "24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK",
);

export interface RefreshObligationAccounts {
  lendingMarket: PublicKey;
  obligation: PublicKey;
  reserves: PublicKey[];
}

export interface RefreshReserveAccounts {
  reserve: PublicKey;
  lendingMarket: PublicKey;
  pythOracle: PublicKey;
  switchboardPriceOracle: PublicKey;
  switchboardTwapOracle: PublicKey;
  scopePrices: PublicKey;
}

export interface RefreshObligationFarmsForReserveArgs {
  mode: number; // 0 collateral farm, 1 debt farm
}

export interface RefreshObligationFarmsForReserveAccounts {
  crank: PublicKey;
  baseAccounts: {
    obligation: PublicKey;
    lendingMarketAuthority: PublicKey;
    reserve: PublicKey;
    reserveFarmState: PublicKey;
    obligationFarmUserState: PublicKey;
    lendingMarket: PublicKey;
  };
  farmsProgram: PublicKey;
  rent: PublicKey;
  systemProgram: PublicKey;
}

export interface ParsedReserve {
  address: PublicKey;
  market: PublicKey;
  farmCollateral: PublicKey | null;
  farmDebt: PublicKey | null;
  liquidityMint: PublicKey;
  liquidityMintDecimals: number;
  liquiditySupplyVault: PublicKey;
  collateralMint: PublicKey;
  collateralSupplyVault: PublicKey;
  scopePriceFeed: PublicKey;
  feeVault: PublicKey;
  collateralExchangeRate: Decimal;
  cumulativeBorrowRate: Decimal;
}

export interface ParsedObligation {
  address: PublicKey;
  lendingMarket: PublicKey;
  deposits: { reserve: PublicKey; depositedAmount: BN; marketValueSf: BN }[];
  borrows: {
    reserve: PublicKey;
    borrowedAmountSf: BN;
    marketValueSf: BN;
    cumulativeBorrowRateBsf: BigFractionBytes;
  }[];
}

export interface ParsedFarmState {
  globalConfig: PublicKey;
  farmTokenMint: PublicKey;
  farmTokenDecimals: BN;
  farmTokenProgram: PublicKey;
  farmVault: PublicKey;
  rewards: {
    index: number;
    mint: PublicKey;
    minClaimDurationSeconds: BN;
    tokenProgram: PublicKey;
    rewardsVault: PublicKey;
  }[];
}

export interface ParsedFarmUser {
  pubkey: PublicKey;
  farmState: PublicKey;
  unclaimedRewards: BN[];
}
