import { IdlTypes } from "@coral-xyz/anchor";
import { GlamMint } from "../glamExports";

// Request queue types
export type RequestQueue = IdlTypes<GlamMint>["requestQueue"];
export type PendingRequest = IdlTypes<GlamMint>["pendingRequest"];

// Enum classes
export class PriceDenom {
  static readonly SOL = { sol: {} };
  static readonly USD = { usd: {} };
}

export class TimeUnit {
  static readonly Slot = { slot: {} };
  static readonly Second = { second: {} };
}

export class VoteAuthorize {
  static readonly Voter = { voter: {} };
  static readonly Withdrawer = { withdrawer: {} };
}
