import { createContext } from "react";
import { NetworkType } from "@airgap/beacon-sdk";

export interface Addresses {
	tzbtc : { dex : { sirius: string}}
}
export interface NetworkInfo {
	network: NetworkType;
	tezosServer: string;
	tezosServerForTaquito: string;
	apiKey: string;
	addresses: Addresses
}

export type NetworkMap = {
	[network: string]: NetworkInfo;
};
export interface INetwork {
	selectedNetwork: NetworkType;
	networks: NetworkMap;
}

export const mainnet = {
	network: NetworkType.MAINNET,
	tezosServer: "https://tezos-prod.cryptonomic-infra.tech:443",
	tezosServerForTaquito: "",
	apiKey: "ab682065-864a-4f11-bc77-0ef4e9493fa1",
	addresses: {tzbtc : { dex : { sirius: "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5"}}} //TODO
};

export const networks: NetworkMap = {
	[NetworkType.MAINNET as string]: mainnet,
};

export const NetworkContext = createContext<INetwork>({
	selectedNetwork: NetworkType.MAINNET,
	networks,
});
