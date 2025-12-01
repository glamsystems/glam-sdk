import { Program, Provider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

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

export { GlamProtocol, GlamMint, GlamConfig };

export type GlamProtocolProgram = Program<GlamProtocol>;
export type GlamConfigProgram = Program<GlamConfig>;
export type GlamMintProgram = Program<GlamMint>;
export type ExtSplProgram = Program<ExtSpl>;
export type ExtDriftProgram = Program<ExtDrift>;
export type ExtKaminoProgram = Program<ExtKamino>;
export type ExtMarinadeProgram = Program<ExtMarinade>;
export type ExtStakePoolProgram = Program<ExtStakePool>;
export type ExtCctpProgram = Program<ExtCctp>;

export function getGlamProtocolProgramId() {
  if (process.env.GLAM_STAGING) {
    return new PublicKey("gstgptmbgJVi5f8ZmSRVZjZkDQwqKa3xWuUtD5WmJHz");
  }
  return new PublicKey("GLAMpaME8wdTEzxtiYEAa5yD8fZbxZiz2hNtV58RZiEz");
}

export function getGlamMintProgramId() {
  if (process.env.GLAM_STAGING) {
    return new PublicKey("gstgm1M39mhgnvgyScGUDRwNn5kNVSd97hTtyow1Et5");
  }
  return new PublicKey("GM1NtvvnSXUptTrMCqbogAdZJydZSNv98DoU5AZVLmGh");
}

export function getExtSplProgramId() {
  if (process.env.GLAM_STAGING) {
    return new PublicKey("gstgs9nJgX8PmRHWAAEP9H7xT3ZkaPWSGPYbj3mXdTa");
  }
  return new PublicKey("G1NTsQ36mjPe89HtPYqxKsjY5HmYsDR6CbD2gd2U2pta");
}

export function getExtDriftProgramId() {
  if (process.env.GLAM_STAGING) {
    return new PublicKey("gstgdpMFXKobURsFtStdaMLRSuwdmDUsrndov7kyu9h");
  }
  return new PublicKey("G1NTdrBmBpW43msRQmsf7qXSw3MFBNaqJcAkGiRmRq2F");
}

export function getExtKaminoProgramId() {
  if (process.env.GLAM_STAGING) {
    return new PublicKey("gstgKa2Gq9wf5hM3DFWx1TvUrGYzDYszyFGq3XBY9Uq");
  }
  return new PublicKey("G1NTkDEUR3pkEqGCKZtmtmVzCUEdYa86pezHkwYbLyde");
}

export function getExtStakePoolProgramId() {
  if (process.env.GLAM_STAGING) {
    return new PublicKey("gstgS4dNeT3BTEQa1aaTS2b8CsAUz1SmwQDGosHSPsw");
  }
  return new PublicKey("G1NTstCVkEhGVQPnPe6r7yEyRTvnp3ta63AFkEKxqg25");
}

// TODO: Update pubkey after ext_cctp staging program is deployed
export function getExtCctpProgramId() {
  if (process.env.GLAM_STAGING) {
    return new PublicKey(ExtCctpIdlJson.address);
  }
  return new PublicKey(ExtCctpIdlJson.address);
}

export function getGlamProtocolProgram(
  provider: Provider,
): GlamProtocolProgram {
  const idl = { ...GlamProtocolIdlJson };
  idl.address = getGlamProtocolProgramId().toBase58();
  return new Program<GlamProtocol>(idl, provider);
}

export function getGlamMintProgram(provider: Provider): GlamMintProgram {
  const idl = { ...GlamMintIdlJson };
  idl.address = getGlamMintProgramId().toBase58();
  return new Program<GlamMint>(idl, provider);
}

export function getGlamConfigProgram(provider: Provider): GlamConfigProgram {
  return new Program<GlamConfig>(GlamConfigIdlJson, provider);
}

export function getExtSplProgram(provider: Provider): ExtSplProgram {
  const idl = { ...ExtSplIdlJson };
  idl.address = getExtSplProgramId().toBase58();
  return new Program<ExtSpl>(idl, provider);
}

export function getExtDriftProgram(provider: Provider): ExtDriftProgram {
  const idl = { ...ExtDriftIdlJson };
  idl.address = getExtDriftProgramId().toBase58();
  return new Program<ExtDrift>(idl, provider);
}

export function getExtKaminoProgram(provider: Provider): ExtKaminoProgram {
  const idl = { ...ExtKaminoIdlJson };
  idl.address = getExtKaminoProgramId().toBase58();
  return new Program<ExtKamino>(idl, provider);
}

export function getExtMarinadeProgram(provider: Provider): ExtMarinadeProgram {
  return new Program<ExtMarinade>(ExtMarinadeIdlJson, provider);
}

export function getExtStakePoolProgram(
  provider: Provider,
): ExtStakePoolProgram {
  const idl = { ...ExtStakePoolIdlJson };
  idl.address = getExtStakePoolProgramId().toBase58();
  return new Program<ExtStakePool>(idl, provider);
}

export function getExtCctpProgram(provider: Provider): ExtCctpProgram {
  return new Program<ExtCctp>(ExtCctpIdlJson, provider);
}
