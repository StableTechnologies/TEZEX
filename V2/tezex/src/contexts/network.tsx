import { createContext, useCallback, useState } from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import mainnet from "../config/network/mainnet.json";
import shadownet from "../config/network/shadownet.json";
import { Asset } from "../types/general";
import { TezosToolkit } from "@taquito/taquito";
import { IPoolAdapter, PoolConfig } from "../types/pools";
import { PoolRegistry } from "../adapters/poolRegistry";
import { PoolDataCache } from "../utils/poolDataCache";
import React from "react";
export interface Address {
  name: string;
  address: string;
}
export type Assets = Asset[];

export interface NetworkInfo {
  tezosServer: string;
  pools: PoolConfig[];
  assets: Assets;
}

export type NetworkMap = {
  [network: string]: NetworkInfo;
};

export interface INetwork {
  network: NetworkType;
  info: NetworkInfo;
  toolkit: TezosToolkit;
  getAsset: (name: string) => Asset;
  getPoolAdapter: (poolId: string) => IPoolAdapter;
  getPoolsByTokenPair: (tokenA: string, tokenB: string) => PoolConfig[];
  getAllPools: () => PoolConfig[];
  switchNetwork: (network: NetworkType) => void;
}

export const networks: NetworkMap = {
  [NetworkType.MAINNET as string]: mainnet as NetworkInfo,
  [NetworkType.SHADOWNET as string]: shadownet as NetworkInfo,
};

PoolRegistry.initializeFromConfig(
  (mainnet as NetworkInfo).pools,
  (mainnet as NetworkInfo).assets
);

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
    new TezosToolkit((mainnet as NetworkInfo).tezosServer)
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
    const newToolkit = new TezosToolkit(newNetworkInfo.tezosServer);

    // Update state
    setActiveNetwork(network);
    setNetworkInfo(newNetworkInfo);
    setToolkit(newToolkit);
  }, []);

  const getAsset = useCallback((name: string): Asset => {
    return PoolRegistry.getAssetByName(name);
  }, []);

  const getPoolAdapter = useCallback((poolId: string): IPoolAdapter => {
    return PoolRegistry.getAdapter(poolId);
  }, []);

  const getPoolsByTokenPair = useCallback(
    (tokenA: string, tokenB: string): PoolConfig[] => {
      return PoolRegistry.getPoolsByTokenPair(tokenA as any, tokenB as any);
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
