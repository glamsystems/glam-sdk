import { Provider, Wallet } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export enum ClusterNetwork {
  Mainnet = "mainnet-beta",
  Testnet = "testnet",
  Devnet = "devnet",
  Custom = "custom",
}

export namespace ClusterNetwork {
  /**
   * Detects the Solana cluster network from an RPC endpoint URL
   *
   * @param rpcUrl The RPC endpoint URL
   * @returns The detected cluster network
   */
  export function fromUrl(rpcUrl: string): ClusterNetwork {
    if (rpcUrl.includes("devnet")) {
      return ClusterNetwork.Devnet;
    }
    if (rpcUrl.includes("localhost") || rpcUrl.includes("127.0.0.1")) {
      return ClusterNetwork.Custom;
    }
    if (rpcUrl.includes("mainnet")) {
      return ClusterNetwork.Mainnet;
    }
    throw new Error(
      `Cannot infer cluster network from RPC endpoint: ${rpcUrl}`,
    );
  }
}

export type GlamClientConfig = {
  provider?: Provider;
  wallet?: Wallet;
  cluster?: ClusterNetwork;
  statePda?: PublicKey;
};
