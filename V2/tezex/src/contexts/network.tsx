import { createContext } from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import mainnet from "../config/network/mainnet.json";
import { Asset } from "../types/general";
import { TezosToolkit } from "@taquito/taquito";
import { IPoolAdapter, PoolConfig } from "../types/pools";
import { PoolRegistry } from "../adapters/poolRegistry";
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
  toolkit: TezosToolkit; // Read-only toolkit used for estimates when no wallet is connected
  getAsset: (name: string) => Asset;
  getPoolAdapter: (poolId: string) => IPoolAdapter;
  getPoolsByTokenPair: (tokenA: string, tokenB: string) => PoolConfig[];
  getAllPools: () => PoolConfig[];
}

export const networks: NetworkMap = {
  [NetworkType.MAINNET as string]: mainnet as NetworkInfo,
};

PoolRegistry.initializeFromConfig(
  (mainnet as NetworkInfo).pools,
  (mainnet as NetworkInfo).assets
);

function getAsset(name: string): Asset {
  return PoolRegistry.getAssetByName(name);
}

function getPoolAdapter(poolId: string): IPoolAdapter {
  return PoolRegistry.getAdapter(poolId);
}

function getPoolsByTokenPair(tokenA: string, tokenB: string): PoolConfig[] {
  return PoolRegistry.getPoolsByTokenPair(tokenA as any, tokenB as any);
}

function getAllPools(): PoolConfig[] {
  return PoolRegistry.getAllPools();
}

const readOnlyToolkit = new TezosToolkit((mainnet as NetworkInfo).tezosServer);

export const networkDefaults: INetwork = {
  network: NetworkType.MAINNET,
  info: mainnet as NetworkInfo,
  toolkit: readOnlyToolkit,
  getAsset,
  getPoolAdapter,
  getPoolsByTokenPair,
  getAllPools,
};

export const NetworkContext = createContext<INetwork>(networkDefaults);
