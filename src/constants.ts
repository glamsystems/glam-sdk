import { PublicKey } from "@solana/web3.js";

export const SEED_STATE = "state"; // protocol program
export const SEED_VAULT = "vault"; // protocol program
export const SEED_METADATA = "metadata"; // protocol program
export const SEED_MINT = "mint"; // mint program
export const SEED_ESCROW = "escrow"; // mint program
export const SEED_REQUEST_QUEUE = "request-queue"; // mint program
export const SEED_ACCOUNT_POLICY = "account-policy"; // policies program
export const SEED_EXTRA_ACCOUNT_METAS = "extra-account-metas"; // policies program
export const SEED_GLOBAL_CONFIG = "global-config";
export const SEED_INTEGRATION_AUTHORITY = "integration-authority";

export const STAKE_ACCOUNT_SIZE = 200;
export const METEORA_POSITION_SIZE = 8120;
export const KAMINO_OBTRIGATION_SIZE = 3344;
export const DRIFT_VAULT_DEPOSITOR_SIZE = 272;

export const JUPITER_API_DEFAULT = "https://lite-api.jup.ag";

export const JITO_TIP_DEFAULT = new PublicKey(
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
);
export const KAMINO_SCOPE_PRICES = new PublicKey(
  "3NJYftD5sjVfxSnUdZ1wVML8f3aC6mp1CXCL6L7TnU8C",
);

export const MARINADE_NATIVE_STAKE_AUTHORITY = new PublicKey(
  "stWirqFCf2Uts1JBL1Jsd3r6VBWhgnpdPxCTe1MFjrq",
);
/**
 * Token mints. If no devnet version is defined, assume mainnet and devnet addresses are the same.
 *
 * Unless otherwise noted, all mints have 9 decimals.
 */
export const WSOL = new PublicKey(
  "So11111111111111111111111111111111111111112",
);
export const MSOL = new PublicKey(
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
);
// USDC, 6 decimals
export const USDC = new PublicKey(
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
);
// JUP, 6 decimals
export const JUP = new PublicKey("JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN");

/**
 * Program IDs
 */
export const MARINADE_PROGRAM_ID = new PublicKey(
  "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD",
);
export const DRIFT_PROGRAM_ID = new PublicKey(
  "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH",
);
export const DRIFT_VAULTS_PROGRAM_ID = new PublicKey(
  "vAuLTsyrvSfZRuRB3XgvkPwNGgYSs9YRYymVebLKoxR",
);
export const JUPITER_PROGRAM_ID = new PublicKey(
  "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",
);
export const SANCTUM_STAKE_POOL_PROGRAM_ID = new PublicKey(
  "SP12tWFxD9oJsVWNavTTBZvMbA6gkAmxtVgxdqvyvhY",
);
export const GOVERNANCE_PROGRAM_ID = new PublicKey(
  "GovaE4iu227srtG2s3tZzB4RmWBzw8sTwrCLZz7kN7rY",
);
export const JUP_VOTE_PROGRAM = new PublicKey(
  "voTpe3tHQ7AjQHMapgSue2HJFAh2cGsdokqN3XqmVSj",
);
export const MERKLE_DISTRIBUTOR_PROGRAM = new PublicKey(
  "DiS3nNjFVMieMgmiQFm6wgJL7nevk4NrhXKLbtEH1Z2R",
);
export const TRANSFER_HOOK_PROGRAM = new PublicKey(
  "po1iCYakK3gHCLbuju4wGzFowTMpAJxkqK1iwUqMonY",
);
export const METEORA_DLMM_PROGRAM = new PublicKey(
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
);
export const KAMINO_LENDING_PROGRAM = new PublicKey(
  "KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD",
);
export const KAMINO_VAULTS_PROGRAM = new PublicKey(
  "KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd",
);
export const KAMINO_FARM_PROGRAM = new PublicKey(
  "FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr",
);
export const MEMO_PROGRAM = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
);
export const ALT_PROGRAM_ID = new PublicKey(
  "AddressLookupTab1e1111111111111111111111111",
);
/**
 * Stake pools
 */
export const JITO_STAKE_POOL = new PublicKey(
  "Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb",
);

export const JUPSOL_STAKE_POOL = new PublicKey(
  "8VpRhuxa7sUUepdY3kQiTmX9rS5vx4WgaXiAnXq4KCtr",
);

/**
 * Referrers
 */
export const GLAM_REFERRER = new PublicKey(
  "GLAMrG37ZqioqvzBNQGCfCUueDz3tsr7MwMFyRk9PS89",
);
