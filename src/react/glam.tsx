"use client";

import { AnchorProvider, BN } from "@coral-xyz/anchor";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  AnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useQuery } from "@tanstack/react-query";
import { atomWithStorage } from "jotai/utils";

import type { DelegateAcl, StateModel } from "../models";
import { GlamClient } from "../client";
import { useAtomValue, useSetAtom } from "jotai/react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { WSOL } from "../constants";
import { DriftMarketConfigs, GlamDriftUser } from "../client/drift";
import { TokenAccount } from "../client/base";
import { useCluster } from "./cluster-provider";

declare global {
  interface Window {
    glam: GlamClient;
    PublicKey: any;
    BN: any;
  }
}

export interface JupTokenListItem {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  tags: string[];
}

export interface TokenPrice {
  mint: string;
  price: number; // USD
}

interface GlamProviderContext {
  glamClient: GlamClient;
  vault: Vault;
  activeGlamState?: GlamStateCache;
  glamStatesList: GlamStateCache[];
  delegateAcls: DelegateAcl[];
  allGlamStates: StateModel[];
  userWallet: UserWallet;
  prices: TokenPrice[];
  jupTokenList?: JupTokenListItem[];
  driftMarketConfigs: DriftMarketConfigs;
  driftUser: GlamDriftUser;
  setActiveGlamState: (f: GlamStateCache) => void;
  refresh: () => Promise<void>;
}

interface UserWallet {
  queryKey: string[];
  pubkey?: PublicKey; // if pubkey is null, wallet is not connected
  balanceLamports: number;
  uiAmount: number;
  tokenAccounts: TokenAccount[];
}

export interface Vault {
  pubkey: PublicKey;
  balanceLamports: number; // TODO: this should be a BN or string, it works until ~9M SOL
  uiAmount: number;
  tokenAccounts: TokenAccount[];
}

interface GlamStateCache {
  address: string;
  pubkey: PublicKey;
  owner: PublicKey;
  sparkleKey: string;
  name: string;
  product: "Mint" | "Vault" | "Fund";
}

const GlamContext = createContext<GlamProviderContext>(
  {} as GlamProviderContext,
);

const activeGlamStateAtom = atomWithStorage<GlamStateCache>(
  "active-glam-state",
  {} as GlamStateCache,
);
const glamStatesListAtom = atomWithStorage<GlamStateCache[]>(
  "glam-states-list",
  [] as GlamStateCache[],
);

// In order to properly deser states, we need to
// convert string -> pubkey (and maybe more in future)
const deserializeGlamStateCache = (s: any) => {
  if (!s) {
    return undefined;
  }
  if (typeof s.pubkey === "string") {
    s.address = s.pubkey;
    s.pubkey = new PublicKey(s.pubkey);
  }
  if (typeof s.owner === "string") {
    s.owner = new PublicKey(s.owner);
  }
  return s as GlamStateCache;
};

const toStateCache = (s: StateModel) => {
  return {
    pubkey: s.id,
    owner: s.owner?.pubkey || new PublicKey(0),
    sparkleKey: s.sparkleKey,
    address: s.idStr,
    name: s.name,
    product: s.productType,
  } as GlamStateCache;
};

const fetchBalances = async (glamClient: GlamClient, owner: PublicKey) => {
  const balanceLamports =
    await glamClient.provider.connection.getBalance(owner);
  const tokenAccounts = await glamClient.getTokenAccountsByOwner(owner);
  const uiAmount = balanceLamports / LAMPORTS_PER_SOL;

  return {
    balanceLamports,
    tokenAccounts,
    uiAmount,
  };
};

export function GlamProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const setActiveGlamState = useSetAtom(activeGlamStateAtom);
  const setGlamStatesList = useSetAtom(glamStatesListAtom);

  const [delegateAcls, setDelegateAcls] = useState([] as DelegateAcl[]);
  const [vault, setVault] = useState({} as Vault);
  const [userWallet, setUserWallet] = useState({} as UserWallet);
  const wallet = useWallet();
  const { connection } = useConnection();
  const { cluster } = useCluster();

  const glamClient = useMemo(() => {
    const glamClient = new GlamClient({
      provider: new AnchorProvider(connection, wallet as AnchorWallet, {
        commitment: "confirmed",
      }),
      cluster: cluster.network,
    });
    if (typeof window !== "undefined") {
      window.glam = glamClient;
      window.PublicKey = PublicKey;
      window.BN = BN;
    }
    return glamClient;
  }, [connection, wallet, cluster]);

  const [allGlamStates, setAllGlamStates] = useState([] as StateModel[]);
  const [jupTokenList, setJupTokenList] = useState([] as JupTokenListItem[]);
  const [tokenPrices, setTokenPrices] = useState([] as TokenPrice[]);
  const [driftMarketConfigs, setDriftMarketConfigs] = useState(
    {} as DriftMarketConfigs,
  );
  const [driftUser, setDriftUser] = useState({} as GlamDriftUser);

  const activeGlamState = deserializeGlamStateCache(
    useAtomValue(activeGlamStateAtom),
  ) as GlamStateCache;

  //
  // Fetch all glam states
  //
  const refreshVaultHoldings = async () => {
    if (activeGlamState?.pubkey && wallet?.publicKey) {
      console.log(
        "fetching vault data for active glam state:",
        activeGlamState.address,
      );
      const vault = glamClient.getVaultPda(activeGlamState.pubkey);
      const balances = await fetchBalances(glamClient, vault);
      setVault({
        ...balances,
        pubkey: vault,
      } as Vault);
    }
  };

  const { data: glamStateModels } = useQuery({
    queryKey: ["/all-glam-states", activeGlamState?.pubkey, cluster.network],
    queryFn: () => glamClient.fetchGlamStates(),
  });
  useEffect(() => {
    if (!glamStateModels) return;

    if (process.env.NODE_ENV === "development") {
      console.log(`[${cluster.network}] all glam states:`, glamStateModels);
    }

    setAllGlamStates(glamStateModels);

    // Find a list of glam states that the wallet has access to
    const glamStatesList = [] as GlamStateCache[];
    glamStateModels.forEach((s: StateModel) => {
      if (wallet?.publicKey?.equals(s.owner!.pubkey!)) {
        const stateCache = toStateCache(s);
        glamStatesList.push(stateCache);
      } else {
        (s.delegateAcls || []).forEach((acl) => {
          if (wallet?.publicKey?.equals(acl.pubkey)) {
            glamStatesList.push(toStateCache(s));
          }
        });
      }
    });
    setGlamStatesList(glamStatesList);

    if (glamStatesList.length > 0) {
      if (
        !activeGlamState ||
        !glamStatesList.find(
          (state) =>
            state.pubkey &&
            activeGlamState.pubkey &&
            state.pubkey.equals(activeGlamState.pubkey),
        )
      ) {
        setActiveGlamState(glamStatesList[0]);
      }
    } else {
      setActiveGlamState({} as GlamStateCache);
    }

    refreshVaultHoldings();
  }, [glamStateModels, wallet, cluster]);

  const refreshDelegateAcls = async () => {
    if (activeGlamState?.pubkey) {
      const glamState = await glamClient.fetchState(activeGlamState?.pubkey);
      console.log(
        `${activeGlamState.address} delegate acls:`,
        glamState.delegateAcls,
      );
      setDelegateAcls(glamState.delegateAcls || []);
    }
  };

  useEffect(() => {
    refreshDelegateAcls();
  }, [activeGlamState]);

  //
  // Fetch token prices https://station.jup.ag/docs/apis/price-api-v2
  //
  const { data: jupTokenPricesData } = useQuery({
    queryKey: ["/jup-token-prices", vault?.pubkey],
    enabled: cluster.network === "mainnet-beta",
    refetchInterval: 30_000,
    queryFn: () => {
      const tokenMints = new Set([] as string[]);

      tokenMints.add(WSOL.toBase58()); // Always add wSOL feed so that we can price SOL

      // Token accounts owned by the vault
      (vault.tokenAccounts || []).forEach((ta: TokenAccount) => {
        tokenMints.add(ta.mint.toBase58());
      });

      // Drift spot positions
      (driftUser.spotPositions || []).forEach((position) => {
        const marketConfig = driftMarketConfigs.spot.find(
          (m) => position.marketIndex === m.marketIndex,
        );
        if (marketConfig) {
          tokenMints.add(marketConfig.mint);
        }
      });

      const tokens = Array.from(tokenMints);
      return glamClient.jupiterSwap.fetchTokenPrices(tokens);
    },
  });
  useEffect(() => {
    if (jupTokenPricesData) {
      const prices = Object.values(jupTokenPricesData.data).map(
        (p: any) =>
          ({
            mint: p?.id,
            price: Number(p?.price),
          }) as TokenPrice,
      );

      setTokenPrices(prices.filter((p) => !!p.mint));
    }
  }, [jupTokenPricesData]);

  //
  // Balance and token accounts of the connected wallet
  //
  const walletBalancesQueryKey = ["balances", wallet?.publicKey];
  const { data: walletBalances, refetch: refetchWalletBalances } = useQuery({
    queryKey: walletBalancesQueryKey,
    enabled: !!wallet?.publicKey,
    queryFn: () => fetchBalances(glamClient, wallet?.publicKey!),
  });
  useEffect(() => {
    setUserWallet({
      queryKey: walletBalancesQueryKey,
      pubkey: wallet.publicKey,
      ...walletBalances,
    } as UserWallet);
  }, [walletBalances, wallet]);

  //
  // Fetch token list from jupiter api
  //
  const { data: tokenList } = useQuery({
    queryKey: ["jupiter-tokens-list"],
    queryFn: async () => {
      const response = await fetch(
        "https://tokens.jup.ag/tokens?tags=verified",
      );
      const data = await response.json();
      const tokenList = data?.map((t: any) => ({
        address: t.address,
        name: t.name,
        symbol: t.symbol,
        decimals: t.decimals,
        logoURI: t.logoURI,
        tags: t.tags,
      }));
      return tokenList;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  useEffect(() => setJupTokenList(tokenList), [tokenList]);

  //
  // Fetch drift market configs
  //
  const { data: marketConfigs } = useQuery({
    queryKey: ["drift-market-configs"],
    enabled: cluster.network === "mainnet-beta",
    queryFn: () => glamClient.drift.fetchMarketConfigs(),
    staleTime: 1000 * 60 * 60, // 1 hour
  });
  useEffect(() => {
    if (marketConfigs) {
      setDriftMarketConfigs(marketConfigs);
    }
  }, [marketConfigs]);

  //
  // Fetch drift user
  //
  const {
    data: driftUserData,
    error: driftUserError,
    refetch: refetchDriftUser,
  } = useQuery({
    queryKey: ["/drift-user", activeGlamState?.pubkey],
    enabled: !!activeGlamState,
    refetchInterval: 30 * 1000,
    queryFn: () => glamClient.drift.fetchGlamDriftUser(activeGlamState?.pubkey),
  });
  useEffect(() => {
    if (!driftUserError && driftUserData) {
      setDriftUser(driftUserData);
    } else {
      setDriftUser({} as GlamDriftUser);
    }
  }, [driftUserData, driftUserError]);

  const value: GlamProviderContext = {
    glamClient,
    vault,
    activeGlamState,
    glamStatesList: useAtomValue(glamStatesListAtom),
    delegateAcls,
    allGlamStates,
    userWallet,
    jupTokenList,
    prices: tokenPrices,
    setActiveGlamState,
    driftMarketConfigs,
    driftUser,
    refresh: async () => {
      refreshVaultHoldings();
      refreshDelegateAcls();
      refetchDriftUser();
      refetchWalletBalances();
    },
  };

  return <GlamContext.Provider value={value}>{children}</GlamContext.Provider>;
}

export const useGlam = () => useContext(GlamContext);
