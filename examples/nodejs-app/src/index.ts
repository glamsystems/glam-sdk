import { BN } from "@coral-xyz/anchor";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { GlamClient, USDC, WSOL } from "@glamsystems/glam-sdk";
import * as dotenv from "dotenv";

// Load environment variables from .env file
// Make sure a `.env` file exists with required variables (see `.env.example`)
dotenv.config();

const glamStatePda = new PublicKey(process.env.GLAM_STATE!);
const glamClient = new GlamClient();

const txOptions = { simulate: true };

async function main() {
  const glamVaultPda = glamClient.getVaultPda(glamStatePda);
  console.log("GLAM vault:", glamVaultPda.toBase58());

  // Deposit 0.01 SOL to Kamino
  const depositAmount = 0.01;
  try {
    const txSig = await glamClient.kaminoLending.deposit(
      glamStatePda,
      new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"), // Kamino main market pubkey
      WSOL,
      new BN(depositAmount * LAMPORTS_PER_SOL), // amount in lamports
      txOptions,
    );
    console.log(`Deposit ${depositAmount} SOL to Kamino:`, txSig);
  } catch (e) {
    throw e;
  }

  // Borrow 1 USDC from Kamino
  const borrowAmount = 1;
  try {
    const txSig = await glamClient.kaminoLending.borrow(
      glamStatePda,
      new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"), // Kamino main market pubkey
      USDC,
      new BN(borrowAmount * 10 ** 6), // scaled amount, USDC has 6 decimals
      txOptions,
    );
    console.log(`Borrow ${borrowAmount} USDC from Kamino:`, txSig);
  } catch (e) {
    throw e;
  }

  // Repay 1 USDC to Kamino
  const repayAmount = 1;
  try {
    const txSig = await glamClient.kaminoLending.repay(
      glamStatePda,
      new PublicKey("7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF"), // Kamino main market pubkey
      USDC,
      new BN(repayAmount * 10 ** 6), // scaled amount, USDC has 6 decimals
      txOptions,
    );
    console.log(`Repay ${repayAmount} USDC to Kamino:`, txSig);
  } catch (e) {
    throw e;
  }
}

// Run the main function
main().catch((err) => {
  console.error("Unhandled error:", err);
  process.exit(1);
});
