import { createContext } from "react";
import { NetworkType } from "@airgap/beacon-sdk";
import mainnet from "../config/network/mainnet.json";

export interface Address {
  name: string;
  address: string;
}
export type Addresses = Address[];

export interface NetworkInfo {
  tezosServer: string;
  addresses: Addresses;
}

export type NetworkMap = {
  [network: string]: NetworkInfo;
};
export interface INetwork {
  network: NetworkType;
  info: NetworkInfo;
  getAddress: (name: string) => Address;
}

export const networks: NetworkMap = {
  [NetworkType.MAINNET as string]: mainnet,
};

function getAddress(name: string): Address {
  const address = mainnet.addresses.find((address) => address.name === name);
  if (address) {
    return address as Address;
  } else throw Error(name + " not found in config");
}

export const networkDefaults: INetwork = {
  network: NetworkType.MAINNET,
  info: mainnet,
  getAddress,
};

export const NetworkContext = createContext<INetwork>(networkDefaults);
