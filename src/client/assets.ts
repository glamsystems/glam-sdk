import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { LstList } from "@glamsystems/sanctum-lst-list";

export const STAKE_POOLS = LstList.filter(
  (lst) =>
    lst.pool.program === "Spl" ||
    lst.pool.program === "Marinade" ||
    lst.pool.program === "SanctumSpl" ||
    lst.pool.program === "SanctumSplMulti",
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

export const STAKE_POOLS_MAP = new Map(STAKE_POOLS.map((p) => [p.mint, p]));

/**
 * Metadata for an asset for pricing
 */
export interface AssetMeta {
  decimals: number;
  oracle: PublicKey;
  programId?: PublicKey;
  isLst?: boolean;
  aggIndex?: number;
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
    // USDG
    "2u1tszSeqZ3qBWF3uNGPFc8TzMk2tdiwknnRMWGWjGWH",
    {
      decimals: 6,
      oracle: new PublicKey("6JkZmXGgWnzsyTQaqRARzP64iFYnpMNT4siiuUDUaB8s"),
      programId: TOKEN_2022_PROGRAM_ID,
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
  [
    // GOOGLx
    "XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN",
    {
      decimals: 8,
      oracle: new PublicKey("3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C"), // scope prices
      programId: TOKEN_2022_PROGRAM_ID,
      aggIndex: 342,
    },
  ],
  [
    // AAPLx
    "XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp",
    {
      decimals: 8,
      oracle: new PublicKey("3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C"), // scope prices
      programId: TOKEN_2022_PROGRAM_ID,
      aggIndex: 343,
    },
  ],
  [
    // TSLAx
    "XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB",
    {
      decimals: 8,
      oracle: new PublicKey("3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C"), // scope prices
      programId: TOKEN_2022_PROGRAM_ID,
      aggIndex: 335,
    },
  ],
  [
    // NVDAx
    "Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh",
    {
      decimals: 8,
      oracle: new PublicKey("3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C"), // scope prices
      programId: TOKEN_2022_PROGRAM_ID,
      aggIndex: 341,
    },
  ],
  [
    // sUSD (Token-2022)
    "susdabGDNbhrnCa6ncrYo81u4s9GM8ecK2UwMyZiq4X",
    {
      decimals: 6,
      oracle: new PublicKey("EkHtcxYSf5hTScCgPUULtf7LR95YcEED5NQBfuKDiHS5"),
      programId: TOKEN_2022_PROGRAM_ID,
    },
  ],
  [
    // JTO
    "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    {
      decimals: 9,
      oracle: new PublicKey("A9RnpLxxtAS2TR3HtSMNJfsKpRPvkLbBkGZ6gKziSPLr"),
    },
  ],
  [
    // CLOUD
    "CLoUDKc4Ane7HeQcPpE3YHnznRxhMimJ4MyaUqyHFzAu",
    {
      decimals: 9,
      oracle: new PublicKey("Ao6twJD3Ky5iX9oWWesvXGtzEimXwnJC1okSJDcaSYac"),
    },
  ],
  [
    // BONK
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    {
      decimals: 5,
      oracle: new PublicKey("GhYg3R1V6DmJbwuc57qZeoYG6gUuvCotUF1zU3WCj98U"),
    },
  ],
  [
    // JupSOL
    "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
    {
      decimals: 9,
      oracle: new PublicKey("BRCWKZ1PevwTFzBL2MLZM5hMwCNMWE8NYuS6zFPaXZ6y"),
    },
  ],
  [
    // LST (custom)
    "LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
    {
      decimals: 9,
      oracle: new PublicKey("BWK8Wnybb7rPteNMqJs9uWoqdfYApNym6WgE59BwLe1v"),
    },
  ],
  [
    // wBTC variant (9n4n)
    "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E",
    {
      decimals: 6,
      oracle: new PublicKey("fqPfDa6uQr9ndMvwaFp4mUBeUrHmLop8Jxfb1XJNmVm"),
    },
  ],
  [
    // JUP token-2022 variant
    "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",
    {
      decimals: 6,
      oracle: new PublicKey("DXqKSHyhTBKEW4qgnL7ycbf3Jca5hCvUgWHFYWsh4KJa"),
      programId: TOKEN_2022_PROGRAM_ID,
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
