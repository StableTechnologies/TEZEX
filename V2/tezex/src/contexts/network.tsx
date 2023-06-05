import { createContext } from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import mainnet from "../config/network/mainnet.json";
import { Asset, Errors, LiquidityBakingStorageXTZ } from "../types/general";
import { getLbContractStorage } from "../functions/liquidityBaking";

import { TezosToolkit } from "@taquito/taquito";
export interface Address {
  name: string;
  address: string;
}
export type Assets = Asset[];

export interface NetworkInfo {
  tezosServer: string;
  dex: {
    name: string;
    address: string;
  };
  assets: Assets;
}

export type NetworkMap = {
  [network: string]: NetworkInfo;
};
export interface INetwork {
  network: NetworkType;
  info: NetworkInfo;
  getAsset: (name: string) => Asset;
  getDexStorage: () => Promise<LiquidityBakingStorageXTZ>;
}

export const networks: NetworkMap = {
  [NetworkType.MAINNET as string]: mainnet as NetworkInfo,
};

async function getDexStorage(): Promise<LiquidityBakingStorageXTZ> {
  const dexAddress: string = (mainnet as NetworkInfo).dex.address;
  const toolkit = new TezosToolkit((mainnet as NetworkInfo).tezosServer);

  return await getLbContractStorage(toolkit, dexAddress).catch((e) => {
    console.log("\n", "Error while querying storage : ", e, "\n");
    throw Errors.LB_CONTRACT_STORAGE;
  });
}
function getAsset(name: string): Asset {
  const asset = mainnet.assets.find((address) => address.name === name);
  if (asset) {
    return asset as Asset;
  } else throw Error(name + " not found in config");
}

export const networkDefaults: INetwork = {
  network: NetworkType.MAINNET,
  info: mainnet as NetworkInfo,
  getAsset,
  getDexStorage,
};

export const NetworkContext = createContext<INetwork>(networkDefaults);
