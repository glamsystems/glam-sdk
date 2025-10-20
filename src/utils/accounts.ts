import {
  AccountInfo,
  Connection,
  PublicKey,
  StakeProgram,
  ParsedAccountData,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { STAKE_ACCOUNT_SIZE } from "../constants";
import { type TokenAccount } from "../client/base";
import {
  AccountLayout,
  Mint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  unpackMint,
} from "@solana/spl-token";

export type StakeAccountInfo = {
  address: PublicKey;
  lamports: number;
  state: string;
  voter?: PublicKey; // if undefined, the stake account is not delegated
};

/**
 * Fetches all the token accounts owned by the specified pubkey.
 */
export async function getTokenAccountsByOwner(
  connection: Connection,
  owner: PublicKey,
): Promise<TokenAccount[]> {
  const tokenAccounts = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_PROGRAM_ID,
  });
  const token2022Accounts = await connection.getTokenAccountsByOwner(owner, {
    programId: TOKEN_2022_PROGRAM_ID,
  });

  const mintPubkeys = [] as PublicKey[];
  const parseTokenAccountInfo = (pubkey: PublicKey, account: any) => {
    const { mint, amount, state } = AccountLayout.decode(account.data);
    mintPubkeys.push(mint);
    return {
      owner,
      pubkey,
      mint,
      amount: amount.toString(),
      frozen: state !== 1,
    };
  };

  // Parse token accounts
  const partialTokenAccounts = tokenAccounts.value
    .map(({ pubkey, account }) => ({
      ...parseTokenAccountInfo(pubkey, account),
      programId: TOKEN_PROGRAM_ID,
    }))
    .concat(
      token2022Accounts.value.map(({ pubkey, account }) => ({
        ...parseTokenAccountInfo(pubkey, account),
        programId: TOKEN_2022_PROGRAM_ID,
      })),
    );

  // Get mint decimals
  const mintDecimalMap = new Map<string, number>();
  const mintAccountsInfo =
    await connection.getMultipleAccountsInfo(mintPubkeys);
  mintAccountsInfo.forEach((accountInfo, i) => {
    if (accountInfo) {
      const mint = unpackMint(mintPubkeys[i], accountInfo, accountInfo.owner);
      mintDecimalMap.set(mintPubkeys[i].toBase58(), mint.decimals);
    }
  });

  // Enrich token accounts with decimals and uiAmount
  return partialTokenAccounts
    .map((ta) => {
      const decimals = mintDecimalMap.get(ta.mint.toBase58());
      if (!decimals) {
        return null;
      }
      return {
        ...ta,
        decimals,
        uiAmount: Number(ta.amount) / 10 ** decimals,
      } as TokenAccount;
    })
    .filter((ta) => ta !== null);
}

export async function getSolAndTokenBalances(
  connection: Connection,
  owner: PublicKey,
) {
  const balanceLamports = await connection.getBalance(owner);
  const tokenAccounts = await getTokenAccountsByOwner(connection, owner);
  const uiAmount = balanceLamports / LAMPORTS_PER_SOL;

  return {
    balanceLamports,
    uiAmount,
    tokenAccounts,
  };
}

export const findStakeAccounts = async (
  connection: Connection,
  withdrawAuthority: PublicKey,
): Promise<PublicKey[]> => {
  // stake authority offset: 12
  // withdraw authority offset: 44
  const accounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          dataSize: STAKE_ACCOUNT_SIZE,
        },
        {
          memcmp: {
            offset: 44,
            bytes: withdrawAuthority.toBase58(),
          },
        },
      ],
    },
  );
  // order by lamports desc
  return accounts
    .sort((a, b) => b.account.lamports - a.account.lamports)
    .map((a) => a.pubkey);
};

export const getStakeAccountsWithStates = async (
  connection: Connection,
  withdrawAuthority: PublicKey,
): Promise<StakeAccountInfo[]> => {
  // stake authority offset: 12
  // withdraw authority offset: 44
  const accounts = await connection.getParsedProgramAccounts(
    StakeProgram.programId,
    {
      filters: [
        {
          dataSize: STAKE_ACCOUNT_SIZE,
        },
        {
          memcmp: {
            offset: 44,
            bytes: withdrawAuthority.toBase58(),
          },
        },
      ],
    },
  );

  const epochInfo = await connection.getEpochInfo();
  const stakes = await Promise.all(
    accounts.map(async (account) => {
      const delegation = (account.account.data as ParsedAccountData).parsed.info
        .stake?.delegation;

      let state = "undelegated";

      if (!delegation) {
        return {
          address: account.pubkey,
          lamports: account.account.lamports,
          state,
        };
      }

      // possible state if delegated: active, inactive, activating, deactivating
      const { activationEpoch, deactivationEpoch, voter } = delegation;
      if (activationEpoch == epochInfo.epoch) {
        state = "activating";
      } else if (deactivationEpoch == epochInfo.epoch) {
        state = "deactivating";
      } else if (epochInfo.epoch > deactivationEpoch) {
        state = "inactive";
      } else if (epochInfo.epoch > activationEpoch) {
        state = "active";
      }

      return {
        address: account.pubkey,
        lamports: account.account.lamports,
        voter: new PublicKey(voter),
        state,
      };
    }),
  );

  // order by lamports desc
  return stakes.sort((a, b) => b.lamports - a.lamports);
};

/**
 * Parses mint account info to extract mint and token program
 *
 * @param accountInfo The account info buffer
 * @param pubkey The mint public key
 * @returns Mint object and token program ID
 */
export function parseMintAccountInfo(
  accountInfo: AccountInfo<Buffer>,
  pubkey: PublicKey,
): { mint: Mint; tokenProgram: PublicKey } {
  if (!accountInfo) {
    throw new Error(`Mint ${pubkey} not found`);
  }
  const tokenProgram = accountInfo.owner;
  const mint = unpackMint(pubkey, accountInfo, tokenProgram);
  return { mint, tokenProgram };
}

/**
 * Fetches mint accounts and token program IDs for the given mint pubkeys
 *
 * @param connection Solana connection
 * @param mintPubkeys Array of mint public keys
 * @returns Array of mint objects with their token program IDs
 */
export async function fetchMintsAndTokenPrograms(
  connection: Connection,
  mintPubkeys: PublicKey[],
): Promise<{ mint: Mint; tokenProgram: PublicKey }[]> {
  const accountsInfo = (
    await connection.getMultipleAccountsInfo(mintPubkeys, "confirmed")
  ).filter((info): info is AccountInfo<Buffer> => info !== null);
  if (accountsInfo.length !== mintPubkeys.length) {
    throw new Error(
      `Failed to fetch mint accounts for ${mintPubkeys.length} mints`,
    );
  }
  return accountsInfo.map((info, i) =>
    parseMintAccountInfo(info, mintPubkeys[i]),
  );
}

/**
 * Fetches mint account and token program ID for the given mint pubkey
 *
 * @param connection Solana connection
 * @param mintPubkey Mint public key
 * @returns Mint object and token program ID
 */
export async function fetchMintAndTokenProgram(
  connection: Connection,
  mintPubkey: PublicKey,
): Promise<{ mint: Mint; tokenProgram: PublicKey }> {
  const info = await connection.getAccountInfo(mintPubkey, "confirmed");
  if (!info) {
    throw new Error(
      `Failed to fetch mint account for ${mintPubkey.toBase58()}`,
    );
  }
  return parseMintAccountInfo(info, mintPubkey);
}
