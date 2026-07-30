import { createContext, useCallback, useState } from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import mainnet from "../config/network/mainnet.json";
import shadownet from "../config/network/shadownet.json";
import previewnet from "../config/network/previewnet.json";
import { Asset, Token } from "../types/general";
import { MichelCodecPacker, TezosToolkit } from "@taquito/taquito";
import { IPoolAdapter, PoolConfig } from "../types/pools";
import { PoolRegistry } from "../adapters/poolRegistry";
import { PoolDataCache } from "../utils/poolDataCache";
import { createRpcToolkit } from "../functions/rpcFailover";
import React from "react";
export interface Address {
  name: string;
  address: string;
}
export type Assets = Asset[];

export interface NetworkInfo {
  tezosServer: string;
  rpcFallbacks: string[];
  chainId: string;
  pools: PoolConfig[];
  assets: Assets;
  tradingAvailability?: {
    enabled: boolean;
    title: string;
    message: string;
    statusUrl?: string;
  };
}

export type NetworkMap = {
  [network: string]: NetworkInfo;
};

export interface INetwork {
  network: NetworkType;
  info: NetworkInfo;
  toolkit: TezosToolkit;
  selectedPool: PoolConfig | null;
  setSelectedPool: (pool: PoolConfig) => void;
  getAsset: (name: Token) => Asset;
  getPoolAdapter: (poolId: string) => IPoolAdapter;
  getPoolsByTokenPair: (tokenA: Token, tokenB: Token) => PoolConfig[];
  getAllPools: () => PoolConfig[];
  switchNetwork: (network: NetworkType) => void;
}

export const networks: NetworkMap = {
  [NetworkType.MAINNET as string]: mainnet as NetworkInfo,
  [NetworkType.SHADOWNET as string]: shadownet as NetworkInfo,
  [NetworkType.CUSTOM as string]: previewnet as NetworkInfo,
};

// Initialize PoolRegistry immediately on module load
const initialNetwork = mainnet as NetworkInfo;
PoolRegistry.initializeFromConfig(initialNetwork.pools, initialNetwork.assets);

// Get first pool
const initialPool =
  initialNetwork.pools.length > 0
    ? PoolRegistry.getPoolById(initialNetwork.pools[0].id) || null
    : null;

export const NetworkContext = createContext<INetwork | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [activeNetwork, setActiveNetwork] = useState<NetworkType>(
    NetworkType.MAINNET
  );
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>(
    mainnet as NetworkInfo
  );
  const [toolkit, setToolkit] = useState<TezosToolkit>(
    createRpcToolkit(mainnet as NetworkInfo)
  );
  const [selectedPool, setSelectedPoolState] = useState<PoolConfig | null>(
    initialPool
  );

  const switchNetwork = useCallback((network: NetworkType) => {
    // Get new network info
    const newNetworkInfo = networks[network as string];
    if (!newNetworkInfo) {
      console.error(`Network ${network} not found`);
      return;
    }

    // Clear PoolRegistry
    PoolRegistry.clear();

    // Clear cache
    PoolDataCache.clear();

    // Re-initialize PoolRegistry with new network
    PoolRegistry.initializeFromConfig(
      newNetworkInfo.pools,
      newNetworkInfo.assets
    );

    // Create new toolkit for new network
    const newToolkit = createRpcToolkit(newNetworkInfo);
    // Required, because TezLink Shadownet rpc does not support pack_data yet.
    newToolkit.setPackerProvider(new MichelCodecPacker());

    // Update state
    setActiveNetwork(network);
    setNetworkInfo(newNetworkInfo);
    setToolkit(newToolkit);

    if (newNetworkInfo.pools.length > 0) {
      const firstPool = PoolRegistry.getPoolById(newNetworkInfo.pools[0].id);
      if (firstPool) {
        setSelectedPoolState(firstPool);
      }
    } else {
      setSelectedPoolState(null);
    }
  }, []);

  const setSelectedPool = useCallback((pool: PoolConfig) => {
    setSelectedPoolState(pool);
  }, []);

  const getAsset = useCallback((name: Token): Asset => {
    return PoolRegistry.getAsset(name);
  }, []);

  const getPoolAdapter = useCallback((poolId: string): IPoolAdapter => {
    return PoolRegistry.getAdapter(poolId);
  }, []);

  const getPoolsByTokenPair = useCallback(
    (tokenA: Token, tokenB: Token): PoolConfig[] => {
      return PoolRegistry.getPoolsByTokenPair(tokenA, tokenB);
    },
    []
  );

  const getAllPools = useCallback((): PoolConfig[] => {
    return PoolRegistry.getAllPools();
  }, []);

  const value: INetwork = {
    network: activeNetwork,
    info: networkInfo,
    toolkit,
    selectedPool,
    setSelectedPool,
    getAsset,
    getPoolAdapter,
    getPoolsByTokenPair,
    getAllPools,
    switchNetwork,
  };

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
};
