import { getGlamProtocolProgram, GlamClient } from "@glamsystems/glam-sdk";
import { Connection, PublicKey } from "@solana/web3.js";

getGlamProtocolProgram;

async function getVaultStatePubkey(
  connection: Connection,
  vault: PublicKey,
  glamProtocolProgramId: PublicKey,
) {
  const vaultState = await connection.getProgramAccounts(
    glamProtocolProgramId,
    {
      filters: [{ memcmp: { offset: 10, bytes: vault.toBase58() } }],
    },
  );
  if (vaultState.length === 0) {
    throw new Error("Vault not found");
  }
  return vaultState[0].pubkey;
}

export async function createGlamClient(vault: PublicKey) {
  const glamClient = new GlamClient();
  const vaultState = await getVaultStatePubkey(
    glamClient.provider.connection,
    vault,
    glamClient.protocolProgram.programId,
  );
  glamClient.statePda = vaultState;
  return glamClient;
}
