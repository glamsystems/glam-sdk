import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { BN, Wallet } from "@coral-xyz/anchor";

import {
  airdrop,
  createGlamStateForTest,
  stateModelForTest,
  str2seed,
} from "./setup";
import {
  GlamClient,
  GlamError,
  MSOL,
  MintModel,
  USDC,
  WSOL,
  nameToChars,
} from "../../src";

const key1 = Keypair.fromSeed(str2seed("acl_test_key1"));
const key2 = Keypair.fromSeed(str2seed("acl_test_key2"));

const txOptions = {
  simulate: true,
};

describe("access_control", () => {
  const glamClient = new GlamClient();

  beforeAll(async () => {
    await airdrop(
      glamClient.provider.connection,
      key1.publicKey,
      1_000_000_000,
    );
    await airdrop(
      glamClient.provider.connection,
      key2.publicKey,
      1_000_000_000,
    );
  });

  it("Initialize glam state", async () => {
    const { statePda, vaultPda } = await createGlamStateForTest(glamClient);
    console.log("State PDA:", statePda.toBase58());
    console.log("Vault PDA:", vaultPda.toBase58());

    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.baseAssetMint).toEqual(WSOL);
    expect(stateModel.baseAssetDecimals).toEqual(9);
    expect(stateModel.baseAssetTokenProgram).toEqual(0);
  }, 25_000);

  it("[integration-acl] enable integration protocols", async () => {
    // 0 by default
    let stateModel = await glamClient.fetchStateModel();
    expect(stateModel.integrationAcls?.length).toEqual(0);

    // drift integration, 3 protocols
    try {
      const txSig = await glamClient.access.enableProtocols(
        glamClient.extDriftProgram.programId,
        0b111,
        txOptions,
      );
      console.log("Enable drift integration and protocols", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
    stateModel = await glamClient.fetchStateModel();
    expect(stateModel.integrationAcls?.length).toEqual(1);

    // kamino integration, 1 protocol
    try {
      const txSig = await glamClient.access.enableProtocols(
        glamClient.extKaminoProgram.programId,
        0b001,
        txOptions,
      );
      console.log("Enable kamino integration and protocols", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
    stateModel = await glamClient.fetchStateModel();
    expect(stateModel.integrationAcls?.length).toEqual(2);
  });

  it("[integration-acl] disable integration protocols", async () => {
    let stateModel = await glamClient.fetchStateModel();
    expect(stateModel.integrationAcls?.length).toEqual(2);

    // delete drift integration protocols
    try {
      const txSig = await glamClient.access.disableProtocols(
        glamClient.extDriftProgram.programId,
        0b111,
        txOptions,
      );
      console.log("Enable drift integration and protocols", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    // delete kamino integration protocols
    try {
      const txSig = await glamClient.access.disableProtocols(
        glamClient.extKaminoProgram.programId,
        0b001,
        txOptions,
      );
      console.log("Enable kamino integration and protocols", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
    stateModel = await glamClient.fetchStateModel();
    expect(stateModel.integrationAcls?.length).toEqual(0);
  });

  it("[delegate-acl] grant delegate permissions", async () => {
    let stateModel = await glamClient.fetchStateModel();
    expect(stateModel.delegateAcls?.length).toEqual(0);

    // grant key1 drift protocol permissions
    try {
      const txSig = await glamClient.access.grantDelegatePermissions(
        key1.publicKey,
        glamClient.extDriftProgram.programId,
        0b001,
        new BN(0b1111),
        txOptions,
      );
      console.log("Granted key1 drift protocol permissions", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    // grant key2 drift token permissions
    try {
      const txSig = await glamClient.access.grantDelegatePermissions(
        key2.publicKey,
        glamClient.extSplProgram.programId,
        0b001,
        new BN(0b1111),
        txOptions,
      );
      console.log("Granted key2 token permissions", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    stateModel = await glamClient.fetchStateModel();
    expect(stateModel.delegateAcls?.length).toEqual(2);
  });

  it("[delegate-acl] revoke delegate permissions", async () => {
    let stateModel = await glamClient.fetchStateModel();
    expect(stateModel.delegateAcls?.length).toEqual(2);

    // revoke key1 drift protocol permissions
    try {
      const txSig = await glamClient.access.revokeDelegatePermissions(
        key1.publicKey,
        glamClient.extDriftProgram.programId,
        0b001,
        new BN(0b1111),
        txOptions,
      );
      console.log("Revoked key1 drift protocol permissions", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    // grant key2 drift token permissions
    try {
      const txSig = await glamClient.access.revokeDelegatePermissions(
        key2.publicKey,
        glamClient.extSplProgram.programId,
        0b001,
        new BN(0b1111),
        txOptions,
      );
      console.log("Revoked key2 token permissions", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    stateModel = await glamClient.fetchStateModel();
    expect(stateModel.delegateAcls?.length).toEqual(0);
  });

  it("Close state account", async () => {
    try {
      const txSig = await glamClient.state.close();
      console.log("Close state account:", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    // The following accounts should no longer exist
    const ret = await glamClient.provider.connection.getMultipleAccountsInfo([
      glamClient.statePda,
      glamClient.vaultPda,
    ]);
    expect(ret).toEqual([null, null]);
  }, 15_000);
});
