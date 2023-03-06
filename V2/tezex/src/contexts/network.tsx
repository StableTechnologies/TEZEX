import { createContext } from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import mainnet from "../config/network/mainnet.json";
import { Asset } from "../types/general";

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
}
export const networks: NetworkMap = {
  [NetworkType.MAINNET as string]: mainnet as NetworkInfo,
};

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
};

export const NetworkContext = createContext<INetwork>(networkDefaults);
