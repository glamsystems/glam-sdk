import { AddressLookupTableAccount, PublicKey } from "@solana/web3.js";

const EXCLUDED_LOOKUP_TABLES = ["Hr5yPo6YWxLZMow2aYgzLm77Emm6D9c7uki9xeeNiKcz"];

export async function getGlamLookupTableAccounts(
  statePda: PublicKey,
): Promise<AddressLookupTableAccount[]> {
  const glamApi = process.env.NEXT_PUBLIC_GLAM_API || process.env.GLAM_API;
  if (glamApi) {
    let data = null;
    try {
      const response = await fetch(
        `${glamApi}/v0/lut/glam/?state=${statePda.toBase58()}`,
      );
      data = await response.json();
    } catch (e) {
      console.error("Failed to fetch lookup tables:", e); // Fail open
      return [];
    }
    const lookupTables = data?.t || {};

    const lookupTableAccounts: AddressLookupTableAccount[] = [];
    for (const [key, lookupTableData] of Object.entries(lookupTables)) {
      if (EXCLUDED_LOOKUP_TABLES.includes(key)) {
        continue;
      }
      const account = new AddressLookupTableAccount({
        key: new PublicKey(key),
        state: AddressLookupTableAccount.deserialize(
          new Uint8Array(Buffer.from(lookupTableData as string, "base64")),
        ),
      });
      lookupTableAccounts.push(account);
    }
    return lookupTableAccounts;
  }
  return [];
}
