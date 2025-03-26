import { Program, Provider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import type { ClusterNetwork } from "./clientConfig";
import type { GlamProtocol } from "../target/types/glam_protocol";
import GlamProtocolIdlJson from "../target/idl/glam_protocol.json";

const GlamIdl = GlamProtocolIdlJson as GlamProtocol;
export { GlamProtocol, GlamIdl, GlamProtocolIdlJson};
export type GlamProgram = Program<GlamProtocol>;

export function getGlamProgramId(cluster?: ClusterNetwork) {
  switch (cluster) {
    case "mainnet-beta":
      return new PublicKey("GLAMbTqav9N9witRjswJ8enwp9vv5G8bsSJ2kPJ4rcyc");

    default:
      return new PublicKey("Gco1pcjxCMYjKJjSNJ7mKV7qezeUTE7arXJgy7PAPNRc");
  }
}

export function getGlamProgram(
  cluster: ClusterNetwork,
  provider: Provider,
): GlamProgram {
  switch (cluster) {
    case "mainnet-beta":
      return new Program(GlamIdl, provider) as GlamProgram;

    default:
      const idl = { ...GlamProtocolIdlJson };
      idl.address = getGlamProgramId(cluster).toBase58();
      return new Program(idl as GlamProtocol, provider) as GlamProgram;
  }
}
