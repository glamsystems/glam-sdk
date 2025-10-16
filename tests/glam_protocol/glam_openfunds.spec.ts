import { PublicKey } from "@solana/web3.js";
import {
  StateModel,
  FundOpenfundsModel,
  GlamClient,
  MintOpenfundsModel,
  USDC,
  WSOL,
  StateAccountType,
} from "../../src";

describe("glam_openfunds", () => {
  const glamClient = new GlamClient();

  const manager = glamClient.getSigner();

  // fund1: 1 share class + implicit fields
  const state1 = {
    mints: [
      {
        // Glam Token
        name: "Glam Investment Fund BTC-SOL",
        symbol: "GBS",
        asset: USDC,
        // Glam
        lockupPeriod: 40 * 24 * 60 * 60,
        permanentDelegate: manager,
        defaultAccountStateFrozen: false,
        // Openfunds Share Class
        rawOpenfunds: {
          fullShareClassName: null, // auto
          isin: "XS1082172823",
          shareClassCurrency: "USDC",
          shareClassLifecycle: "active",
          investmentStatus: "open",
        } as Partial<MintOpenfundsModel>,
      },
    ],
    // Glam
    accountType: StateAccountType.TOKENIZED_VAULT,
    name: "Glam Investment Fund BTC-SOL",
    enabled: true,
    assets: [USDC, WSOL],
    metadata: {
      template: { openfunds: {} },
    },
    // Openfunds (Fund)
    rawOpenfunds: {
      fundDomicileAlpha2: "XS",
      legalFundNameIncludingUmbrella: null, // auto
      fundLaunchDate: null, // auto
      investmentObjective: "demo",
      fundCurrency: "USDC",
      openEndedOrClosedEndedFundStructure: "open-ended fund",
      fiscalYearEnd: "12-31",
      legalForm: "other",
    } as FundOpenfundsModel,
    // Openfunds Company (simplified)
    company: {
      fundGroupName: "Glam Systems",
      manCo: "Glam Management",
      domicileOfManCo: "CH",
      emailAddressOfManCo: "hello@glam.systems",
      fundWebsiteOfManCo: "https://glam.systems",
    },
    // Openfunds Manager (simplified)
    owner: {
      portfolioManagerName: "0x0ece.sol",
      pubkey: manager,
      kind: { wallet: {} },
    },
  } as Partial<StateModel>;

  // fund1b: 1 share class, all fields explicit
  const state1b = {
    mints: [
      {
        // Glam Token
        name: "Glam Investment Fund BTC-SOL (b)",
        symbol: "GBS",
        uri: "",
        statePubkey: null,
        asset: USDC,
        imageUri: "",
        // Glam
        permanentDelegate: new PublicKey(0),
        lockupPeriod: 40 * 24 * 60 * 60,
        defaultAccountStateFrozen: false,
        isRawOpenfunds: true,
        // Openfunds Share Class
        rawOpenfunds: {
          isin: "XS1082172823",
          shareClassCurrency: "USDC",
          fullShareClassName: "Glam Investment Fund BTC-SOL",
          currencyOfMinimalSubscription: "USDC",
          investmentStatus: "open",
          minimalInitialSubscriptionCategory: "amount",
          minimalInitialSubscriptionInAmount: "1000",
          minimalInitialSubscriptionInShares: "0",
          shareClassExtension: "",
          shareClassDistributionPolicy: "accumulating",
          shareClassLaunchDate: new Date().toISOString().split("T")[0],
          shareClassLifecycle: "active",
          launchPrice: "100",
          launchPriceCurrency: "USD",
          launchPriceDate: new Date().toISOString().split("T")[0],
        } as Partial<MintOpenfundsModel>,
      },
    ],
    // Glam
    accountType: StateAccountType.TOKENIZED_VAULT,
    enabled: true,
    name: "Glam Investment Fund BTC-SOL (b)",
    assets: [USDC, WSOL],
    // Openfunds (Fund)
    rawOpenfunds: {
      fundDomicileAlpha2: "XS",
      legalFundNameIncludingUmbrella: "Glam Investment Fund BTC-SOL (b)",
      fundLaunchDate: new Date().toISOString().split("T")[0],
      investmentObjective: "demo",
      fundCurrency: "USDC",
      openEndedOrClosedEndedFundStructure: "open-ended fund",
      fiscalYearEnd: "12-31",
      legalForm: "other",
    } as FundOpenfundsModel,
    // Openfunds Company (simplified)
    company: {
      fundGroupName: "Glam Systems",
      manCo: "Glam Management",
      domicileOfManCo: "CH",
      emailAddressOfManCo: "hello@glam.systems",
      fundWebsiteOfManCo: "https://glam.systems",
    },
    // Openfunds Manager (simplified)
    owner: {
      portfolioManagerName: "0x0ece.sol",
      pubkey: null,
      kind: { wallet: {} },
    },
  } as Partial<StateModel>;

  it("Initialize fund with 1 share class", async () => {
    try {
      const [txId, statePda] = await glamClient.state.create(state1);
      console.log(`Glam state ${statePda} initialized, txId: ${txId}`);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, 30_000);

  it("Initialize fund with 1 share class (b)", async () => {
    try {
      const [txId, statePda] = await glamClient.state.create(state1b);
      console.log(`Glam state ${statePda} initialized, txId: ${txId}`);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }, 30_000);
});
