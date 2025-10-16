import { BN } from "@coral-xyz/anchor";

import {
  airdrop,
  createGlamStateForTest,
  BONK_STAKE_POOL,
  isInRange,
  buildAndSendTx,
} from "./setup";
import { GlamClient, PriceDenom, WSOL } from "../../src";

describe("glam_pricing", () => {
  const glamClient = new GlamClient();

  it("Create vault and airdrop 10 SOL", async () => {
    const { statePda, vaultPda, mintPda } =
      await createGlamStateForTest(glamClient); // wSOL, mSOL

    console.log("State PDA:", statePda.toBase58());
    console.log("Vault PDA:", vaultPda.toBase58());
    console.log("Mint PDA:", mintPda.toBase58());

    const txSig = await glamClient.state.update({
      integrations: [
        { marinade: {} },
        { nativeStaking: {} },
        { splStakePool: {} },
        { sanctumStakePool: {} },
      ],
    });
    console.log("Integrations enabled:", txSig);

    await airdrop(
      glamClient.provider.connection,
      glamClient.vaultPda,
      10_000_000_000,
    );
  }, 30_000);

  it("Wrap 5 SOL to wSOL", async () => {
    try {
      let tx = await glamClient.vault.wrap(new BN(5_000_000_000));
      console.log("Wrap:", tx);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }

    const { uiAmount: wsolBalance } =
      await glamClient.getVaultTokenBalance(WSOL);
    expect(wsolBalance).toEqual(5);
  }, 15_000);

  it("Price the vault with wSOL", async () => {
    try {
      const ixs = await glamClient.price.priceVaultIxs(PriceDenom.SOL);
      expect(ixs.length).toEqual(1); // No external positions, only 1 ix should be returned

      const txSig = await buildAndSendTx(glamClient, ixs);
      console.log("Price vault:", txSig);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }

    const aum = await glamClient.price.getAum();
    expect(aum.toString()).toEqual("10000000000");
  });

  it("Price the vault without wSOL", async () => {
    const unwrapTx = await glamClient.vault.unwrap();
    console.log("Unwrap:", unwrapTx);

    const { uiAmount: wsolBalance } =
      await glamClient.getVaultTokenBalance(WSOL);
    expect(wsolBalance).toEqual(0);

    try {
      const ixs = await glamClient.price.priceVaultIxs(PriceDenom.SOL);
      expect(ixs.length).toEqual(1); // No external positions, only 1 ix should be returned

      const txSig = await buildAndSendTx(glamClient, ixs);
      console.log("Price vault:", txSig);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }

    const aum = await glamClient.price.getAum();
    expect(aum.toString()).toEqual("10000000000");
  });

  it("Price the vault with mSOL and bonkSOL", async () => {
    const depositSolTx = await glamClient.marinade.deposit(
      new BN(5_000_000_000),
    );
    console.log("deposit SOL for mSOL:", depositSolTx);

    const txSig = await glamClient.staking.stakePoolDepositSol(
      BONK_STAKE_POOL,
      new BN(3_000_000_000),
    );
    console.log("deposit SOL for bonkSOL:", txSig);

    try {
      const ixs = await glamClient.price.priceVaultIxs(PriceDenom.SOL);
      expect(ixs.length).toEqual(1); // No external positions, only 1 ix should be returned

      const txSig = await buildAndSendTx(glamClient, ixs);
      console.log("Price vault:", txSig);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }

    const aum = await glamClient.price.getAum();
    expect(isInRange(aum, 9_996_999_994, 9_996_999_996)).toEqual(true);
  }, 15_000);

  it("Price the vault with LSTs and external assets", async () => {
    // Create a stake account
    const unstakeTx = await glamClient.staking.stakePoolWithdrawStake(
      BONK_STAKE_POOL,
      new BN(1_000_000_000),
    );
    console.log("unstake bonkSOL:", unstakeTx);

    try {
      const ixs = await glamClient.price.priceVaultIxs(PriceDenom.SOL);
      expect(ixs.length).toEqual(2); // tokens + stakes

      const txSig = await buildAndSendTx(glamClient, ixs);
      console.log("Price vault:", txSig);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }

    const aum = await glamClient.price.getAum();
    expect(isInRange(aum, 9_996_999_995, 9_996_999_998)).toEqual(true);
  }, 30_000);
});
