import { Program, Provider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import type { ClusterNetwork } from "./clientConfig";

import type { GlamProtocol } from "../target/types/glam_protocol";
import type { GlamMint } from "../target/types/glam_mint";

import GlamProtocolIdlJson from "../target/idl/glam_protocol.json";
import GlamMintIdlJson from "../target/idl/glam_mint.json";

const GlamProtocolIdl = GlamProtocolIdlJson as GlamProtocol;
const GlamMintIdl = GlamMintIdlJson as GlamMint;
export {
  GlamProtocol,
  GlamProtocolIdl,
  GlamProtocolIdlJson,
  GlamMint,
  GlamMintIdl,
  GlamMintIdlJson,
};

export type GlamProtocolProgram = Program<GlamProtocol>;
export type GlamMintProgram = Program<GlamMint>;

export function getGlamProtocolProgramId(cluster?: ClusterNetwork) {
  switch (cluster) {
    case "mainnet-beta":
      return new PublicKey("GLAMbTqav9N9witRjswJ8enwp9vv5G8bsSJ2kPJ4rcyc");

    default:
      return new PublicKey("Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc");
  }
}

export function getGlamProtocolProgram(
  cluster: ClusterNetwork,
  provider: Provider,
): GlamProtocolProgram {
  const idl = { ...GlamProtocolIdlJson };
  idl.address = getGlamProtocolProgramId(cluster).toBase58(); // Override program address for the specified cluster
  return new Program(idl as GlamProtocol, provider) as GlamProtocolProgram;
}

export function getGlamMintProgram(provider: Provider): GlamMintProgram {
  return new Program(GlamMintIdl, provider) as GlamMintProgram;
}
