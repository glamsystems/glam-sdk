import { BN } from "@coral-xyz/anchor";
import {
  GlamClient,
  getOrderParams,
  MarketType,
  ModifyOrderParams,
  OrderType,
  PositionDirection,
  OrderStatus,
  Order,
  WSOL,
  nameToChars,
} from "../../src";
import {
  airdrop,
  createGlamStateForTest,
  stateModelForTest,
} from "../glam_protocol/setup";
import { DriftProtocolPolicy } from "../../src/deser/integrationPolicies";

const txOptions = { simulate: true };

describe("drift_protocol", () => {
  const glamClient = new GlamClient();

  const getOpenOrders = async (subAccountId: number = 0): Promise<Order[]> => {
    const driftUser = await glamClient.drift.fetchDriftUser(subAccountId);
    return (driftUser?.orders || []).filter(
      (o) => o.status === OrderStatus.OPEN,
    );
  };

  it("Create and initialize glam state", async () => {
    const { statePda, vaultPda } = await createGlamStateForTest(glamClient, {
      ...stateModelForTest,
      name: nameToChars("Drift Protocol Tests"),
      integrationAcls: [
        {
          integrationProgram: glamClient.extDriftProgram.programId,
          protocolsBitmask: new BN(0b01), // drift protocol
          protocolPolicies: [],
        },
        {
          integrationProgram: glamClient.protocolProgram.programId,
          protocolsBitmask: new BN(0b01), // system program
          protocolPolicies: [],
        },
        {
          integrationProgram: glamClient.extSplProgram.programId,
          protocolsBitmask: new BN(0b01), // token program
          protocolPolicies: [],
        },
      ],
      borrowable: [WSOL],
    });

    console.log("State PDA:", statePda.toBase58());
    console.log("Vault PDA:", vaultPda.toBase58());

    const state = await glamClient.fetchStateAccount();
    expect(state.integrationAcls.length).toEqual(3);

    // Airdrop 10 SOL to vault
    await airdrop(glamClient.provider.connection, vaultPda, 10_000_000_000);
  }, 30_000);

  it("Initialize user stats and create user #0", async () => {
    try {
      const txSig = await glamClient.drift.initialize(0, txOptions);
      console.log("driftInitialize", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const { user } = glamClient.drift.getDriftUserPdas();
    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.externalPositions).toEqual([user]);
  }, 15_000);

  it("Delete user #0", async () => {
    try {
      const txSig = await glamClient.drift.deleteUser(0, txOptions);
      console.log("deleteUser", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const { user } = glamClient.drift.getDriftUserPdas();
    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.externalPositions).toEqual([]);
  }, 15_000);

  it("Initialize user #1", async () => {
    try {
      const txSig = await glamClient.drift.initialize(1, txOptions);
      console.log("driftInitialize", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const { user } = glamClient.drift.getDriftUserPdas(1);
    const stateModel = await glamClient.fetchStateModel();
    expect(stateModel.externalPositions).toEqual([user]);
  }, 15_000);

  it("Update protocol policy and allowlist nothing", async () => {
    const policy = new DriftProtocolPolicy([], [], []);
    try {
      const txSig = await glamClient.access.setProtocolPolicy(
        glamClient.extDriftProgram.programId,
        0b01, // drift protocol
        policy.encode(),
        txOptions,
      );
      console.log("setProtocolPolicy", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("Deposit 10 SOL", async () => {
    const amount = new BN(10_000_000_000);

    try {
      const txSig = await glamClient.drift.deposit(amount, 1, 1, txOptions);
      console.log("driftDeposit", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("Withdraw 11 SOL (effectively borrow 1 SOL) - fail due to policy violation", async () => {
    const amount = new BN(11_000_000_000);
    try {
      const txSig = await glamClient.drift.withdraw(amount, 1, 1, txOptions);
      console.log("driftWithdraw", txSig);
      expect(txSig).toBeUndefined();
    } catch (e) {
      expect(e.message).toEqual("Protocol policy violation");
    }
  });

  it("Update protocol policy and allow borrowing SOL", async () => {
    const policy = new DriftProtocolPolicy([1], [0], [WSOL]);
    try {
      const txSig = await glamClient.access.setProtocolPolicy(
        glamClient.extDriftProgram.programId,
        0b01, // drift protocol
        policy.encode(),
        txOptions,
      );
      console.log("setProtocolPolicy", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("Withdraw 11 SOL (effectively borrow 1 SOL)", async () => {
    const amount = new BN(11_000_000_000);
    try {
      const txSig = await glamClient.drift.withdraw(amount, 1, 1);
      console.log("driftWithdraw", txSig);
      expect(txSig).toBeUndefined();
    } catch (e) {
      expect(e.message).toEqual("Insufficient collateral.");
    }
  });

  it("Withdraw 1 SOL", async () => {
    const amount = new BN(1_000_000_000);
    try {
      const txId = await glamClient.drift.withdraw(amount, 1, 1);
      console.log("driftWithdraw", txId);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("Place perp order", async () => {
    const orderParams = getOrderParams({
      orderType: OrderType.LIMIT,
      marketType: MarketType.PERP,
      direction: PositionDirection.LONG,
      marketIndex: 0, // SOL perp market
      baseAssetAmount: new BN(10_0000_000),
      price: new BN(100_000_000), // set a very low limit price
    });

    try {
      const txSig = await glamClient.drift.placeOrder(orderParams, 1);
      console.log("driftPlaceOrders", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("Cancel orders", async () => {
    const openOrdersBefore = await getOpenOrders(1);
    expect(openOrdersBefore.length).toEqual(1);

    try {
      // SOL perp market index is 0
      const txId = await glamClient.drift.cancelOrders(
        MarketType.PERP,
        0,
        PositionDirection.LONG,
        1,
      );

      console.log("driftCancelOrders", txId);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const openOrdersAfter = await getOpenOrders(1);
    expect(openOrdersAfter.length).toEqual(0);
  });

  it("Place spot order and modify it", async () => {
    const orderParams = getOrderParams({
      orderType: OrderType.LIMIT,
      marketType: MarketType.SPOT,
      direction: PositionDirection.LONG,
      marketIndex: 1,
      baseAssetAmount: new BN(10_0000_000),
      price: new BN(100_000_000), // set a very low limit price
    });

    try {
      const txEnableMarginTrading =
        await glamClient.drift.updateUserMarginTradingEnabled(true, 1);
      console.log("enableMargin", txEnableMarginTrading);

      const txPlaceSpotOrder = await glamClient.drift.placeOrder(
        orderParams,
        1,
        txOptions,
      );
      console.log("driftPlaceOrders", txPlaceSpotOrder);

      const openOrders = await getOpenOrders(1);
      expect(openOrders.length).toEqual(1);

      const { marketIndex, marketType, orderId } = openOrders[0];
      const modifyOrderParams: ModifyOrderParams = {
        direction: null,
        baseAssetAmount: null,
        price: new BN(110_000_000),
        reduceOnly: null,
        postOnly: null,
        bitFlags: null,
        maxTs: null,
        triggerPrice: null,
        triggerCondition: null,
        oraclePriceOffset: null,
        auctionDuration: null,
        auctionStartPrice: null,
        auctionEndPrice: null,
        policy: null,
      };
      const txModifyOrder = await glamClient.drift.modifyOrder(
        modifyOrderParams,
        orderId,
        marketIndex,
        marketType,
        1,
        txOptions,
      );
      console.log("modifyOrder", txModifyOrder);
    } catch (e) {
      console.error(e);
      throw e;
    }
  });

  it("Cancel orders by IDs", async () => {
    const openOrdersBefore = await getOpenOrders(1);
    expect(openOrdersBefore.length).toEqual(1);

    console.log("openOrdersBefore", openOrdersBefore);

    try {
      const txSig = await glamClient.drift.cancelOrdersByIds(
        openOrdersBefore.map((o) => o.orderId),
        1,
      );

      console.log("cancelOrdersByIds", txSig);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const openOrdersAfter = await getOpenOrders(1);
    expect(openOrdersAfter.length).toEqual(0);
  });
});
