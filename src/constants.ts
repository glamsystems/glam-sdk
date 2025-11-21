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
export const KAMINO_RESERVE_SIZE = 8624;
export const DRIFT_VAULT_DEPOSITOR_SIZE = 272;

export const JUPITER_API_DEFAULT = "https://lite-api.jup.ag";

export const JITO_TIP_DEFAULT = new PublicKey(
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
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
export const USDC_DEVNET = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
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
export const TOKEN_MESSENGER_MINTER_V2 = new PublicKey(
  "CCTPV2vPZJS2u2BBsUoscuikbYjnpFmbFsvVuJdgUMQe",
);
export const MESSAGE_TRANSMITTER_V2 = new PublicKey(
  "CCTPV2Sm4AdWt5296sk4P66VBZ7bEhcARwFaaS9YPbeC",
);

/**
 * Referrers
 */
export const GLAM_REFERRER = new PublicKey(
  "GLAMrG37ZqioqvzBNQGCfCUueDz3tsr7MwMFyRk9PS89",
);

/**
 * CCTP domain to chain name mapping
 */
export const CCTP_DOMAIN_MAPPING: Record<number, string> = {
  0: "Ethereum",
  1: "Avalanche",
  2: "OP",
  3: "Arbitrum",
  5: "Solana",
  6: "Base",
  7: "Polygon PoS",
  10: "Unichain",
  11: "Linea",
  12: "Codex",
  13: "Sonic",
  14: "World Chain",
  16: "Sei",
  17: "BNB Smart Chain",
  18: "XDC",
  19: "HyperEVM",
  21: "Ink",
  22: "Plume",
};

/**
 * Pool ID to lending pool name mapping for Drift Protocol policies
 */
export const DRIFT_POOL_MAPPING: Record<number, string> = {
  0: "Main Market",
  1: "JLP Market",
  2: "LST Market",
  3: "Exponent Market",
};

// Permission mappings for each protocol - maps bit positions to permission names
export const PROTOCOLS_AND_PERMISSIONS: Record<
  string,
  Record<string, { name: string; permissions: Record<number, string> }>
> = {
  // Self integration
  GLAMpaME8wdTEzxtiYEAa5yD8fZbxZiz2hNtV58RZiEz: {
    "0000000000000001": {
      name: "System Program",
      permissions: {
        [1 << 0]: "WSOL",
        [1 << 1]: "Transfer",
      },
    },
    "0000000000000010": {
      name: "Stake Program",
      permissions: {
        [1 << 0]: "Stake",
        [1 << 1]: "Unstake",
      },
    },
    "0000000000000100": {
      name: "Jupiter Swap",
      permissions: {
        [1 << 0]: "SwapAny",
        [1 << 1]: "SwapLST",
        [1 << 2]: "SwapAllowlisted",
      },
    },
  },
  // GLAM mint
  GM1NtvvnSXUptTrMCqbogAdZJydZSNv98DoU5AZVLmGh: {
    "0000000000000001": {
      name: "Glam Mint",
      permissions: {
        [1 << 0]: "MintTokens",
        [1 << 1]: "BurnTokens",
        [1 << 2]: "ForceTransfer",
        [1 << 3]: "SetTokenAccountState",
        [1 << 4]: "ClaimFees",
        [1 << 5]: "Fulfill",
        [1 << 6]: "EmergencyUpdate",
        [1 << 7]: "CancelRequest",
        [1 << 8]: "ClaimRequest",
      },
    },
  },
  // Kamino integration program
  G1NTkDEUR3pkEqGCKZtmtmVzCUEdYa86pezHkwYbLyde: {
    "0000000000000001": {
      name: "Kamino Lend",
      permissions: {
        [1 << 0]: "Init",
        [1 << 1]: "Deposit",
        [1 << 2]: "Withdraw",
        [1 << 3]: "Borrow",
        [1 << 4]: "Repay",
      },
    },
    "0000000000000010": {
      name: "Kamino Vaults",
      permissions: {
        [1 << 0]: "Deposit",
        [1 << 1]: "Withdraw",
      },
    },
    "0000000000000100": {
      name: "Kamino Farms",
      permissions: {
        [1 << 0]: "Stake",
        [1 << 1]: "Unstake",
        [1 << 2]: "HarvestReward",
      },
    },
  },
  // Drift integration program
  G1NTdrBmBpW43msRQmsf7qXSw3MFBNaqJcAkGiRmRq2F: {
    "0000000000000001": {
      name: "Drift Protocol",
      permissions: {
        [1 << 0]: "InitUser",
        [1 << 1]: "UpdateUser",
        [1 << 2]: "DeleteUser",
        [1 << 3]: "Deposit",
        [1 << 4]: "Withdraw",
        [1 << 5]: "Borrow",
        [1 << 6]: "Repay",
        [1 << 7]: "CreateModifyOrders",
        [1 << 8]: "CancelOrders",
        [1 << 9]: "PerpMarkets",
        [1 << 10]: "SpotMarkets",
      },
    },
    "0000000000000010": {
      name: "Drift Vaults",
      permissions: {
        [1 << 0]: "Deposit",
        [1 << 1]: "Withdraw",
      },
    },
  },
  // Token integration program
  G1NTsQ36mjPe89HtPYqxKsjY5HmYsDR6CbD2gd2U2pta: {
    "0000000000000001": {
      name: "Spl Token",
      permissions: {
        [1 << 0]: "Transfer",
      },
    },
  },
  // CCTP integration program
  G1NTcMDYgNLpDwgnrpSZvoSKQuR9NXG7S3DmtNQCDmrK: {
    "0000000000000001": {
      name: "CCTP",
      permissions: {
        [1 << 0]: "Transfer",
      },
    },
  },
  // Stake pool integration program
  G1NTstCVkEhGVQPnPe6r7yEyRTvnp3ta63AFkEKxqg25: {
    "0000000000000001": {
      name: "Stake Pool",
      permissions: {
        [1 << 0]: "DepositSol",
        [1 << 1]: "DepositStake",
        [1 << 2]: "DepositSolAny",
        [1 << 3]: "DepositStakeAny",
        [1 << 4]: "WithdrawSol",
        [1 << 5]: "WithdrawStake",
      },
    },
    "0000000000000010": {
      name: "Sanctum Single",
      permissions: {
        [1 << 0]: "DepositSol",
        [1 << 1]: "DepositStake",
        [1 << 2]: "DepositSolAny",
        [1 << 3]: "DepositStakeAny",
        [1 << 4]: "WithdrawSol",
        [1 << 5]: "WithdrawStake",
      },
    },
    "0000000000000100": {
      name: "Sanctum Multi",
      permissions: {
        [1 << 0]: "DepositSol",
        [1 << 1]: "DepositStake",
        [1 << 2]: "DepositSolAny",
        [1 << 3]: "DepositStakeAny",
        [1 << 4]: "WithdrawSol",
        [1 << 5]: "WithdrawStake",
      },
    },
  },
};

/**
 * (Program ID, Bitflag) -> Protocol Name
 */
export const PROTOCOL_NAME_BY_PROGRAM_AND_BITFLAG = (() => {
  const mapping: Record<string, Record<string, string>> = {};

  Object.entries(PROTOCOLS_AND_PERMISSIONS).forEach(
    ([programId, protocols]) => {
      mapping[programId] = {};
      Object.entries(protocols).forEach(([bitflag, protocol]) => {
        mapping[programId][bitflag] = protocol.name;
      });
    },
  );

  return mapping;
})();

/**
 * Protocol Name -> (Program ID, Bitflag)
 */
export const PROGRAM_AND_BITFLAG_BY_PROTOCOL_NAME = (() => {
  const mapping: Record<string, [string, string]> = {};

  Object.entries(PROTOCOLS_AND_PERMISSIONS).forEach(
    ([programId, protocols]) => {
      Object.entries(protocols).forEach(([bitflag, protocol]) => {
        const name = protocol.name.replace(" ", "");
        mapping[name] = [programId, bitflag];
      });
    },
  );

  return mapping;
})();
