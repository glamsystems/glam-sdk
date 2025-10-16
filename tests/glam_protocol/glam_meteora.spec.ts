import { PublicKey, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

import { airdrop, createGlamStateForTest } from "./setup";
import { fetchMeteoraPositions, GlamClient, PriceDenom } from "../../src";

const SOL_USDC_POOL = new PublicKey(
  "5rCf1DM8LjKTw4YqhnoLcngyZYeNnQqztScTogYHAS6",
);

describe("glam_meteora", () => {
  const glamClient = new GlamClient();

  it("Initialize glam state", async () => {
    const { statePda, vaultPda } = await createGlamStateForTest(glamClient);
    console.log("State PDA:", statePda.toBase58());
    console.log("Vault PDA:", vaultPda.toBase58());

    await airdrop(
      glamClient.provider.connection,
      glamClient.vaultPda,
      10_000_000_000,
    );

    await glamClient.state.update({
      integrations: [{ meteoraDlmm: {} }],
    });

    await glamClient.vault.wrap(new BN(1_000_000_000));
  }, 30_000);

  it("Init position, add liq, remove liq, claim fee, and close position", async () => {
    try {
      // init position
      const txSig =
        await glamClient.meteoraDlmm.initializePositionPda(SOL_USDC_POOL);
      console.log("init position", txSig);

      const positions = await fetchMeteoraPositions(
        glamClient.provider.connection,
        glamClient.vaultPda,
      );
      let stateModel = await glamClient.fetchStateModel();
      expect(stateModel.externalVaultAccounts).toEqual(positions);

      // add liquidity
      const txAddLiq = await glamClient.meteoraDlmm.addLiquidityByStrategy(
        positions[0],
        new BN(1_000_000_000),
        new BN(0),
        "BidAskImBalanced",
        10,
      );
      console.log("addLiquidityByStrategy", txAddLiq);

      // price vault
      const pricingIxs = await glamClient.price.priceVaultIxs(PriceDenom.SOL);
      const tx = new Transaction();
      tx.add(...pricingIxs);
      const vTx = await glamClient.intoVersionedTransaction(tx, {
        simulate: true,
      });
      const txPricing = await glamClient.sendAndConfirm(vTx);
      console.log("priceVault", txPricing);

      // remove liquidity
      const txRemoveLiq = await glamClient.meteoraDlmm.removeLiquidityByRange(
        positions[0],
        10000,
      );
      console.log("removeLiquidityByRange", txRemoveLiq);

      // claim fee
      const txClaimFee = await glamClient.meteoraDlmm.claimFee(positions[0]);
      console.log("claimFee", txClaimFee);

      // close position
      const txClose = await glamClient.meteoraDlmm.closePosition(positions[0]);
      console.log("closePosition", txClose);
      stateModel = await glamClient.fetchStateModel();
      expect(stateModel.externalVaultAccounts).toEqual([]);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, 15_000);

  it("Init and close position pda", async () => {
    try {
      const txInitPosition =
        await glamClient.meteoraDlmm.initializePositionPda(SOL_USDC_POOL);
      console.log("init position pda", txInitPosition);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const positions = await fetchMeteoraPositions(
      glamClient.provider.connection,
      glamClient.vaultPda,
    );
    let stateModel = await glamClient.fetchStateModel();
    expect(stateModel.externalVaultAccounts).toEqual(positions);

    try {
      const txSig = await glamClient.meteoraDlmm.closePosition(positions[0]);
      console.log("close position", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
    stateModel = await glamClient.fetchStateModel();
    expect(stateModel.externalVaultAccounts).toEqual([]);
  }, 15_000);
});
