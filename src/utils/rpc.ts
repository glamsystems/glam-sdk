import { Connection, PublicKey } from "@solana/web3.js";

// Example response from Helius:
// {
//   "jsonrpc": "2.0",
//   "id": "1",
//   "result": {
//     "accounts": [
//       {
//         "pubkey": "CxELquR1gPP8wHe33gZ4QxqGB3sZ9RSwsJ2KshVewkFY",
//         "account": {
//           "lamports": 15298080,
//           "owner": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
//           "data": [
//             "2R9jLfiAQ9bgdcw6h8s44439",
//             "base64"
//           ],
//           "executable": false,
//           "rentEpoch": 28,
//           "space": 165
//         }
//       }
//     ],
//     "paginationKey": "8WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
//     "totalResults": 25000
//   }
// }
export async function getProgramAccountsV2(
  programId: PublicKey,
  limit: number = 100,
  filters?: any[],
) {
  const heliusApiKey =
    process.env.NEXT_PUBLIC_HELIUS_API_KEY || process.env.HELIUS_API_KEY;

  let allAccounts: any[] = [];
  let paginationKey: string | null = null;
  let encoding = "base64";

  do {
    const response: Response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "1",
          method: "getProgramAccountsV2",
          params: [
            programId.toBase58(),
            {
              encoding,
              filters,
              limit,
              ...(paginationKey && { paginationKey }),
            },
          ],
        }),
      },
    );

    const data: any = await response.json();
    data.result.accounts.forEach(({ pubkey, account }: any) => {
      const [acountData, encoding] = account.data;
      let decodedData;
      if (encoding === "base64") {
        decodedData = Buffer.from(acountData, "base64");
      }
      if (!decodedData) {
        throw new Error("Failed to decode base64 account data");
      }
      allAccounts.push({
        pubkey: new PublicKey(pubkey),
        account: {
          ...account,
          owner: new PublicKey(account.owner),
          data: decodedData,
        },
      });
    });

    paginationKey = data.result.paginationKey;
  } while (paginationKey);

  return allAccounts;
}

export async function getProgramAccountsWithRetry(
  connection: Connection,
  programId: PublicKey,
  filters?: any[],
) {
  const maxRetries = 3;
  const delayMs = 1000;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await connection.getProgramAccounts(programId, { filters });
    } catch (error: any) {
      lastError = error;

      if (error.code !== -32600 || attempt === maxRetries) {
        break;
      }

      // Increase delay for each retry
      console.warn(
        `getProgramAccounts attempt ${attempt} failed, retrying in ${delayMs * attempt}ms:`,
        error.message,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw new Error(
    `Failed after ${maxRetries} attempts. Last error: ${lastError?.message || "Unknown error"}`,
  );
}
