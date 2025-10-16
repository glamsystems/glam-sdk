import { GlamClient, nameToChars, StateAccountType, WSOL } from "../../src";
import { airdrop, sleep } from "../test-utils";
import { BN } from "@coral-xyz/anchor";

const txOptions = {
  simulate: true,
};

describe("fees", () => {
  const glamClient = new GlamClient();

  it("Initialize mint", async () => {
    const name = "GLAM Mint Test Fees";
    const mintModel = {
      name: nameToChars(name),
      symbol: "GMT",
      uri: "https://glam.systems",
      baseAssetMint: WSOL,
      defaultAccountStateFrozen: false,
      feeStructure: {
        vault: {
          subscriptionFeeBps: 10,
          redemptionFeeBps: 20,
        },
        manager: {
          subscriptionFeeBps: 10,
          redemptionFeeBps: 20,
        },
        management: {
          feeBps: 10,
        },
        performance: {
          feeBps: 2000,
          hurdleRateBps: 500,
          hurdleType: { hard: {} },
        },
        protocol: {
          baseFeeBps: 0, // will be overwritten by program
          flowFeeBps: 0, // will be overwritten by program
        },
      },
    };

    try {
      const txSig = await glamClient.mint.initialize(
        mintModel,
        StateAccountType.TOKENIZED_VAULT,
        txOptions,
      );
      console.log("Initialize mint txSig", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.nameStr).toEqual(name);
    expect(stateModel.baseAssetMint).toEqual(WSOL);
    expect(stateModel.baseAssetTokenProgram).toEqual(0);
    expect(stateModel.mintModel?.feeStructure.protocol.baseFeeBps).toEqual(1);
    expect(stateModel.mintModel?.feeStructure.protocol.flowFeeBps).toEqual(
      2000,
    );
  }, 25_000);

  it("Set protocol fees", async () => {
    try {
      const txSig = await glamClient.fees.setProtocolFees(2, 4000, txOptions);
      console.log("Set protocol fees txSig", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.mintModel?.feeStructure.protocol.baseFeeBps).toEqual(2);
    expect(stateModel.mintModel?.feeStructure.protocol.flowFeeBps).toEqual(
      4000,
    );
  });

  it("First-time crystallize fees", async () => {
    try {
      // Airdrop 1000 SOL to vault and wrap it (vault pays fees in wSOL)
      // This make AUM > 0, otherwise the ix fails due to GlamError::PositiveAumRequired
      await airdrop(
        glamClient.provider.connection,
        glamClient.vaultPda,
        1_000_000_000_000,
      );
      const txWrapSolSig = await glamClient.vault.wrap(
        new BN(1_000_000_000_000),
      );
      console.log("Wrap vault SOL -> wSOL:", txWrapSolSig);

      const txSig = await glamClient.fees.crystallizeFees(txOptions);
      console.log("First-time crystallize fees:", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    // After first-time crystallization, all fees should be 0
    const stateModel = await glamClient.fetchStateModel();
    const { claimableFees, claimedFees, feeParams } = stateModel.mintModel!;
    Object.values(claimableFees).forEach((fee) => {
      expect(new BN(fee).eq(new BN(0))).toBeTruthy();
    });
    Object.values(claimedFees).forEach((fee) => {
      expect(new BN(fee).eq(new BN(0))).toBeTruthy();
    });
    expect(feeParams.lastPerformanceFeeCrystallized.toString()).toEqual(
      feeParams.lastManagementFeeCrystallized.toString(),
    );
    expect(feeParams.lastPerformanceFeeCrystallized.toString()).toEqual(
      feeParams.lastProtocolFeeCrystallized.toString(),
    );
  });

  it("Crystallize fees", async () => {
    await sleep(10_000); // more time elapsed, more fees generated

    try {
      const txSig = await glamClient.fees.crystallizeFees(txOptions);
      console.log("Crystallize fees txSig", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    // AUM-based fees should be >0, but perf fee should still be 0
    const stateModel = await glamClient.fetchStateModel();
    const { claimableFees, claimedFees } = stateModel.mintModel!;
    Object.values(claimedFees).forEach((fee) => {
      expect(new BN(fee).eq(new BN(0))).toBeTruthy();
    });
    expect(new BN(claimableFees.managementFee).gt(new BN(0))).toBeTruthy();
    expect(new BN(claimableFees.performanceFee).eq(new BN(0))).toBeTruthy();
    expect(new BN(claimableFees.protocolBaseFee).gt(new BN(0))).toBeTruthy();
    expect(new BN(claimableFees.protocolFlowFee).gt(new BN(0))).toBeTruthy();
  }, 15_000);

  it("Claim fees", async () => {
    // In this test there's no shares minted for subscriptions.
    // All shares are issued as fees.
    try {
      const txSig = await glamClient.fees.claimFees(txOptions);
      console.log("Claim fees", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const stateModel = await glamClient.fetchStateModel();
    const { claimableFees, claimedFees } = stateModel.mintModel!;
    Object.values(claimableFees).forEach((fee) => {
      expect(new BN(fee).eq(new BN(0))).toBeTruthy();
    });

    expect(new BN(claimedFees.managementFee).gt(new BN(0))).toBeTruthy();
    expect(new BN(claimedFees.performanceFee).eq(new BN(0))).toBeTruthy();
    expect(new BN(claimedFees.protocolBaseFee).gt(new BN(0))).toBeTruthy();
    expect(new BN(claimedFees.protocolFlowFee).gt(new BN(0))).toBeTruthy();
  });
});
