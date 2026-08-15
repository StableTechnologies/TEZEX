import type { NetworkInfo } from "../contexts/network";

export const SNET_RPC_URL = "https://rpc.snet.teztnets.com";
export const SNET_FAUCET_URL = "https://faucet.snet.teztnets.com";
export const SNET_CHAIN_ID = "NetXVasgoZmPMLe";

export interface SnetNetwork {
  key: "snet";
  name: "Snet";
  rpcUrl: string;
  faucetUrl: string;
  chainId: string;
  activatedOn: string;
  info: NetworkInfo;
}

const normalizeEndpoint = (endpoint: string) => endpoint.replace(/\/+$/, "");

export const SNET_NETWORK: SnetNetwork = {
  key: "snet",
  name: "Snet",
  rpcUrl: SNET_RPC_URL,
  faucetUrl: SNET_FAUCET_URL,
  chainId: SNET_CHAIN_ID,
  activatedOn: "2026-08-14",
  info: {
    tezosServer: SNET_RPC_URL,
    rpcFallbacks: [],
    chainId: SNET_CHAIN_ID,
    pools: [],
    assets: [],
  },
};

export const resolveSnet = async (): Promise<SnetNetwork> => SNET_NETWORK;

export const isSnetAccount = (
  account: { network?: { type?: string; rpcUrl?: string } } | null | undefined,
  network: SnetNetwork
) =>
  account?.network?.type === "custom" &&
  normalizeEndpoint(account.network.rpcUrl ?? "") ===
    normalizeEndpoint(network.rpcUrl);
