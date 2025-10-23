import { IdlTypes } from "@coral-xyz/anchor";
import { GlamMint } from "../glamExports";
import { PublicKey } from "@solana/web3.js";
import { USDC, WSOL } from "../constants";

// Request queue types
export type RequestQueue = IdlTypes<GlamMint>["requestQueue"];
export type PendingRequest = IdlTypes<GlamMint>["pendingRequest"];

// Enum classes
export class PriceDenom {
  static readonly SOL = { sol: {} };
  static readonly USD = { usd: {} };
  static readonly ASSET = { asset6: {} };

  static fromAsset(asset: PublicKey) {
    if (asset.equals(WSOL)) {
      return PriceDenom.SOL;
    }
    if (asset.equals(USDC)) {
      return PriceDenom.USD;
    }
    return PriceDenom.ASSET;
  }

  static fromString(str: string) {
    if (str === "SOL") {
      return PriceDenom.SOL;
    }
    if (str === "USD") {
      return PriceDenom.USD;
    }
    throw new Error("Invalid price denomination");
  }
}

export class TimeUnit {
  static readonly Slot = { slot: {} };
  static readonly Second = { second: {} };
}

export class VoteAuthorize {
  static readonly Voter = { voter: {} };
  static readonly Withdrawer = { withdrawer: {} };
}
