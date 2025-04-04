import { PublicKey } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

/**
 * Metadata for an asset for pricing
 */
export class AssetMeta {
  pricingAccount?: PublicKey;
  stateAccount?: PublicKey;
  priceFeed?: string;
  programId?: PublicKey;
}

/**
 * We use sponsored feed listed on https://docs.pyth.network/price-feeds/sponsored-feeds/solana for popular tokens.
 *
 * For PYUSD, we use the price feed from Drift.
 * For LSTs, we use the state account to calculate the price based on the number of SOLs locked.
 */
export const ASSETS_MAINNET: Map<string, AssetMeta> = new Map([
  [
    // wSOL
    "So11111111111111111111111111111111111111112",
    {
      pricingAccount: new PublicKey(
        "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE", // pyth
      ),
      priceFeed:
        "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    },
  ],
  [
    // USDC
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    {
      pricingAccount: new PublicKey(
        "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX", // pyth
      ),
      priceFeed:
        "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",
    },
  ],
  [
    // USDT
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    {
      pricingAccount: new PublicKey(
        "HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM", // pyth
      ),
      priceFeed:
        "2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b",
    },
  ],

  [
    // wBTC (Wormhole)
    "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    {
      pricingAccount: new PublicKey(
        "9gNX5vguzarZZPjTnE1hWze3s6UsZ7dsU3UnAmKPnMHG", // pyth
      ),
      priceFeed:
        "c9d8b075a5c69303365ae23633d4e085199bf5c520a3b90fed1322a0342ffc33",
    },
  ],
  [
    // ETH
    "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    {
      pricingAccount: new PublicKey(
        "42amVS4KgzR9rA28tkVYqVXjq9Qa8dcZQMbH5EYFX6XC", // pyth
      ),
      priceFeed:
        "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
    },
  ],
  [
    // PYTH
    "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    {
      pricingAccount: new PublicKey(
        "8vjchtMuJNY4oFQdTi8yCe6mhCaNBFaUbktT482TpLPS", // pyth
      ),
      priceFeed:
        "0bbf28e9a841a1cc788f6a361b17ca072d0ea3098a1e5df1c3922d06719579ff",
    },
  ],
  [
    // BONK
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    {
      pricingAccount: new PublicKey(
        "DBE3N8uNjhKPRHfANdwGvCZghWXyLPdqdSbEW2XFwBiX", // pyth
      ),
      priceFeed:
        "72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419",
    },
  ],
  [
    // mSOL
    "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    {
      stateAccount: new PublicKey(
        "8szGkuLTAux9XMgZ2vtY39jVSowEcpBfFfD8hXSEqdGC",
      ),
      priceFeed:
        "c2289a6a43d2ce91c6f55caec370f4acc38a2ed477f58813334c6d03749ff2a4", // for front-end to price msol holding in real-time
    },
  ],

  //
  // Price feed from Drift
  //
  [
    // PYUSD
    "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    {
      pricingAccount: new PublicKey(
        "HpMoKp3TCd3QT4MWYUKk2zCBwmhr5Df45fB6wdxYqEeh",
      ),
      priceFeed:
        "c1da1b73d7f01e7ddd54b3766cf7fcd644395ad14f70aa706ec5384c59e76692",
    },
  ],

  //
  // LST - autogen
  //
  [
    // fpSOL - FP SOL
    "fpSoL8EJ7UA5yJxFKWk1MFiWi35w8CbH36G5B9d7DsV",
    {
      stateAccount: new PublicKey(
        "GutG5bcmEZw15WmPHNVMWHU77c6t8CEinUEdPLYz3doa", // state
      ),
    },
  ],
  [
    // wifSOL - dogwifSOL
    "Fi5GayacZzUrfaCRCJtBz2vSYkGF56xjgCceZx5SbXwq",
    {
      stateAccount: new PublicKey(
        "9Z8yimuc3bQCWLDyMhe6jfWqNk9EggyJZUo8TLnYsqhN", // state
      ),
    },
  ],
  [
    // pathSOL - Pathfinders SOL
    "pathdXw4He1Xk3eX84pDdDZnGKEme3GivBamGCVPZ5a",
    {
      stateAccount: new PublicKey(
        "GM7TwD34n8HmDP9XcT6bD3JJuNniKJkrKQinHqmqHarz", // state
      ),
    },
  ],
  [
    // JupSOL - Jupiter Staked SOL
    "jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v",
    {
      stateAccount: new PublicKey(
        "8VpRhuxa7sUUepdY3kQiTmX9rS5vx4WgaXiAnXq4KCtr", // state
      ),
    },
  ],
  // jjupSOL - Juicing Jupiter SOL
  // [
  //   "BgYgFYq4A9a2o5S1QbWkmYVFBh7LBQL8YvugdhieFg38",
  //   {
  //     stateAccount: new PublicKey(
  //       "4mBwcXKJN2vz6MJikNTgVBSY5vYnyjZk7txd8j3K46Ei", // state
  //     ),
  //   },
  // ],
  [
    // phaseSOL - Phase Labs SOL
    "phaseZSfPxTDBpiVb96H4XFSD8xHeHxZre5HerehBJG",
    {
      stateAccount: new PublicKey(
        "phasejkG1akKgqkLvfWzWY17evnH6mSWznnUspmpyeG", // state
      ),
    },
  ],
  [
    // banxSOL - banxSOL
    "BANXyWgPpa519e2MtQF1ecRbKYKKDMXPF1dyBxUq9NQG",
    {
      stateAccount: new PublicKey(
        "4fdMvFuyNboQ5Kr93X16f1tFcTeEkvfNwNAeSrzY3afb", // state
      ),
    },
  ],
  [
    // iceSOL - iceSOL
    "iceSdwqztAQFuH6En49HWwMxwthKMnGzLFQcMN3Bqhj",
    {
      stateAccount: new PublicKey(
        "EVXQHaLSJyUNrnBGfXUnvEi4DvVz4UJ3GnoKGVQVxrjr", // state
      ),
    },
  ],
  [
    // fmSOL - SolanaFM Staked SOL
    "fmSoLKzBY6h9b5RQ67UVs7xE3Ym6mx2ChpPxHdoaVho",
    {
      stateAccount: new PublicKey(
        "5FYTvZgc7QEGZSDmbJn5hrtjtRtyFZo5vR7gL1jJYanE", // state
      ),
    },
  ],
  [
    // BurnSOL - BurnDAO
    "AxM7a5HNmRNHbND6h5ZMSsU8n3NLa1tskoN6m5mAgVvL",
    {
      stateAccount: new PublicKey(
        "CAEsfzw43mvaVauCxXCSJh8DvnFsTMiTyeL1kjs6UwaT", // state
      ),
    },
  ],
  [
    // BNSOL - Binance Staked SOL
    "BNso1VUJnh4zcfpZa6986Ea66P6TCp59hvtNJ8b1X85",
    {
      stateAccount: new PublicKey(
        "Hr9pzexrBge3vgmBNRR8u42CNQgBXdHm4UkUN2DH4a7r", // state
      ),
    },
  ],
  [
    // pwrSOL - Power Staked SOL
    "pWrSoLAhue6jUxUkbWgmEy5rD9VJzkFmvfTDV5KgNuu",
    {
      stateAccount: new PublicKey(
        "DfiQgSvpW3Dy4gKfhtdHnWGHwFUrE8exvaxqjtMtAVxk", // state
      ),
    },
  ],
  [
    // superSOL - Superfast Staked SOL
    "suPer8CPwxoJPQ7zksGMwFvjBQhjAHwUMmPV4FVatBw",
    {
      stateAccount: new PublicKey(
        "4dZDUL3BFJUFeqS3Y3cwkc84Rs6mgVHRYGt1LJvhooW4", // state
      ),
    },
  ],
  [
    // jucySOL - Juicy SOL
    "jucy5XJ76pHVvtPZb5TKRcGQExkwit2P5s4vY8UzmpC",
    {
      stateAccount: new PublicKey(
        "AZGSr2fUyKkPLMhAW6WUEKEsQiRMAFKf8Fjnt4MFFaGv", // state
      ),
    },
  ],
  [
    // bonkSOL - bonkSOL
    "BonK1YhkXEGLZzwtcvRTip3gAL9nCeQD7ppZBLXhtTs",
    {
      stateAccount: new PublicKey(
        "ArAQfbzsdotoKB5jJcZa3ajQrrPcWr2YQoDAEAiFxJAC", // state
      ),
    },
  ],
  [
    // dSOL - Drift Staked SOL
    "Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ",
    {
      stateAccount: new PublicKey(
        "9mhGNSPArRMHpLDMSmxAvuoizBqtBGqYdT8WGuqgxNdn", // state
      ),
    },
  ],
  [
    // compassSOL - Compass SOL
    "Comp4ssDzXcLeu2MnLuGNNFC4cmLPMng8qWHPvzAMU1h",
    {
      stateAccount: new PublicKey(
        "AwDeTcW6BovNYR34Df1TPm4bFwswa4CJY4YPye2LXtPS", // state
      ),
    },
  ],
  [
    // picoSOL - picoSOL
    "picobAEvs6w7QEknPce34wAE4gknZA9v5tTonnmHYdX",
    {
      stateAccount: new PublicKey(
        "8Dv3hNYcEWEaa4qVx9BTN1Wfvtha1z8cWDUXb7KVACVe", // state
      ),
    },
  ],
  [
    // clockSOL - Overclock SOL
    "GRJQtWwdJmp5LLpy8JWjPgn5FnLyqSJGNhn5ZnCTFUwM",
    {
      stateAccount: new PublicKey(
        "6e2LpgytfG3RqMdYuPr3dnedv6bmHQUk9hH9h2fzVk9o", // state
      ),
    },
  ],
  [
    // hubSOL - SolanaHub staked SOL
    "HUBsveNpjo5pWqNkH57QzxjQASdTVXcSK7bVKTSZtcSX",
    {
      stateAccount: new PublicKey(
        "ECRqn7gaNASuvTyC5xfCUjehWZCSowMXstZiM5DNweyB", // state
      ),
    },
  ],
  [
    // strongSOL - Stronghold LST
    "strng7mqqc1MBJJV6vMzYbEqnwVGvKKGKedeCvtktWA",
    {
      stateAccount: new PublicKey(
        "GZDX5JYXDzCEDL3kybhjN7PSixL4ams3M2G4CvWmMmm5", // state
      ),
    },
  ],
  [
    // lanternSOL - Lantern Staked SOL
    "LnTRntk2kTfWEY6cVB8K9649pgJbt6dJLS1Ns1GZCWg",
    {
      stateAccount: new PublicKey(
        "LW3qEdGWdVrxNgxSXW8vZri7Jifg4HuKEQ1UABLxs3C", // state
      ),
    },
  ],
  [
    // stakeSOL - Stake City SOL
    "st8QujHLPsX3d6HG9uQg9kJ91jFxUgruwsb1hyYXSNd",
    {
      stateAccount: new PublicKey(
        "2jjK1MsLgsPgVjnp97HUJeovNj3jp4XgyQ3nuiWMwiS8", // state
      ),
    },
  ],
  [
    // pumpkinSOL - Pumpkin's Staked SOL
    "pumpkinsEq8xENVZE6QgTS93EN4r9iKvNxNALS1ooyp",
    {
      stateAccount: new PublicKey(
        "8WHCJsUduwDBhPL9uVADQSdWkUi2LPZNFAMyX1n2HGMD", // state
      ),
    },
  ],
  [
    // hSOL - Helius Staked SOL
    "he1iusmfkpAdwvxLNGV8Y1iSbj4rUy6yMhEA3fotn9A",
    {
      stateAccount: new PublicKey(
        "3wK2g8ZdzAH8FJ7PKr2RcvGh7V9VYson5hrVsJM5Lmws", // state
      ),
    },
  ],
  [
    // lifSOL - Lifinity Staked SOL
    "LSoLi4A4Pk4i8DPFYcfHziRdEbH9otvSJcSrkMVq99c",
    {
      stateAccount: new PublicKey(
        "HSDnqBq7EnfcKpnw52DTAZrP38tf8rdWLiRhQo4qGTUa", // state
      ),
    },
  ],
  [
    // cgntSOL - Cogent SOL
    "CgnTSoL3DgY9SFHxcLj6CgCgKKoTBr6tp4CPAEWy25DE",
    {
      stateAccount: new PublicKey(
        "CgntPoLka5pD5fesJYhGmUCF8KU1QS1ZmZiuAuMZr2az", // state
      ),
    },
  ],
  [
    // laineSOL - Laine Stake Token
    "LAinEtNLgpmCP9Rvsf5Hn8W6EhNiKLZQti1xfWMLy6X",
    {
      stateAccount: new PublicKey(
        "2qyEeSAWKfU18AFthrF7JA8z8ZCi1yt76Tqs917vwQTV", // state
      ),
    },
  ],
  [
    // vSOL - The Vault
    "vSoLxydx6akxyMD9XEcPvGYNGq6Nn66oqVb3UkGkei7",
    {
      stateAccount: new PublicKey(
        "Fu9BYC6tWBo1KMKaP3CFoKfRhqv9akmy3DuYwnCyWiyC", // state
      ),
    },
  ],
  [
    // bSOL - BlazeStake Staked SOL
    "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    {
      stateAccount: new PublicKey(
        "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi", // state
      ),
    },
  ],
  [
    // daoSOL - daoSOL
    "GEJpt3Wjmr628FqXxTgxMce1pLntcPV4uFi8ksxMyPQh",
    {
      stateAccount: new PublicKey(
        "7ge2xKsZXmqPxa3YmXxXmzCp9Hc2ezrTxh6PECaxCwrL", // state
      ),
    },
  ],
  [
    // JitoSOL - Jito Staked SOL
    "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    {
      stateAccount: new PublicKey(
        "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb", // state
      ),
      pricingAccount: new PublicKey(
        "7yyaeuJ1GGtVBLT2z2xub5ZWYKaNhF28mj1RdV4VDFVk", // pyth
      ),
      priceFeed:
        "67be9f519b95cf24338801051f9a808eff0a578ccb388db73b7f6fe1de019ffb",
    },
  ],
  [
    // JSOL - JPOOL Solana Token
    "7Q2afV64in6N6SeZsAAB81TJzwDoD6zpqmHkzi9Dcavn",
    {
      stateAccount: new PublicKey(
        "CtMyWsrUtAwXWiGr9WjHT5fC3p3fgV8cyGpLTo2LJzG1", // state
      ),
    },
  ],
  [
    // LST - Liquid Staking Token
    "LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp",
    {
      stateAccount: new PublicKey(
        "DqhH94PjkZsjAqEze2BEkWhFQJ6EyU6MdtMphMgnXqeK", // state
      ),
    },
  ],
  [
    // zippySOL - Zippy Staked SOL
    "Zippybh3S5xYYam2nvL6hVJKz1got6ShgV4DyD1XQYF",
    {
      stateAccount: new PublicKey(
        "DxRFpqBQBC2nKcvh14gD1eizCj9Xi7ruMR3nCR3Hvw8f", // state
      ),
    },
  ],
  [
    // edgeSOL - Edgevana Staked SOL
    "edge86g9cVz87xcpKpy3J77vbp4wYd9idEV562CCntt",
    {
      stateAccount: new PublicKey(
        "edgejNWAqkePLpi5sHRxT9vHi7u3kSHP9cocABPKiWZ", // state
      ),
    },
  ],
  [
    // thugSOL - Thugbirdz Staked SOL
    "ThUGsoLWtoTCfb24AmQTKDVjTTUBbNrUrozupJeyPsy",
    {
      stateAccount: new PublicKey(
        "G9WdMBxWSo1X3fKxbuyGrv1nGXrVqGg5zBKAkBFkb37g", // state
      ),
    },
  ],
  [
    // wenSOL - Wen Staked SOL
    "WensoLXxZJnev2YvihHFchn1dVVFnFLYvgomXWvvwRu",
    {
      stateAccount: new PublicKey(
        "CWM1VcNPd2A5WF2x2mmEUCgA1PGSKNZCGAH5GsoQw7h8", // state
      ),
    },
  ],
  [
    // camaoSOL - camaoSOL
    "camaK1kryp4KJ2jS1HDiZuxmK7S6dyEtr9DA7NsuAAB",
    {
      stateAccount: new PublicKey(
        "2RUTyfN8iq7Hsd2s9rLgrRT9VhHLuqkx2mGNgbuzbhTc", // state
      ),
    },
  ],
  [
    // dainSOL - dainSOL
    "2LuXDpkn7ZWMqufwgUv7ZisggGkSE5FpeHCHBsRgLg3m",
    {
      stateAccount: new PublicKey(
        "7qJ34Vq7nGZvk5YExkJsDZB6to6vz9RpcPmNEK84HjrV", // state
      ),
    },
  ],
  [
    // digitSOL - digitSOL
    "D1gittVxgtszzY4fMwiTfM4Hp7uL5Tdi1S9LYaepAUUm",
    {
      stateAccount: new PublicKey(
        "4qYufFsPQETukkXd5z9fxDsdwm8AEaSqzYpuzmZzCJxR", // state
      ),
    },
  ],
  [
    // digitalSOL - digitalSOL
    "3bfv2scCdbvumVBc3Sar5QhYXx7Ecsi8EFF2akjxe329",
    {
      stateAccount: new PublicKey(
        "Fwy2jGmRCDjKpWTacMVvnLp66Fg4L5yhVCfahHsbjMGf", // state
      ),
    },
  ],
  [
    // dlgtSOL - Delegate Liquid Staking SOL
    "DLGToUUnqy9hXxpJTm5VaiBKqnw9Zt1qzvrpwKwUmuuZ",
    {
      stateAccount: new PublicKey(
        "9pffpv2w65TSeZpD988hAjvvzUiF1KZN1Swx5j2zPCdy", // state
      ),
    },
  ],
  [
    // dualSOL - Dual SOL
    "DUAL6T9pATmQUFPYmrWq2BkkGdRxLtERySGScYmbHMER",
    {
      stateAccount: new PublicKey(
        "BmEgS5XpWJJDqT3FVfB6ZmoELQrWkJxDXo3cNoJVsNFK", // state
      ),
    },
  ],
  [
    // haSOL - Hanabi Staked SOL
    "haSo1Vz5aTsqEnz8nisfnEsipvbAAWpgzRDh2WhhMEh",
    {
      stateAccount: new PublicKey(
        "9ovWYMZp18Qn7UVbyUvwqLSBBSEPDDA5q9pUgDFy6R23", // state
      ),
    },
  ],
  [
    // hausSOL - StakeHaus Staked SOL
    "HausGKcq9G9zM3azwNmgZyzUvYeeqR8h8663PmZpxuDj",
    {
      stateAccount: new PublicKey(
        "5bzgfi7nidWWrp3DCwPwLzepw7PGgawRmMH9tqqXMZRj", // state
      ),
    },
  ],
  [
    // kumaSOL - kumaSOL
    "KUMAgSzADhUmwXwNiUbNHYnMBnd89u4t9obZThJ4dqg",
    {
      stateAccount: new PublicKey(
        "Fvy5L7f3rduuYfRf9GR9fDqEgmJkYagDPh3Ddkp5jcoP", // state
      ),
    },
  ],
  [
    // nordSOL - Nordic Staked SOL
    "nordEhq2BnR6weCyrdezNVk7TwC3Ej94znPZxdBnfLM",
    {
      stateAccount: new PublicKey(
        "GrrASJmjz19gHDsUUGv9y3gtRAwYJcdrtFESCRAosd44", // state
      ),
    },
  ],
  [
    // polarSOL - polarSOL
    "PoLaRbHgtHnmeSohWQN83LkwA4xnQt91VUqL5hx5VTc",
    {
      stateAccount: new PublicKey(
        "EYwMHf8Ajnpvy3PqMMkq1MPkTyhCsBEesXFgnK9BZfmu", // state
      ),
    },
  ],
  [
    // rkSOL - StaRKe SOL
    "EPCz5LK372vmvCkZH3HgSuGNKACJJwwxsofW6fypCPZL",
    {
      stateAccount: new PublicKey(
        "6LXCxeyQZqdAL4yLCtgATFYF6dcayWvsiwjtBFYVfb1N", // state
      ),
    },
  ],
  [
    // rSOL - reflectSOL
    "RSoLp7kddnNwvvvaz4b1isQy8vcqdSwXjgm1wXaMhD8",
    {
      stateAccount: new PublicKey(
        "4gT1GaFtJK5pnX3CnjnSYwy8VUV9UdmozoQV9GCNk9RQ", // state
      ),
    },
  ],
  [
    // spikySOL - Hedgehog Spiky SOL
    "spkyB5SzVaz2x3nNzSBuhpLSEF8otbRDbufc73fuLXg",
    {
      stateAccount: new PublicKey(
        "GEGRQNw17Y5s44dRH69sk8bvhyj3i6VwgqGmN1MBHKHp", // state
      ),
    },
  ],
  [
    // stakrSOL - STAKR.space SOL
    "stkrHcjQGytQggswj3tCF77yriaJYYhrRxisRqe9AiZ",
    {
      stateAccount: new PublicKey(
        "9j2mFdABTCCnWnzLtpMjp86AEcm4e3XistVeuujds7Au", // state
      ),
    },
  ],
  [
    // xSOL - ElagabalX Staked SOL
    "B5GgNAZQDN8vPrQ15jPrXmJxVtManHLqHogj9B9i4zSs",
    {
      stateAccount: new PublicKey(
        "DYuSikgwzHidFo2b8jqrViW1psAb7hpawJnszBothRzp", // state
      ),
    },
  ],
  [
    // fuseSOL - Fuse Staked SOL
    "fuseYvhNJbSzdDByyTCrLcogsoNwAviB1WeewhbqgFc",
    {
      stateAccount: new PublicKey(
        "pjwKqvtt4ij6VJW4HxNxSaufSrkWHRc6iCTHoC4gFs4", // state
      ),
    },
  ],
  [
    // mangoSOL - Mango SOL
    "MangmsBgFqJhW4cLUR9LxfVgMboY1xAoP8UUBiWwwuY",
    {
      stateAccount: new PublicKey(
        "9jWbABPXfc75wseAbLEkBCb1NRaX9EbJZJTDQnbtpzc1", // state
      ),
    },
  ],
  [
    // apySOL - apySOL
    "apySoLhdVa6QbvNyEjXCbET3FdUm9cCdEvYyjCU7icM",
    {
      stateAccount: new PublicKey(
        "FxhzbU8rn4MhZxmeH2u7M18qkvFH3LjkWk8z9686TE45", // state
      ),
    },
  ],
  [
    // bbSOL
    "Bybit2vBJGhPF52GBdNaQfUJ6ZpThSgHBobjWZpLPb4B",
    {
      stateAccount: new PublicKey(
        "2aMLkB5p5gVvCwKkdSo5eZAL1WwhZbxezQr1wxiynRhq", // state
      ),
    },
  ],
]);

export const ASSETS_TESTS: Map<string, AssetMeta> = new Map([
  //
  // LOCALNET
  //

  [
    // USDC
    "AwRP1kuJbykXeF4hcLzfMDMY2ZTGN3cx8ErCWxVYekef",
    {
      pricingAccount: new PublicKey(
        "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX", // pyth
      ),
    },
  ],
  [
    // BTC
    "7Pz5yQdyQm64WtzxvpQZi3nD1q5mbxj4Hhcjy2kmZ7Zd",
    {
      pricingAccount: new PublicKey(
        "4cSM2e6rvbGQUFiJbqytoVMi5GgghSMr8LwVrT9VPSPo", // pyth
      ),
      programId: TOKEN_2022_PROGRAM_ID,
    },
  ],
  [
    // ETH
    "GRxagtBNxzjwxkKdEgW7P1oqU57Amai6ha5F3UBJzU1m",
    {
      pricingAccount: new PublicKey(
        "42amVS4KgzR9rA28tkVYqVXjq9Qa8dcZQMbH5EYFX6XC", // pyth
      ),
    },
  ],
]);
