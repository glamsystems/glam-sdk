import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { LstList } from "sanctum-lst-list";

export const STAKE_POOLS = LstList.filter(
  (lst) =>
    !lst.name.includes("Sanctum Automated") &&
    (lst.pool.program === "Spl" ||
      lst.pool.program === "Marinade" ||
      lst.pool.program === "SanctumSpl" ||
      lst.pool.program === "SanctumSplMulti"),
).map((lst) => {
  const { pool, program } = lst.pool as any;
  const poolState =
    program === "Marinade"
      ? "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC"
      : pool;
  if (!poolState) {
    throw new Error("Invalid pool state for LST: " + lst.name);
  }

  return {
    name: lst.name,
    symbol: lst.symbol,
    mint: lst.mint,
    decimals: lst.decimals,
    logoURI: lst.logoUri,
    tokenProgram: new PublicKey(lst.tokenProgram),
    poolState: new PublicKey(poolState),
  };
});
STAKE_POOLS.push({
  name: "Phantom Staked SOL",
  symbol: "PSOL",
  mint: "pSo1f9nQXWgXibFtKf7NWYxb5enAM4qfP6UJSiXRQfL",
  decimals: 9,
  logoURI: "https://assets.phantom.app/assets/metadata/PSOL-512.png",
  tokenProgram: TOKEN_PROGRAM_ID,
  poolState: new PublicKey("pSPcvR8GmG9aKDUbn9nbKYjkxt9hxMS7kF1qqKJaPqJ"),
});

export const STAKE_POOLS_MAP = new Map(STAKE_POOLS.map((p) => [p.mint, p]));

/**
 * Metadata for an asset for pricing
 */
export interface AssetMeta {
  decimals: number;
  oracle: PublicKey;
  programId?: PublicKey;
  isLst?: boolean;
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
    // cbBTC
    "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij",
    {
      decimals: 8,
      oracle: new PublicKey("9jPy6EHpLkXaMdvfkoVnRnSdJoQysQDKKj3bW5Amz4Ci"),
    },
  ],
  [
    // wETH
    "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    {
      decimals: 8,
      oracle: new PublicKey("6bEp2MiyoiiiDxcVqE8rUHQWwHirXUXtKfAEATTVqNzT"),
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
    // USDT
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    {
      decimals: 6,
      oracle: new PublicKey("JDKJSkxjasBGL3ce1pkrN6tqDzuVUZPWzzkGuyX8m9yN"),
    },
  ],
  [
    // USDY
    "A1KLoBrKBde8Ty9qtNQUtq3C2ortoC3u7twggz7sEto6",
    {
      decimals: 6,
      oracle: new PublicKey("9PgHM68FNGDK6nHb29ERDBcFrV6gNMD8LyUqwxbyyeb2"),
    },
  ],
  [
    // PYUSD
    "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    {
      decimals: 6,
      oracle: new PublicKey("5QZMnsyndmphvZF4BNgoMHwVZaREXeE2rpBoCPMxgCCd"),
      programId: TOKEN_2022_PROGRAM_ID,
    },
  ],
  [
    // USDe
    "DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT",
    {
      decimals: 6,
      oracle: new PublicKey("5uR6oza6teuMRpjsbMi9fDhCDid2hoYdRBiLW7WzcK54"),
    },
  ],
  [
    // sUSDe
    "Eh6XEPhSwoLv5wFApukmnaVSHQ6sAnoD9BmgmwQoN2sN",
    {
      decimals: 6,
      oracle: new PublicKey("BRuNuzLAPHHGSSVAJPKMcmJMdgDfrekvnSxkxPDGdeqp"),
    },
  ],
  [
    // USDS
    "USDSwr9ApdHk5bvJKMjzff41FfuX8bSxdKcR81vTwcA",
    {
      decimals: 6,
      oracle: new PublicKey("7pT9mxKXyvfaZKeKy1oe2oV2K1RFtF7tPEJHUY3h2vVV"),
    },
  ],
  [
    // mSOL
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    {
      decimals: 9,
      oracle: new PublicKey("8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC"),
    },
  ],
  [
    // jitoSOL
    "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    {
      decimals: 9,
      oracle: new PublicKey("Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb"), // state
      isLst: true,
    },
  ],
  [
    // bonkSOL
    "BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs",
    {
      decimals: 9,
      oracle: new PublicKey("ArAQfbzsdotoKB5jJcZa3ajQrrPcWr2YQoDAEAiFxJAC"), // state
      isLst: true,
    },
  ],
  [
    // dSOL
    "Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ",
    {
      decimals: 9,
      oracle: new PublicKey("9mhGNSPArRMHpLDMSmxAvuoizBqtBGqYdT8WGuqgxNdn"), // state
      isLst: true,
    },
  ],
]);

export const ASSETS_TESTS: Map<string, AssetMeta> = new Map([]);

export const SOL_ORACLE = ASSETS_MAINNET.get(
  "So11111111111111111111111111111111111111112",
)!.oracle;
export const USDC_ORACLE = ASSETS_MAINNET.get(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
)!.oracle;
