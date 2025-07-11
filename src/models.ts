import { IdlTypes, IdlAccounts } from "@coral-xyz/anchor";
import { GlamProtocol, GlamProtocolIdlJson } from "./glamExports";
import { PublicKey } from "@solana/web3.js";
import { ExtensionType, getExtensionData, Mint } from "@solana/spl-token";
import { TokenMetadata, unpack } from "@solana/spl-token-metadata";
import { BN } from "@coral-xyz/anchor";
import { SEED_METADATA, SEED_MINT, SEED_VAULT, USDC, WSOL } from "./constants";

export const GlamIntegrations =
  GlamProtocolIdlJson?.types
    ?.find((t) => t.name === "Integration")
    ?.type?.variants?.map((v) => v.name) ?? [];

export const GlamPermissions =
  GlamProtocolIdlJson?.types
    ?.find((t) => t.name === "Permission")
    ?.type?.variants?.map((v) => v.name)
    .filter((v) => !v.startsWith("__")) ?? [];

const GLAM_PROGRAM_ID_DEFAULT = new PublicKey(GlamProtocolIdlJson.address);

export type StateAccountType = { vault: {} } | { mint: {} } | { fund: {} };

// @ts-ignore cli-build failed due to "Type instantiation is excessively deep and possibly infinite."
export type StateAccount = IdlAccounts<GlamProtocol>["stateAccount"];

export type OpenfundsMetadataAccount =
  IdlAccounts<GlamProtocol>["openfundsMetadataAccount"];

export type StateModelType = IdlTypes<GlamProtocol>["stateModel"];
export class StateIdlModel implements StateModelType {
  id: PublicKey | null;
  accountType: StateAccountType | null;
  name: string | null;
  uri: string | null;
  enabled: boolean | null;

  assets: PublicKey[] | null;

  mints: MintModel[] | null;
  company: CompanyModel | null;
  owner: ManagerModel | null;
  created: CreatedModel | null;

  baseAsset: PublicKey | null;
  updateTimelock: number | null;
  timeUnit: { slot: {} } | { second: {} } | null;

  // ACLs
  delegateAcls: DelegateAcl[] | null;
  integrations: Integration[] | null;
  borrowableAssets: PublicKey[] | null;

  // Integration specific configs
  driftMarketIndexesPerp: number[] | null;
  driftMarketIndexesSpot: number[] | null;
  driftOrderTypes: number[] | null;
  kaminoLendingMarkets: PublicKey[] | null;
  meteoraDlmmPools: PublicKey[] | null;
  maxSwapSlippageBps: number | null;
  driftVaultsAllowlist: PublicKey[] | null;
  kaminoVaultsAllowlist: PublicKey[] | null;

  // Metadata
  metadata: Metadata | null;
  rawOpenfunds: FundOpenfundsModel | null;

  constructor(data: Partial<StateModelType>) {
    this.id = data.id ?? null;
    this.accountType = data.accountType ?? null;
    this.name = data.name ?? null;
    this.uri = data.uri ?? null;
    this.enabled = data.enabled ?? null;

    this.assets = data.assets ?? null;

    this.mints = data.mints ?? null;
    this.company = data.company ?? null;
    this.owner = data.owner ?? null;
    this.created = data.created ?? null;

    // Configs
    this.baseAsset = data.baseAsset ?? null;
    this.updateTimelock = data.updateTimelock ?? null;
    this.timeUnit = data.timeUnit ?? null;

    // ACLs
    this.delegateAcls = data.delegateAcls ?? null;
    this.integrations = data.integrations ?? null;
    this.borrowableAssets = data.borrowableAssets ?? null;

    // Integration specific configs
    this.driftMarketIndexesPerp = data.driftMarketIndexesPerp ?? null;
    this.driftMarketIndexesSpot = data.driftMarketIndexesSpot ?? null;
    this.driftOrderTypes = data.driftOrderTypes ?? null;
    this.kaminoLendingMarkets = data.kaminoLendingMarkets ?? null;
    this.meteoraDlmmPools = data.meteoraDlmmPools ?? null;
    this.maxSwapSlippageBps = data.maxSwapSlippageBps ?? null;
    this.driftVaultsAllowlist = data.driftVaultsAllowlist ?? null;
    this.kaminoVaultsAllowlist = data.kaminoVaultsAllowlist ?? null;

    this.metadata = data.metadata ?? null;
    this.rawOpenfunds = data.rawOpenfunds ?? null;
  }
}
export class StateModel extends StateIdlModel {
  readonly glamProgramId: PublicKey;

  externalVaultAccounts: PublicKey[] | null;
  pricedAssets: any[] | null;
  ledger: LedgerEntry[] | null;
  timelockExpiresAt: number | null;
  pendingUpdates: any | null; // timelocked updates

  constructor(
    data: Partial<StateModel>,
    glamProgramId = GLAM_PROGRAM_ID_DEFAULT,
  ) {
    super(data);
    this.glamProgramId = glamProgramId;

    // Will be set from state params
    this.externalVaultAccounts = data.externalVaultAccounts ?? null;
    this.pricedAssets = data.pricedAssets ?? null;
    this.ledger = data.ledger ?? null;
    this.timelockExpiresAt = data.timelockExpiresAt
      ? Number(data.timelockExpiresAt.toString())
      : null;
    this.pendingUpdates = data.pendingUpdates ?? null;
  }

  get idStr() {
    return this.id?.toBase58() || "";
  }

  get vaultPda() {
    if (!this.id) {
      throw new Error("Glam state ID not set");
    }
    const [pda, _bump] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_VAULT), this.id.toBuffer()],
      this.glamProgramId,
    );
    return pda;
  }

  get openfundsPda() {
    if (!this.id) {
      throw new Error("Glam state ID not set");
    }
    const [pda, _] = PublicKey.findProgramAddressSync(
      [Buffer.from(SEED_METADATA), this.id.toBuffer()],
      this.glamProgramId,
    );
    return pda;
  }

  get productType() {
    // @ts-ignore
    const val = Object.keys(this.accountType)[0];
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  get launchDate() {
    const createdAt = this.created?.createdAt.toNumber() ?? 0;
    return this.rawOpenfunds?.fundLaunchDate || createdAt
      ? new Date(createdAt * 1000).toISOString().split("T")[0]
      : "Unknown";
  }

  get mintAddresses() {
    if (this.mints && this.mints.length > 0 && !this.id) {
      // If share classes are set, state ID should also be set
      throw new Error("Glam state ID not set");
    }
    return (this.mints || []).map((_, i) =>
      MintModel.mintAddress(this.id!, i, this.glamProgramId),
    );
  }

  get sparkleKey() {
    if (!this.mints || this.mints.length === 0) {
      return this.idStr;
    }
    return this.mintAddresses[0].toBase58() || this.idStr;
  }

  /**
   * Build a StateModel from onchain data
   *
   * @param stateAccount provides core fund data
   * @param openfundsMetadataAccount includes fund rawOpenfunds data and share class rawOpenfunds data
   * @param glamMint
   */
  static fromOnchainAccounts(
    statePda: PublicKey,
    stateAccount: StateAccount,
    openfundsMetadataAccount?: OpenfundsMetadataAccount,
    glamMint?: Mint,
    glamProgramId: PublicKey = GLAM_PROGRAM_ID_DEFAULT,
  ) {
    let stateModel: Partial<StateModel> = {
      id: statePda,
      name: stateAccount.name,
      enabled: stateAccount.enabled,
      uri: stateAccount.uri,
      accountType: stateAccount.accountType,
      metadata: stateAccount.metadata,
      assets: stateAccount.assets,
      created: stateAccount.created,
      delegateAcls: stateAccount.delegateAcls,
      integrations: stateAccount.integrations,
      mints: [],
    };

    // All fields in fund params[0] should be available on the StateModel
    stateAccount.params[0].forEach((param) => {
      const name = Object.keys(param.name)[0];
      // @ts-ignore
      const value = Object.values(param.value)[0].val;
      if (new StateModel({}).hasOwnProperty(name)) {
        // @ts-ignore
        stateModel[name] = value;
      } else if (process.env.NODE_ENV === "development") {
        console.warn(`State param ${name} not found in StateModel`);
      }
    });

    // If timelock is enabled, parse pending updates from params[2] and params[3]
    stateModel.pendingUpdates = {};
    if (stateAccount.params[2]) {
      // pending updates to state params
      stateAccount.params[2].forEach((param) => {
        const name = Object.keys(param.name)[0];
        // @ts-ignore
        const value = Object.values(param.value)[0].val;
        stateModel.pendingUpdates[name] = value;
      });
    }

    if (stateAccount.params[3]) {
      // pending updates to mint params
    }

    // Build stateModel.rawOpenfunds from openfunds account
    const fundOpenfundsFields = {};
    openfundsMetadataAccount?.fund.forEach((param) => {
      const name = Object.keys(param.name)[0];
      const value = param.value;
      // @ts-ignore
      fundOpenfundsFields[name] = value;
    });
    stateModel.rawOpenfunds = new FundOpenfundsModel(fundOpenfundsFields);

    // Build stateModel.company from openfunds account
    const company = {};
    openfundsMetadataAccount?.company.forEach((param) => {
      const name = Object.keys(param.name)[0];
      const value = param.value;
      // @ts-ignore
      company[name] = value;
    });
    stateModel.company = new CompanyModel(company);

    // Build stateModel.owner from openfunds account
    const owner = { pubkey: stateAccount.owner };
    openfundsMetadataAccount?.fundManagers[0].forEach((param) => {
      const name = Object.keys(param.name)[0];
      const value = param.value;
      // @ts-ignore
      owner[name] = value;
    });
    stateModel.owner = new ManagerModel(owner);

    // Build the array of ShareClassModel
    stateAccount.mints.forEach((_, i) => {
      const mintIdlModel = {} as any;
      mintIdlModel["statePubkey"] = statePda;

      stateAccount.params[i + 1].forEach((param) => {
        const name = Object.keys(param.name)[0];
        // @ts-ignore
        const value = Object.values(param.value)[0].val;

        // Ledger is a mint param but we store it on the state model
        if (Object.keys(stateAccount.accountType)[0] === "fund") {
          if (name === "ledger") {
            stateModel["ledger"] = value;
          }
        }

        mintIdlModel[name] = value;
      });

      if (openfundsMetadataAccount) {
        const mintOpenfundsFields = {};
        openfundsMetadataAccount.shareClasses[i].forEach((param) => {
          const name = Object.keys(param.name)[0];
          const value = param.value;
          // @ts-ignore
          mintOpenfundsFields[name] = value;
        });
        mintIdlModel["rawOpenfunds"] = new MintOpenfundsModel(
          mintOpenfundsFields,
        );
      }

      if (glamMint) {
        const extMetadata = getExtensionData(
          ExtensionType.TokenMetadata,
          glamMint.tlvData,
        );
        const tokenMetadata = extMetadata
          ? unpack(extMetadata)
          : ({} as TokenMetadata);
        mintIdlModel["symbol"] = tokenMetadata?.symbol;
        mintIdlModel["name"] = tokenMetadata?.name;
        mintIdlModel["uri"] = tokenMetadata?.uri;

        const extPermDelegate = getExtensionData(
          ExtensionType.PermanentDelegate,
          glamMint.tlvData,
        );
        if (extPermDelegate) {
          const permanentDelegate = new PublicKey(extPermDelegate);
          mintIdlModel["permanentDelegate"] = permanentDelegate;
        }

        // default account state
        const extDefaultState = getExtensionData(
          ExtensionType.DefaultAccountState,
          glamMint.tlvData,
        );
        if (extDefaultState) {
          // @ts-ignore
          mintIdlModel["defaultAccountStateFrozen"] =
            extDefaultState.readUInt8() === 2;
        }
      }

      // stateModel.shareClasses should never be null
      // non-null assertion is safe and is needed to suppress type error
      stateModel.mints!.push(new MintModel(mintIdlModel));
    });

    stateModel.name =
      stateModel.name ||
      stateModel.rawOpenfunds?.legalFundNameIncludingUmbrella ||
      (stateModel.mints && stateModel.mints[0]?.name);

    // @ts-ignore
    return new StateModel(stateModel, glamProgramId);
  }
}

export type FundOpenfundsModelType =
  IdlTypes<GlamProtocol>["fundOpenfundsModel"];
export class FundOpenfundsModel implements FundOpenfundsModelType {
  fundDomicileAlpha2: string | null;
  legalFundNameIncludingUmbrella: string | null;
  fiscalYearEnd: string | null;
  fundCurrency: string | null;
  fundLaunchDate: string | null;
  investmentObjective: string | null;
  isEtc: boolean | null;
  isEuDirectiveRelevant: boolean | null;
  isFundOfFunds: boolean | null;
  isPassiveFund: boolean | null;
  isReit: boolean | null;
  legalForm: string | null;
  legalFundNameOnly: string | null;
  openEndedOrClosedEndedFundStructure: string | null;
  typeOfEuDirective: string | null;
  ucitsVersion: string | null;

  constructor(data: Partial<FundOpenfundsModelType>) {
    this.fundDomicileAlpha2 = data.fundDomicileAlpha2 ?? null;
    this.legalFundNameIncludingUmbrella =
      data.legalFundNameIncludingUmbrella ?? null;
    this.fiscalYearEnd = data.fiscalYearEnd ?? null;
    this.fundCurrency = data.fundCurrency ?? null;
    this.fundLaunchDate = data.fundLaunchDate ?? null;
    this.investmentObjective = data.investmentObjective ?? null;
    this.isEtc = data.isEtc ?? null;
    this.isEuDirectiveRelevant = data.isEuDirectiveRelevant ?? null;
    this.isFundOfFunds = data.isFundOfFunds ?? null;
    this.isPassiveFund = data.isPassiveFund ?? null;
    this.isReit = data.isReit ?? null;
    this.legalForm = data.legalForm ?? null;
    this.legalFundNameOnly = data.legalFundNameOnly ?? null;
    this.openEndedOrClosedEndedFundStructure =
      data.openEndedOrClosedEndedFundStructure ?? null;
    this.typeOfEuDirective = data.typeOfEuDirective ?? null;
    this.ucitsVersion = data.ucitsVersion ?? null;
  }
}

export type MintModelType = IdlTypes<GlamProtocol>["mintModel"];
export class MintIdlModel implements MintModelType {
  symbol: string | null;
  name: string | null;
  uri: string | null;

  statePubkey: PublicKey | null;
  asset: PublicKey | null;
  imageUri: string | null;

  allowlist: PublicKey[] | null;
  blocklist: PublicKey[] | null;

  lockUpPeriod: number | null;
  yearInSeconds: number | null;
  permanentDelegate: PublicKey | null;
  defaultAccountStateFrozen: boolean | null;
  feeStructure: FeeStructure | null;
  feeParams: FeeParams | null;
  notifyAndSettle: NotifyAndSettle | null;
  maxCap: BN | null;
  minSubscription: BN | null;
  minRedemption: BN | null;
  subscriptionPaused: boolean | null;
  redemptionPaused: boolean | null;

  isRawOpenfunds: boolean | null;
  rawOpenfunds: MintOpenfundsModel | null;

  constructor(data: Partial<MintModelType>) {
    this.symbol = data.symbol ?? null;
    this.name = data.name ?? null;
    this.uri = data.uri ?? null;
    this.statePubkey = data.statePubkey ?? null;
    this.asset = data.asset ?? null;
    this.imageUri = data.imageUri ?? null;
    this.isRawOpenfunds = data.isRawOpenfunds ?? null;
    this.rawOpenfunds = data.rawOpenfunds ?? null;
    this.allowlist = data.allowlist ?? null;
    this.blocklist = data.blocklist ?? null;
    this.lockUpPeriod = data.lockUpPeriod ?? null;
    this.yearInSeconds = data.yearInSeconds ?? null;
    this.permanentDelegate = data.permanentDelegate ?? null;
    this.defaultAccountStateFrozen = data.defaultAccountStateFrozen ?? null;
    this.feeStructure = data.feeStructure ?? null;
    this.feeParams = data.feeParams ?? null;
    this.notifyAndSettle = data.notifyAndSettle ?? null;
    this.maxCap = data.maxCap ?? null;
    this.minSubscription = data.minSubscription ?? null;
    this.minRedemption = data.minRedemption ?? null;
    this.subscriptionPaused = data.subscriptionPaused ?? null;
    this.redemptionPaused = data.redemptionPaused ?? null;
  }
}
export class MintModel extends MintIdlModel {
  constructor(data: Partial<MintIdlModel>) {
    super(data);
  }

  /**
   * @deprecated
   */
  static mintAddress(
    statePda: PublicKey,
    idx: number = 0,
    glamProgramId: PublicKey = GLAM_PROGRAM_ID_DEFAULT,
  ): PublicKey {
    const [pda, _] = PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEED_MINT),
        Uint8Array.from([idx % 256]),
        statePda.toBuffer(),
      ],
      glamProgramId,
    );
    return pda;
  }
}

export type MintOpenfundsModelType =
  IdlTypes<GlamProtocol>["mintOpenfundsModel"];
export class MintOpenfundsModel implements MintOpenfundsModelType {
  isin: string | null;
  shareClassCurrency: string | null;
  // currencyOfMinimalSubscription: string | null;
  fullShareClassName: string | null;
  hasPerformanceFee: boolean | null;
  investmentStatus: string | null;
  // investmentStatus: string | null;
  // minimalInitialSubscriptionCategory: string | null;
  minimalInitialSubscriptionInAmount: string | null;
  minimalInitialSubscriptionInShares: string | null;
  minimalSubsequentSubscriptionInAmount: string | null;
  minimalSubsequentSubscriptionInShares: string | null;
  // shareClassDistributionPolicy: string | null;
  // shareClassExtension: string | null;
  shareClassLaunchDate: string | null;
  shareClassLifecycle: string | null;
  launchPrice: string | null;
  launchPriceCurrency: string | null;
  launchPriceDate: string | null;
  // currencyOfMinimalOrMaximumRedemption: string | null;
  hasLockUpForRedemption: boolean | null;
  // isValidIsin: boolean | null;
  lockUpComment: string | null;
  lockUpPeriodInDays: string | null;
  // maximumInitialRedemptionInAmount: string | null;
  // maximumInitialRedemptionInShares: string | null;
  minimalInitialRedemptionInAmount: string | null;
  minimalInitialRedemptionInShares: string | null;
  minimalSubsequentRedemptionInAmount: string | null;
  minimalSubsequentRedemptionInShares: string | null;
  // minimalRedemptionCategory: string | null;
  // shareClassDividendType: string | null;
  roundingMethodForPrices: string | null;
  cusip: string | null;
  valor: string | null;

  constructor(obj: Partial<MintOpenfundsModelType>) {
    this.isin = obj.isin ?? null;
    this.shareClassCurrency = obj.shareClassCurrency ?? null;
    this.fullShareClassName = obj.fullShareClassName ?? null;
    this.hasPerformanceFee = obj.hasPerformanceFee ?? null;
    this.investmentStatus = obj.investmentStatus ?? null;
    this.minimalInitialSubscriptionInAmount =
      obj.minimalInitialSubscriptionInAmount ?? null;
    this.minimalInitialSubscriptionInShares =
      obj.minimalInitialSubscriptionInShares ?? null;
    this.minimalSubsequentSubscriptionInAmount =
      obj.minimalSubsequentSubscriptionInAmount ?? null;
    this.minimalSubsequentSubscriptionInShares =
      obj.minimalSubsequentSubscriptionInShares ?? null;
    this.shareClassLaunchDate = obj.shareClassLaunchDate ?? null;
    this.shareClassLifecycle = obj.shareClassLifecycle ?? null;
    this.launchPrice = obj.launchPrice ?? null;
    this.launchPriceCurrency = obj.launchPriceCurrency ?? null;
    this.launchPriceDate = obj.launchPriceDate ?? null;
    this.hasLockUpForRedemption = obj.hasLockUpForRedemption ?? null;
    this.lockUpComment = obj.lockUpComment ?? null;
    this.lockUpPeriodInDays = obj.lockUpPeriodInDays ?? null;
    this.minimalInitialRedemptionInAmount =
      obj.minimalInitialRedemptionInAmount ?? null;
    this.minimalInitialRedemptionInShares =
      obj.minimalInitialRedemptionInShares ?? null;
    this.minimalSubsequentRedemptionInAmount =
      obj.minimalSubsequentRedemptionInAmount ?? null;
    this.minimalSubsequentRedemptionInShares =
      obj.minimalSubsequentRedemptionInShares ?? null;
    this.roundingMethodForPrices = obj.roundingMethodForPrices ?? null;
    this.cusip = obj.cusip ?? null;
    this.valor = obj.valor ?? null;
  }
}

export type CompanyModelType = IdlTypes<GlamProtocol>["companyModel"];
export class CompanyModel implements CompanyModelType {
  fundGroupName: string | null;
  manCo: string | null;
  domicileOfManCo: string | null;
  emailAddressOfManCo: string | null;
  fundWebsiteOfManCo: string | null;

  constructor(data: Partial<CompanyModelType>) {
    this.fundGroupName = data.fundGroupName ?? null;
    this.manCo = data.manCo ?? null;
    this.domicileOfManCo = data.domicileOfManCo ?? null;
    this.emailAddressOfManCo = data.emailAddressOfManCo ?? null;
    this.fundWebsiteOfManCo = data.fundWebsiteOfManCo ?? null;
  }
}

export type MetadataType = IdlTypes<GlamProtocol>["metadata"];
export class Metadata implements MetadataType {
  template: IdlTypes<GlamProtocol>["metadataTemplate"];
  pubkey: PublicKey;
  uri: string;

  constructor(data: Partial<MetadataType>) {
    this.template = data.template!;
    this.pubkey = data.pubkey ?? new PublicKey(0);
    this.uri = data.uri ?? "";
  }
}

export type ManagerModelType = IdlTypes<GlamProtocol>["managerModel"];
export class ManagerModel implements ManagerModelType {
  portfolioManagerName: string | null;
  pubkey: PublicKey | null;
  kind: { wallet: {} } | { squads: {} } | null;

  constructor(data: Partial<ManagerModelType>) {
    this.portfolioManagerName = data.portfolioManagerName ?? null;
    this.pubkey = data.pubkey ?? null;
    this.kind = data.kind ?? null;
  }
}

export type CreatedModelType = IdlTypes<GlamProtocol>["createdModel"];
export class CreatedModel implements CreatedModelType {
  key: number[]; // Uint8Array;
  createdBy: PublicKey;
  createdAt: BN;

  constructor(obj: Partial<CreatedModelType>) {
    this.key = obj.key ?? [0, 0, 0, 0, 0, 0, 0, 0];
    this.createdBy = obj.createdBy ?? new PublicKey(0);
    this.createdAt = obj.createdAt ?? new BN(0);
  }
}

export type Permission = IdlTypes<GlamProtocol>["permission"];
export type DelegateAclType = IdlTypes<GlamProtocol>["delegateAcl"];
export class DelegateAcl implements DelegateAclType {
  pubkey: PublicKey;
  permissions: Permission[];
  expiresAt: BN;

  constructor(obj: Partial<DelegateAclType>) {
    this.pubkey = obj.pubkey!;
    this.permissions = obj.permissions ?? [];
    this.expiresAt = obj.expiresAt ?? new BN(0);
  }
}

export type Integration = IdlTypes<GlamProtocol>["integration"];
export type FeeStructure = IdlTypes<GlamProtocol>["feeStructure"];
export type FeeParams = IdlTypes<GlamProtocol>["feeParams"];
export type AccruedFees = IdlTypes<GlamProtocol>["accruedFees"];
export type NotifyAndSettle = IdlTypes<GlamProtocol>["notifyAndSettle"];
export type LedgerEntry = IdlTypes<GlamProtocol>["ledgerEntry"];

export class PriceDenom {
  static readonly SOL = { sol: {} };
  static readonly USD = { usd: {} };
  static readonly ASSET = { asset6: {} };

  static fromAsset(asset: PublicKey) {
    if (asset.equals(WSOL)) {
      return PriceDenom.SOL;
    }
    if (asset.equals(USDC)) {
      return PriceDenom.USD;
    }
    return PriceDenom.ASSET;
  }
}

export class TimeUnit {
  static readonly Slot = { slot: {} };
  static readonly Second = { second: {} };
}

export class VoteAuthorize {
  static readonly Voter = { voter: {} };
  static readonly Withdrawer = { withdrawer: {} };
}
