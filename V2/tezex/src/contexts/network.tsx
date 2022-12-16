import { createContext } from "react";
import { NetworkType } from "@airgap/beacon-sdk";

export interface Addresses {
	sirs: { address: string };
	tzbtc: { address: string; dex: { sirius: string } };
}
export interface NetworkInfo {
	network: NetworkType;
	tezosServer: string;
	tezosServerForTaquito: string;
	apiKey: string;
	addresses: Addresses;
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
	tezosServer: "https://mainnet.api.tez.ie",
	tezosServerForTaquito: "",
	apiKey: "ab682065-864a-4f11-bc77-0ef4e9493fa1",
	addresses: {
		sirs: {
			address: "KT1AafHA1C1vk959wvHWBispY9Y2f3fxBUUo",
		},
		tzbtc: {
			address: "KT1PWx2mnDueood7fEmfbBDKx1D9BAnnXitn",
			dex: { sirius: "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5" },
		},
	},
};

export const networks: NetworkMap = {
	[NetworkType.MAINNET as string]: mainnet,
};

export const networkDefaults: INetwork = {
	selectedNetwork: NetworkType.MAINNET,
	networks,
};

export const NetworkContext = createContext<INetwork>(networkDefaults);
