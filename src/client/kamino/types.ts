import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export const DEFAULT_OBLIGATION_ARGS = { tag: 0, id: 0 };
export const KAMINO_VAULTS_EVENT_AUTHORITY = new PublicKey(
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
