import { BN, Wallet } from "@coral-xyz/anchor";
import { Transaction, PublicKey, Keypair } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  getAccount,
  createTransferCheckedWithTransferHookInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from "@solana/spl-token";

import {
  stateModelForTest,
  createGlamStateForTest,
  str2seed,
  airdrop,
  sleep,
} from "./setup";
import {
  GlamClient,
  MintModel,
  PriceDenom,
  StateAccountType,
  WSOL,
} from "../../src";

const transferShareTokens = async (
  glamClient: GlamClient,
  to: PublicKey,
  amount: BN,
) => {
  const from = glamClient.signer;
  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      from,
      glamClient.getMintAta(to),
      to,
      glamClient.mintPda,
      TOKEN_2022_PROGRAM_ID,
    ),
    await createTransferCheckedWithTransferHookInstruction(
      glamClient.provider.connection,
      glamClient.getMintAta(from),
      glamClient.mintPda,
      glamClient.getMintAta(to),
      from,
      amount,
      9,
      [],
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    ),
  );

  return await glamClient.sendAndConfirm(tx);
};

describe("glam_policy_hook", () => {
  const glamClient = new GlamClient();
  const manager = glamClient.getSigner();

  const glamClientAlice = new GlamClient({
    wallet: new Wallet(Keypair.fromSeed(str2seed("alice"))),
  });
  const alice = glamClientAlice.signer;

  const lockupPeriod = 10;

  const mint = {
    ...stateModelForTest.mints![0],
    lockupPeriod,
    lockUpComment: "lock-up test",
    permanentDelegate: null,
  } as Partial<MintModel>;

  const stateModel = {
    ...stateModelForTest,
    accountType: StateAccountType.TOKENIZED_VAULT,
    name: "Glam Asset Management",
    assets: [WSOL],
    mints: [mint],
  } as any;

  const connection = glamClient.provider.connection;
  const commitment = "confirmed";

  beforeAll(async () => {
    try {
      await airdrop(connection, alice, 10_000_000_000);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, 10_000);

  it("Fund created", async () => {
    try {
      const { statePda, vaultPda, mintPda } = await createGlamStateForTest(
        glamClient,
        stateModel,
      );
      console.log("State PDA:", statePda.toBase58());
      console.log("Vault PDA:", vaultPda.toBase58());
      console.log("Mint PDA:", mintPda.toBase58());

      glamClientAlice.statePda = statePda;

      const state = await glamClient.fetchStateModel();
      const {
        lockupPeriod: lockUp,
        symbol,
        permanentDelegate,
      } = state.mints![0]!;

      expect(lockUp).toEqual(lockupPeriod);
      expect(symbol).toEqual("GBS");
      expect(permanentDelegate).toEqual(null);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, 30_000);

  it("Manager subscribes with 5 SOL", async () => {
    const amount = new BN(5 * 10 ** 9);
    const expectedShares = amount.toString(); // 1 SOL = 1 share
    try {
      const txId = await glamClient.investor.subscribe(WSOL, amount, 0, false, {
        preInstructions: await glamClient.price.priceVaultIxs(PriceDenom.SOL),
      });
      console.log("Manager instant subscription:", txId);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const { mint } = await glamClient.fetchMintAndTokenProgram(
      glamClient.mintPda,
    );
    expect(mint.supply.toString()).toEqual(expectedShares);

    const managerShares = await getAccount(
      connection,
      glamClient.getMintAta(manager),
      commitment,
      TOKEN_2022_PROGRAM_ID,
    );
    expect(managerShares.amount).toEqual(mint.supply);
  }, 15_000);

  it("Manager transfers shares to Alice, should fail due to lockup", async () => {
    const amount = new BN(1 * 10 ** 9);

    try {
      const txSig = await transferShareTokens(glamClient, alice, amount);
      expect(txSig).toBeUndefined();
    } catch (err) {
      expect(err.message).toContain(
        "Policy violation: lock-up has not expired",
      );
    }
  });

  it("Manager redeems, should fail due to lockup", async () => {
    const amount = new BN(1 * 10 ** 9);

    try {
      const txId = await glamClient.investor.queuedRedeem(WSOL, amount);
      expect(txId).toBeUndefined();
    } catch (err) {
      expect(err.message).toContain(
        "Policy violation: lock-up has not expired",
      );
    }
  });

  it("Manager can transfer tokens out after lockup expires", async () => {
    await sleep(10_000); // wait till lockup expires

    const amount = new BN(2 * 10 ** 9);
    try {
      const txSig = await transferShareTokens(glamClient, alice, amount);
      console.log("Manager transfers shares to Alice:", txSig);
    } catch (err) {
      expect(err).toBeUndefined();
    }
  }, 20_000);

  it("Alice can transfer tokens immediately because she's not subject to lockup", async () => {
    const amount = new BN(1 * 10 ** 9);
    try {
      const txSig = await transferShareTokens(glamClientAlice, manager, amount);
      console.log("Alice transfers shares to Manager:", txSig);
    } catch (err) {
      expect(err).toBeUndefined();
    }
  });

  it("Alice can request to redeem immediately because she's not subject to lockup", async () => {
    const amount = new BN(1 * 10 ** 9);

    try {
      const txSig = await glamClientAlice.investor.queuedRedeem(WSOL, amount);
      console.log("Alice requests to redeem:", txSig);
    } catch (err) {
      expect(err).toBeUndefined();
      throw err;
    }
  });

  it("Manager can redeem share after lockup expires", async () => {
    const managerShares = await getAccount(
      connection,
      glamClient.getMintAta(manager),
      commitment,
      TOKEN_2022_PROGRAM_ID,
    );
    const sharesRedeemed = new BN(managerShares.amount.toString());
    try {
      const txRedeem = await glamClient.investor.queuedRedeem(
        WSOL,
        sharesRedeemed,
        0,
      );
      console.log("Manager requests to redeem:", txRedeem);

      // Fulfill
      const txFulfill = await glamClient.investor.fulfill(WSOL, 0, {
        preInstructions: await glamClient.price.priceVaultIxs(PriceDenom.SOL),
      });
      console.log("Manager requests to fulfill:", txFulfill);

      // Claim all
      const txClaimManager = await glamClient.investor.claim(WSOL, 0);
      const txClaimALice = await glamClientAlice.investor.claim(WSOL, 0);
      console.log("Manager claims:", txClaimManager);
      console.log("Alice claims:", txClaimALice);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const { mint } = await glamClient.fetchMintAndTokenProgram(
      glamClient.mintPda,
    );
    expect(mint.supply.toString()).toEqual("0");
  }, 10_000);

  it("Close mint and extra metas account", async () => {
    const extraMetasPda = glamClient.extraMetasPda;
    expect(
      await glamClient.provider.connection.getAccountInfo(extraMetasPda),
    ).not.toBeNull();

    try {
      const txCloseMint = await glamClient.mint.closeMint();
      console.log("Manager closes mint:", txCloseMint);
    } catch (e) {
      console.error(e);
      throw e;
    }

    expect(
      await glamClient.provider.connection.getAccountInfo(extraMetasPda),
    ).toBeNull();
  });
});
