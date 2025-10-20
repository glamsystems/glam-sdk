import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
} from "@solana/web3.js";

/**
 * Fetches multiple address lookup table accounts
 *
 * @param connection Solana connection
 * @param pubkeys Array of lookup table public keys
 * @returns Array of address lookup table accounts
 */
export async function fetchAddressLookupTableAccounts(
  connection: Connection,
  pubkeys?: string[] | PublicKey[],
): Promise<AddressLookupTableAccount[]> {
  if (!pubkeys) {
    throw new Error("addressLookupTableAddresses is undefined");
  }

  if (pubkeys.length === 0) {
    return [];
  }

  const addressLookupTableAccountInfos =
    await connection.getMultipleAccountsInfo(
      pubkeys.map((key: string | PublicKey) => new PublicKey(key)),
    );

  return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
    const tableAddress = pubkeys[index];
    if (accountInfo) {
      const tableAccount = new AddressLookupTableAccount({
        key: new PublicKey(tableAddress),
        state: AddressLookupTableAccount.deserialize(accountInfo.data),
      });
      acc.push(tableAccount);
    }
    return acc;
  }, new Array<AddressLookupTableAccount>());
}
