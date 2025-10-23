import { IdlTypes } from "@coral-xyz/anchor";
import { GlamProtocol } from "../glamExports";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

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
