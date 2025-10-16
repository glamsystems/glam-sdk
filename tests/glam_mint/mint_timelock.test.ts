import { PublicKey } from "@solana/web3.js";
import {
  GlamClient,
  nameToChars,
  StateAccountType,
  TRANSFER_HOOK_PROGRAM,
  WSOL,
} from "../../src";
import { MintPolicy } from "../../src/deser/integrationPolicies";
import { sleep } from "../test-utils";

const txOptions = {
  simulate: true,
};

describe("mint_timelock", () => {
  const glamClient = new GlamClient();

  it("Initialize mint", async () => {
    const name = "GLAM Mint Timelock Test";
    const mintModel = {
      name: nameToChars(name),
      symbol: "GMT",
      uri: "https://glam.systems",
      baseAssetMint: WSOL,
    };

    try {
      const txSig = await glamClient.mint.initialize(
        mintModel,
        StateAccountType.MINT,
        txOptions,
      );
      console.log("Initialize mint:", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.nameStr).toEqual(name);
    expect(stateModel.mintModel?.transferHookProgram).toEqual(
      PublicKey.default,
    );
  }, 25_000);

  it("Enable timelock and update mint lockup=30", async () => {
    try {
      const txSig = await glamClient.state.update(
        { timelockDuration: 10 },
        txOptions,
      );
      console.log("Enable timelock:", txSig);

      const txUpdate = await glamClient.mint.update(
        { lockupPeriod: 30 },
        txOptions,
      );
      console.log("Update mint lockup=30:", txUpdate);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.mintModel?.lockupPeriod).toEqual(0); // update staged but not applied
    expect(stateModel.mintModel?.transferHookProgram).toEqual(
      PublicKey.default,
    );
    const stagedMintPolicyData =
      stateModel.pendingStateUpdates["integrationAcls"][0].protocolPolicies[0]
        .data;
    const stagedMintPolicy = MintPolicy.decode(stagedMintPolicyData);
    expect(stagedMintPolicy.lockupPeriod).toEqual(30);
  });

  it("Apply update immediately", async () => {
    try {
      const txSig = await glamClient.mint.updateApplyTimelock(txOptions);
      expect(txSig).toBeUndefined();
    } catch (e) {
      expect(e.message).toEqual("Timelock still active");
    }
  }, 15_000);

  it("Wait for timelock to expire and apply update", async () => {
    await sleep(11_000);

    try {
      const txSig = await glamClient.mint.updateApplyTimelock(txOptions);
      console.log("updateApplyTimelock:", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const isLockupEnabled = await glamClient.isLockupEnabled();
    expect(isLockupEnabled).toEqual(true);
    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.mintModel?.lockupPeriod).toEqual(30);
    expect(stateModel.mintModel?.transferHookProgram).toEqual(
      TRANSFER_HOOK_PROGRAM,
    );
  }, 15_000);

  it("Disable timelock and update mint lockup=0", async () => {
    try {
      const txSig = await glamClient.state.update(
        { timelockDuration: 0 },
        txOptions,
      );
      console.log("Disable timelock:", txSig);

      const txUpdate = await glamClient.mint.update(
        { lockupPeriod: 0 },
        txOptions,
      );
      console.log("Update mint lockup=0:", txUpdate);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("Wait for timelock to expire and apply update", async () => {
    await sleep(11_000);

    try {
      const txSig = await glamClient.mint.updateApplyTimelock(txOptions);
      console.log("updateApplyTimelock:", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const isLockupEnabled = await glamClient.isLockupEnabled();
    expect(isLockupEnabled).toEqual(false);
    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.mintModel?.lockupPeriod).toEqual(0);
    expect(stateModel.mintModel?.transferHookProgram).toEqual(
      PublicKey.default,
    );
  }, 15_000);

  // TODO: emergency update mint
});
