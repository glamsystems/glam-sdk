import * as anchor from "@coral-xyz/anchor";
import { BlockhashWithExpiryBlockHeight } from "@solana/web3.js";

type CachedBlockhash = {
  blockhash: BlockhashWithExpiryBlockHeight;
  expiresAt: number; // in milliseconds
};

export class BlockhashWithCache {
  private cachedBlockhash: CachedBlockhash | null = null;
  private fetchPromise: Promise<BlockhashWithExpiryBlockHeight> | null = null;

  constructor(
    readonly provider: anchor.Provider,
    readonly ttl: number = 5_000,
  ) {}

  async get(): Promise<BlockhashWithExpiryBlockHeight> {
    // Check cache first
    if (this.cachedBlockhash) {
      const { blockhash, expiresAt } = this.cachedBlockhash;
      if (expiresAt > Date.now()) {
        return blockhash;
      }
    }

    // If already fetching, wait for that request to avoid race condition
    if (this.fetchPromise) {
      return this.fetchPromise;
    }

    // Start new fetch
    this.fetchPromise = this.provider.connection
      .getLatestBlockhash()
      .then((latestBlockhash) => {
        this.cachedBlockhash = {
          blockhash: latestBlockhash,
          expiresAt: Date.now() + this.ttl,
        };
        this.fetchPromise = null;
        return latestBlockhash;
      })
      .catch((error) => {
        this.fetchPromise = null;
        throw error;
      });

    return this.fetchPromise;
  }

  clear(): void {
    this.cachedBlockhash = null;
    this.fetchPromise = null;
  }
}
