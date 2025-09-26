import { Program, Provider } from "@coral-xyz/anchor";

import type { GlamProtocol } from "../target/types/glam_protocol";
import type { GlamConfig } from "../target/types/glam_config";
import type { GlamMint } from "../target/types/glam_mint";
import type { ExtSpl } from "../target/types/ext_spl";
import type { ExtDrift } from "../target/types/ext_drift";
import type { ExtKamino } from "../target/types/ext_kamino";
import type { ExtMarinade } from "../target/types/ext_marinade";
import type { ExtStakePool } from "../target/types/ext_stake_pool";
import type { ExtCctp } from "../target/types/ext_cctp";

import GlamProtocolIdlJson from "../target/idl/glam_protocol.json";
import GlamConfigIdlJson from "../target/idl/glam_config.json";
import GlamMintIdlJson from "../target/idl/glam_mint.json";
import ExtSplIdlJson from "../target/idl/ext_spl.json";
import ExtDriftIdlJson from "../target/idl/ext_drift.json";
import ExtKaminoIdlJson from "../target/idl/ext_kamino.json";
import ExtMarinadeIdlJson from "../target/idl/ext_marinade.json";
import ExtStakePoolIdlJson from "../target/idl/ext_stake_pool.json";
import ExtCctpIdlJson from "../target/idl/ext_cctp.json";

const GlamProtocolIdl = GlamProtocolIdlJson as GlamProtocol;
const GlamConfigIdl = GlamConfigIdlJson as GlamConfig;
const GlamMintIdl = GlamMintIdlJson as GlamMint;
const ExtSplIdl = ExtSplIdlJson as ExtSpl;
const ExtDriftIdl = ExtDriftIdlJson as ExtDrift;
const ExtKaminoIdl = ExtKaminoIdlJson as ExtKamino;
const ExtMarinadeIdl = ExtMarinadeIdlJson as ExtMarinade;
const ExtStakePoolIdl = ExtStakePoolIdlJson as ExtStakePool;
const ExtCctpIdl = ExtCctpIdlJson as ExtCctp;

export {
  GlamProtocol,
  GlamProtocolIdl,
  GlamProtocolIdlJson,
  GlamMint,
  GlamMintIdl,
  GlamMintIdlJson,
  GlamConfig,
};

export type GlamProtocolProgram = Program<GlamProtocol>;
export type GlamConfigProgram = Program<GlamConfig>;
export type GlamMintProgram = Program<GlamMint>;
export type ExtSplProgram = Program<ExtSpl>;
export type ExtDriftProgram = Program<ExtDrift>;
export type ExtKaminoProgram = Program<ExtKamino>;
export type ExtMarinadeProgram = Program<ExtMarinade>;
export type ExtStakePoolProgram = Program<ExtStakePool>;
export type ExtCctpProgram = Program<ExtCctp>;

export function getGlamProtocolProgram(
  provider: Provider,
): GlamProtocolProgram {
  return new Program(GlamProtocolIdl, provider) as GlamProtocolProgram;
}

export function getGlamMintProgram(provider: Provider): GlamMintProgram {
  return new Program(GlamMintIdl, provider) as GlamMintProgram;
}

export function getGlamConfigProgram(provider: Provider): GlamConfigProgram {
  return new Program(GlamConfigIdl, provider) as GlamConfigProgram;
}

export function getExtSplProgram(provider: Provider): ExtSplProgram {
  return new Program(ExtSplIdl, provider) as ExtSplProgram;
}

export function getExtDriftProgram(provider: Provider): ExtDriftProgram {
  return new Program(ExtDriftIdl, provider) as ExtDriftProgram;
}

export function getExtKaminoProgram(provider: Provider): ExtKaminoProgram {
  return new Program(ExtKaminoIdl, provider) as ExtKaminoProgram;
}

export function getExtMarinadeProgram(provider: Provider): ExtMarinadeProgram {
  return new Program(ExtMarinadeIdl, provider) as ExtMarinadeProgram;
}

export function getExtStakePoolProgram(
  provider: Provider,
): ExtStakePoolProgram {
  return new Program(ExtStakePoolIdl, provider) as ExtStakePoolProgram;
}

export function getExtCctpProgram(provider: Provider): ExtCctpProgram {
  return new Program(ExtCctpIdl, provider) as ExtCctpProgram;
}
