import { IdlTypes, IdlAccounts } from "@coral-xyz/anchor";
import {
  GlamProtocol,
  GlamMint,
  GlamProtocolIdlJson,
  GlamMintIdlJson,
} from "./glamExports";
import { PublicKey } from "@solana/web3.js";
import {
  ExtensionType,
  getExtensionData,
  getTransferHook,
  Mint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { TokenMetadata, unpack } from "@solana/spl-token-metadata";
import { BN } from "@coral-xyz/anchor";
import { USDC, WSOL } from "./constants";
import { charsToName, nameToChars } from "./utils/helpers";
import { MintPolicy } from "./deser/integrationPolicies";
import { getVaultPda } from "./utils/glamPDAs";

export const GlamIntegrations =
  GlamProtocolIdlJson?.types
    ?.find((t) => t.name === "Integration")
    ?.type?.variants?.map((v) => v.name) ?? [];

export const GlamPermissions =
  GlamProtocolIdlJson?.types
    ?.find((t) => t.name === "Permission")
    ?.type?.variants?.map((v) => v.name)
    .filter((v) => !v.startsWith("__")) ?? [];

const GLAM_PROTOCOL_PROGRAM_ID = new PublicKey(GlamProtocolIdlJson.address);

export type StateAccount = IdlAccounts<GlamProtocol>["stateAccount"];

export type StateModelType = IdlTypes<GlamProtocol>["stateModel"];
export class StateIdlModel implements StateModelType {
  accountType: StateAccountType | null;
  name: number[] | null;
  uri: string | null;
  enabled: boolean | null;

  assets: PublicKey[] | null;
  created: CreatedModel | null;
  owner: PublicKey | null;
  portfolioManagerName: number[] | null;

  // Configs / ACLs
  borrowable: PublicKey[] | null;
  timelockDuration: number | null;
  integrationAcls: IntegrationAcl[] | null;
  delegateAcls: DelegateAcl[] | null;

  constructor(data: Partial<StateModelType>) {
    this.accountType = data.accountType ?? null;
    this.name = data.name ?? null;
    this.uri = data.uri ?? null;
    this.enabled = data.enabled ?? null;

    this.assets = data.assets ?? null;
    this.created = data.created ?? null;
    this.owner = data.owner ?? null;
    this.portfolioManagerName = data.portfolioManagerName ?? null;

    // Configs / ACLs
    this.borrowable = data.borrowable ?? null;
    this.timelockDuration = data.timelockDuration ?? null;
    this.delegateAcls = data.delegateAcls ?? null;
    this.integrationAcls = data.integrationAcls ?? null;
  }
}

/**
 * Enriched state model built from multiple onchain accounts
 */
export class StateModel extends StateIdlModel {
  readonly glamProgramId: PublicKey;

  // Fields not available on StateIdlModel but can be derived from state account
  id: PublicKey | null;
  mint: PublicKey | null;
  mintModel: MintModel | null;
  baseAssetMint: PublicKey;
  baseAssetTokenProgram: number;
  baseAssetDecimals: number;
  pendingStateUpdates: any | null;
  pendingMintUpdates: any | null;
  timelockExpiresAt: number | null;
  externalPositions: PublicKey[] | null;
  pricedProtocols: any[] | null;
  borrowable: PublicKey[] | null;

  constructor(
    data: Partial<StateModel>,
    glamProgramId = GLAM_PROTOCOL_PROGRAM_ID,
  ) {
    super(data);
    this.glamProgramId = glamProgramId;

    // Will be set from state params
    this.id = data.id ?? null;
    this.mint = data.mint ?? null;
    this.mintModel = data.mintModel ?? null;

    this.baseAssetMint = data.baseAssetMint!;
    this.baseAssetDecimals = data.baseAssetDecimals!;
    this.baseAssetTokenProgram = data.baseAssetTokenProgram!;

    this.pendingStateUpdates = data.pendingStateUpdates ?? null;
    this.pendingMintUpdates = data.pendingMintUpdates ?? null;
    this.timelockExpiresAt = data.timelockExpiresAt
      ? Number(data.timelockExpiresAt.toString())
      : null;
    this.externalPositions = data.externalPositions ?? null;
    this.pricedProtocols = data.pricedProtocols ?? null;
    this.borrowable = data.borrowable ?? null;
  }

  get idStr() {
    return this.id?.toBase58() || "";
  }

  get nameStr() {
    return this.name ? charsToName(this.name) : "";
  }

  get vault() {
    if (!this.id) {
      throw new Error("State ID not initialized");
    }
    return getVaultPda(this.id, this.glamProgramId);
  }

  get productType(): string {
    // @ts-ignore
    const val = Object.keys(this.accountType)[0];
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
  }

  get launchDate() {
    const createdAt = this.created?.createdAt.toNumber() ?? 0;
    return new Date(createdAt * 1000).toISOString().split("T")[0] || "Unknown";
  }

  get sparkleKey() {
    if (!this.mint || !this.id) {
      throw new Error("Mint or state pubkey not set");
    }
    return (
      this.mint.equals(PublicKey.default) ? this.id : this.mint
    ).toBase58();
  }

  get baseAssetTokenProgramId() {
    switch (this.baseAssetTokenProgram) {
      case 0:
        return TOKEN_PROGRAM_ID;
      case 1:
        return TOKEN_2022_PROGRAM_ID;
      default:
        throw new Error("Invalid base asset token program");
    }
  }

  // A union set of assets and borrowable assets
  get assetsForPricing(): PublicKey[] {
    const assets = new Set<string>([]);
    this.assets?.forEach((a) => assets.add(a.toBase58()));
    this.borrowable?.forEach((b) => assets.add(b.toBase58()));
    return Array.from(assets).map((k) => new PublicKey(k));
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
    glamMint?: Mint,
    requestQueue?: RequestQueue,
    glamProgramId: PublicKey = GLAM_PROTOCOL_PROGRAM_ID,
  ) {
    const stateModel: Partial<StateModel> = { id: statePda };
    Object.entries(stateAccount).forEach(([key, value]) => {
      (stateModel as any)[key] = value;
    });

    // All fields in state_params[0] should be available on the StateModel
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

    // If timelock is enabled, parse pending state & mint updates from params[2] & params[3]
    stateModel.pendingStateUpdates = {};
    stateModel.pendingMintUpdates = {};
    if (stateAccount.params[2]) {
      stateAccount.params[2].forEach((param) => {
        const name = Object.keys(param.name)[0];
        // @ts-ignore
        const value = Object.values(param.value)[0].val;
        stateModel.pendingStateUpdates[name] = value;
      });
    }
    if (stateAccount.params[3]) {
      stateAccount.params[3].forEach((param) => {
        const name = Object.keys(param.name)[0];
        // @ts-ignore
        const value = Object.values(param.value)[0].val;
        stateModel.pendingMintUpdates[name] = value;
      });
    }

    // Build mint model
    if (glamMint) {
      const mintModel = {
        statePda,
        baseAssetMint: stateAccount.baseAssetMint,
      } as Partial<MintModel>;

      // Parse mint params
      stateAccount.params[1].forEach((param) => {
        const name = Object.keys(param.name)[0];
        // @ts-ignore
        const value = Object.values(param.value)[0].val;
        // @ts-ignore
        mintModel[name] = value;
      });

      // Parse token extensions
      const extMetadata = getExtensionData(
        ExtensionType.TokenMetadata,
        glamMint.tlvData,
      );
      const tokenMetadata = extMetadata
        ? unpack(extMetadata)
        : ({} as TokenMetadata);
      mintModel["symbol"] = tokenMetadata?.symbol;
      mintModel["name"] = nameToChars(tokenMetadata?.name);
      mintModel["uri"] = tokenMetadata?.uri;
      if (tokenMetadata?.additionalMetadata) {
        tokenMetadata.additionalMetadata.forEach(([k, v]) => {
          if (k === "LockupPeriodSeconds") {
            mintModel["lockupPeriod"] = parseInt(v);
          }
        });
      }

      mintModel["transferHookProgram"] =
        getTransferHook(glamMint)?.programId ?? null;

      const extPermDelegate = getExtensionData(
        ExtensionType.PermanentDelegate,
        glamMint.tlvData,
      );
      if (extPermDelegate) {
        const permanentDelegate = new PublicKey(
          extPermDelegate.subarray(0, 32),
        );
        mintModel["permanentDelegate"] = permanentDelegate;
      }
      const extDefaultState = getExtensionData(
        ExtensionType.DefaultAccountState,
        glamMint.tlvData,
      );
      if (extDefaultState) {
        mintModel["defaultAccountStateFrozen"] =
          extDefaultState.readUInt8() === 2;
      }

      // Parse mint policy
      const mintIntegrationPolicy = stateAccount.integrationAcls?.find(
        (acl) => acl.integrationProgram.toString() === GlamMintIdlJson.address,
      );
      const mintPolicyData = mintIntegrationPolicy?.protocolPolicies?.find(
        (policy: any) => policy.protocolBitflag === 1,
      )?.data;
      const mintPolicy = MintPolicy.decode(mintPolicyData);
      Object.entries(mintPolicy).forEach(([key, value]) => {
        (mintModel as any)[key] = value;
      });

      // Parse request queue
      if (requestQueue) {
        mintModel.subscriptionPaused = requestQueue.subscriptionPaused;
        mintModel.redemptionPaused = requestQueue.redemptionPaused;
      }

      // Assign mint model
      stateModel.mintModel = new MintModel(mintModel);
    }

    return new StateModel(stateModel, glamProgramId);
  }
}

export type MintModelType = IdlTypes<GlamProtocol>["mintModel"];
export class MintIdlModel implements MintModelType {
  symbol: string | null;
  name: number[] | null;
  uri: string | null;

  yearInSeconds: number | null;
  permanentDelegate: PublicKey | null;
  defaultAccountStateFrozen: boolean | null;
  feeStructure: FeeStructure | null;
  notifyAndSettle: NotifyAndSettle | null;

  lockupPeriod: number | null;
  maxCap: BN | null;
  minSubscription: BN | null;
  minRedemption: BN | null;
  allowlist: PublicKey[] | null;
  blocklist: PublicKey[] | null;

  constructor(data: Partial<MintModelType>) {
    this.symbol = data.symbol ?? null;
    this.name = data.name ?? null;
    this.uri = data.uri ?? null;

    this.yearInSeconds = data.yearInSeconds ?? null;
    this.permanentDelegate = data.permanentDelegate ?? null;
    this.defaultAccountStateFrozen = data.defaultAccountStateFrozen ?? null;
    this.feeStructure = data.feeStructure ?? null;
    this.notifyAndSettle = data.notifyAndSettle ?? null;

    this.lockupPeriod = data.lockupPeriod ?? null;
    this.maxCap = data.maxCap ?? null;
    this.minSubscription = data.minSubscription ?? null;
    this.minRedemption = data.minRedemption ?? null;
    this.allowlist = data.allowlist ?? null;
    this.blocklist = data.blocklist ?? null;
  }
}
export class MintModel extends MintIdlModel {
  statePda: PublicKey | null;
  baseAssetMint: PublicKey | null;
  transferHookProgram: PublicKey | null;
  claimableFees: AccruedFees | null;
  claimedFees: AccruedFees | null;
  feeParams: FeeParams | null;
  subscriptionPaused: boolean | null;
  redemptionPaused: boolean | null;

  constructor(data: Partial<MintModel>) {
    super(data);
    this.statePda = data.statePda ?? null;
    this.baseAssetMint = data.baseAssetMint ?? null;
    this.transferHookProgram = data.transferHookProgram ?? null;
    this.claimableFees = data.claimableFees ?? null;
    this.claimedFees = data.claimedFees ?? null;
    this.feeParams = data.feeParams ?? null;
    this.subscriptionPaused = data.subscriptionPaused ?? null;
    this.redemptionPaused = data.redemptionPaused ?? null;
  }

  get nameStr() {
    return this.name ? charsToName(this.name) : "";
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

export type EmergencyAccessUpdateArgsType =
  IdlTypes<GlamProtocol>["emergencyAccessUpdateArgs"];
export class EmergencyAccessUpdateArgs
  implements EmergencyAccessUpdateArgsType
{
  disabledIntegrations: PublicKey[];
  disabledDelegates: PublicKey[];
  stateEnabled: boolean | null;

  constructor(obj: Partial<EmergencyAccessUpdateArgsType>) {
    this.disabledIntegrations = obj.disabledIntegrations ?? [];
    this.disabledDelegates = obj.disabledDelegates ?? [];
    this.stateEnabled = obj.stateEnabled ?? null;
  }
}

export type EmergencyUpdateMintArgsType =
  IdlTypes<GlamMint>["emergencyUpdateMintArgs"];
export class EmergencyUpdateMintArgs implements EmergencyUpdateMintArgsType {
  requestType!: RequestType;
  setPaused!: boolean;
}

export type IntegrationPermissionsType =
  IdlTypes<GlamProtocol>["integrationPermissions"];
export type ProtocolPermissionsType =
  IdlTypes<GlamProtocol>["protocolPermissions"];

export class IntegrationPermissions implements IntegrationPermissionsType {
  integrationProgram: PublicKey;
  protocolPermissions: ProtocolPermissionsType[];

  constructor(obj: Partial<IntegrationPermissionsType>) {
    this.integrationProgram = obj.integrationProgram!;
    this.protocolPermissions = obj.protocolPermissions ?? [];
  }
}

export class ProtocolPermissions implements ProtocolPermissionsType {
  protocolBitflag: number;
  permissionsBitmask: BN;

  constructor(obj: Partial<ProtocolPermissionsType>) {
    this.protocolBitflag = obj.protocolBitflag!;
    this.permissionsBitmask = obj.permissionsBitmask!;
  }
}

export type ProtocolPolicyType = IdlTypes<GlamProtocol>["protocolPolicy"];
export class ProtocolPolicy implements ProtocolPolicyType {
  protocolBitflag: number;
  data: Buffer;

  constructor(obj: Partial<ProtocolPolicyType>) {
    this.protocolBitflag = obj.protocolBitflag!;
    this.data = obj.data!;
  }
}

export type IntegrationAclType = IdlTypes<GlamProtocol>["integrationAcl"];
export class IntegrationAcl implements IntegrationAclType {
  integrationProgram: PublicKey;
  protocolsBitmask: number;
  protocolPolicies: ProtocolPolicy[];

  constructor(obj: Partial<IntegrationAclType>) {
    this.integrationProgram = obj.integrationProgram!;
    this.protocolsBitmask = obj.protocolsBitmask!;
    this.protocolPolicies = obj.protocolPolicies ?? [];
  }
}

export type DelegateAclType = IdlTypes<GlamProtocol>["delegateAcl"];
export class DelegateAcl implements DelegateAclType {
  pubkey: PublicKey;
  integrationPermissions: IntegrationPermissions[];
  expiresAt: BN;

  constructor(obj: Partial<DelegateAclType>) {
    this.pubkey = obj.pubkey!;
    this.integrationPermissions = obj.integrationPermissions ?? [];
    this.expiresAt = obj.expiresAt ?? new BN(0);
  }
}

export type FeeStructure = IdlTypes<GlamProtocol>["feeStructure"];
export type FeeParams = IdlTypes<GlamProtocol>["feeParams"];
export type AccruedFees = IdlTypes<GlamProtocol>["accruedFees"];
export type NotifyAndSettle = IdlTypes<GlamProtocol>["notifyAndSettle"];

export class StateAccountType {
  static readonly VAULT = { vault: {} };
  static readonly TOKENIZED_VAULT = { tokenizedVault: {} };
  static readonly MINT = { mint: {} };

  static equals(a: StateAccountType, b: StateAccountType) {
    return Object.keys(a)[0] === Object.keys(b)[0];
  }
}

export class RequestType {
  static readonly SUBSCRIPTION = { subscription: {} };
  static readonly REDEMPTION = { redemption: {} };

  static equals(a: RequestType, b: RequestType) {
    return Object.keys(a)[0] === Object.keys(b)[0];
  }

  static fromInt(int: number) {
    switch (int) {
      case 0:
        return RequestType.SUBSCRIPTION;
      case 1:
        return RequestType.REDEMPTION;
      default:
        throw new Error("Invalid request type");
    }
  }
}

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

  static fromString(str: string) {
    if (str === "SOL") {
      return PriceDenom.SOL;
    }
    if (str === "USD") {
      return PriceDenom.USD;
    }
    throw new Error("Invalid price denomination");
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

export type RequestQueue = IdlTypes<GlamMint>["requestQueue"];
export type PendingRequest = IdlTypes<GlamMint>["pendingRequest"];
