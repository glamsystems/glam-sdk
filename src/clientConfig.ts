import { Provider, Wallet } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

export enum ClusterNetwork {
  Mainnet = "mainnet-beta",
  Testnet = "testnet",
  Devnet = "devnet",
  Custom = "custom",
}
export type GlamClientConfig = {
  provider?: Provider;
  wallet?: Wallet;
  cluster?: ClusterNetwork;
  statePda?: PublicKey;
};
