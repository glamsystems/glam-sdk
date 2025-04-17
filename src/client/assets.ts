import { PublicKey } from "@solana/web3.js";

/**
 * Metadata for an asset for pricing
 */
export class AssetMeta {
  decimals: number;
  oracle: PublicKey;
  programId?: PublicKey;
}

export const ASSETS_MAINNET: Map<string, AssetMeta> = new Map([
  [
    // SOL
    "So11111111111111111111111111111111111111112",
    {
      decimals: 9,
      oracle: new PublicKey("3m6i4RFWEDw2Ft4tFHPJtYgmpPe21k56M3FHeWYrgGBz"),
    },
  ],
  [
    // wBTC
    "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    {
      decimals: 8,
      oracle: new PublicKey("fqPfDa6uQr9ndMvwaFp4mUBeUrHmLop8Jxfb1XJNmVm"),
    },
  ],
  [
    // JUP
    "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    {
      decimals: 6,
      oracle: new PublicKey("DXqKSHyhTBKEW4qgnL7ycbf3Jca5hCvUgWHFYWsh4KJa"),
    },
  ],
  [
    // JLP
    "27G8MtK7VtTcCHkpASjSDdkWWYfoqT6ggEuKidVJidD4",
    {
      decimals: 6,
      oracle: new PublicKey("5Mb11e5rt1Sp6A286B145E4TmgMzsM2UX9nCF2vas5bs"),
    },
  ],
  [
    // USDC
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    {
      decimals: 6,
      oracle: new PublicKey("9VCioxmni2gDLv11qufWzT3RDERhQE4iY5Gf7NTfYyAV"),
    },
  ],
  [
    // mSOL
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    {
      decimals: 9,
      // oracle: new PublicKey("FAq7hqjn7FWGXKDwJHzsXGgBcydGTcK4kziJpAGWXjDb"), // drift pyth
      oracle: new PublicKey("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC"),
    },
  ],
  [
    // jitoSOL
    "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    {
      decimals: 9,
      // oracle: new PublicKey("9QE1P5EfzthYDgoQ9oPeTByCEKaRJeZbVVqKJfgU9iau"), // drift pyth
      oracle: new PublicKey("Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb"),
    },
  ],
  [
    // bonkSOL
    "BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs",
    {
      decimals: 9,
      oracle: new PublicKey("ArAQfbzsdotoKB5jJcZa3ajQrrPcWr2YQoDAEAiFxJAC"),
    },
  ],
  [
    // dSOL
    "Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ",
    {
      decimals: 9,
      oracle: new PublicKey("4YstsHafLyDbYFxmJbgoEr33iJJEp6rNPgLTQRgXDkG2"),
    },
  ],
]);

export const ASSETS_TESTS: Map<string, AssetMeta> = new Map([]);

export const SOL_ORACLE = ASSETS_MAINNET.get(
  "So11111111111111111111111111111111111111112",
)!.oracle;
