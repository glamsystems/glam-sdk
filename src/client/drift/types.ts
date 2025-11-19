import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  OracleSource,
  SpotPosition,
  PerpPosition,
  MarginMode,
  Order,
} from "../../utils/drift/types";

export const DRIFT_SIGNER = new PublicKey(
  "JCNCMFXo5M5qwUPg2Utu1u6YWp3MbygxqBsBeXXJfrw",
);
export const DRIFT_MARGIN_PRECISION = 10_000;

export interface OrderConstants {
  perpBaseScale: number;
  quoteScale: number;
}

export interface SpotMarket {
  name: string;
  marketIndex: number;
  poolId: number;
  marketPda: PublicKey;
  vault: PublicKey;
  oracle: PublicKey;
  oracleSource: OracleSource;
  mint: PublicKey;
  decimals: number;
  tokenProgram: PublicKey;
  cumulativeDepositInterest: BN;
  cumulativeBorrowInterest: BN;
}

export interface PerpMarket {
  name: string;
  marketIndex: number;
  marketPda: PublicKey;
  oracle: PublicKey;
  oracleSource: OracleSource;
}

export interface DriftMarketConfigs {
  orderConstants: OrderConstants;
  perpMarkets: PerpMarket[];
  spotMarkets: SpotMarket[];
}

export interface DriftUser {
  delegate: PublicKey;
  name: string;
  spotPositions: (SpotPosition & {
    amount: number;
    uiAmount: number;
    mint: PublicKey;
    decimals: number;
    marketName: string;
  })[];
  perpPositions: PerpPosition[];
  marginMode: MarginMode;
  subAccountId: number;
  isMarginTradingEnabled: boolean;
  maxMarginRatio: number;
  orders: Order[];
  poolId: number;
}
