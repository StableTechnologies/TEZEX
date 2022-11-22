import { createContext} from "react";
import { NetworkType } from "@airgap/beacon-sdk";

export interface NetworkInfo {
    network: NetworkType, 
    tezosServer: string,
    tezosServerForTaquito: string,
    apiKey: string,
}
 
export const networks = {
    network: NetworkType.MAINNET,
    tezosServer: "https://tezos-prod.cryptonomic-infra.tech:443",
    tezosServerForTaquito: "",
    apiKey: "ab682065-864a-4f11-bc77-0ef4e9493fa1",
}

export const NetworkContext = createContext<NetworkInfo>(networks)


