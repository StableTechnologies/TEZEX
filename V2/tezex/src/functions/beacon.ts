import type { WalletInfo } from "../contexts/wallet";
import type { INetwork } from "../contexts/network";
import { TezosToolkit } from "@taquito/taquito";

import { Asset, Balance, TokenType } from "../types/general";
import { balanceBuilder, getBalanceFromTzKT } from "./util";
import {
  AccountInfo,
  BeaconEvent,
  DAppClient,
  NetworkType,
} from "@airgap/beacon-dapp";

export async function getBalance(
  toolkit: TezosToolkit,
  network: NetworkType,
  address: string,
  asset: Asset
): Promise<Balance> {
  // NOTE: For now some of the RPC operations that we use fail on TezLink Shadownet
  // like getting a value from bigmap. So we handle it by using TzKT API to get the balance.
  // In future, when TezLink Shadownet supports all RPC operations, we can remove this workaround.
  // We also need to pass the network type to this function to get the correct TzKT API URL.
  const getBalance = async () => {
    try {
      switch (asset.type) {
        case TokenType.XTZ:
          return await toolkit.tz.getBalance(address);
        case TokenType.FA12: {
          const contract = await toolkit.contract.at(asset.address);
          return await contract.views.getBalance(address).read();
        }
        case TokenType.FA2: {
          const contract = await toolkit.contract.at(asset.address);
          const result = await contract.views
            .balance_of([{ owner: address, token_id: asset.tokenId ?? 0 }])
            .read();
          return result[0].balance;
        }
      }
    } catch (e) {
      console.warn(`[getBalance] outer catch for ${asset.name}:`, e);
      return await getBalanceFromTzKT(network, address, asset);
    }
  };

  const balance = await getBalance();
  return balanceBuilder(balance, asset, true);
}

/**
 * Returns a DAppClient configured for the given network.
 * For custom networks (e.g. Previewnet), uses the rpcUrl from network info.
 */
export function createDAppClient(network: INetwork): DAppClient {
  if (network.network === NetworkType.CUSTOM) {
    return createCustomDAppClient({
      rpcUrl: network.info.tezosServer,
      name: "Previewnet",
    });
  }
  return new DAppClient({
    name: "Tezex",
    network: { type: network.network },
    preferredNetwork: network.network,
  });
}

export interface CustomDAppNetwork {
  rpcUrl: string;
  name: string;
}

export async function subscribeToActiveAccount(
  client: DAppClient,
  onChange: (account: AccountInfo | undefined) => void
): Promise<void> {
  await client.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, onChange);
}

export async function disposeDAppClient(client: DAppClient): Promise<void> {
  try {
    await client.clearActiveAccount();
  } finally {
    await client.destroy();
  }
}

export function createCustomDAppClient(
  customNetwork: CustomDAppNetwork
): DAppClient {
  return new DAppClient({
    name: "Tezex",
    network: {
      type: NetworkType.CUSTOM,
      rpcUrl: customNetwork.rpcUrl,
      name: customNetwork.name,
    },
    preferredNetwork: NetworkType.CUSTOM,
  });
}

const connectWithClient = async (
  walletInfo: WalletInfo,
  dAppClient: DAppClient
) => {
  let err = false;
  try {
    await subscribeToActiveAccount(dAppClient, (account) => {
      const accepted = walletInfo.syncActiveAccount(dAppClient, account);
      if (account && !accepted) {
        void disposeDAppClient(dAppClient).catch((cleanupError) =>
          console.warn(
            "Could not clean up the rejected Beacon session:",
            cleanupError
          )
        );
      }
    });
    await dAppClient.requestPermissions();
    const activeAccount = await dAppClient.getActiveAccount();
    if (!walletInfo.syncActiveAccount(dAppClient, activeAccount)) {
      throw new Error("Could not connect to the configured network");
    }
  } catch (error) {
    console.log("\n", "Error encountered in connectWallet : ", error, "\n");
    err = true;
  } finally {
    if (err) {
      walletInfo.syncActiveAccount(dAppClient, undefined);
      try {
        await disposeDAppClient(dAppClient);
      } catch (cleanupError) {
        console.warn(
          "Could not clean up the rejected Beacon session:",
          cleanupError
        );
      }
    }
  }
};

export async function connectWalletToCustomNetwork(
  walletInfo: WalletInfo,
  customNetwork: CustomDAppNetwork
) {
  if (walletInfo.client) {
    try {
      await walletInfo.client.clearActiveAccount();
      await walletInfo.client.destroy();
    } catch (error) {
      console.warn("Unable to clear the previous wallet network:", error);
    }
  }

  await connectWithClient(walletInfo, createCustomDAppClient(customNetwork));
}

export default async function connectWallet(
  walletInfo: WalletInfo,
  network: INetwork
) {
  await connectWithClient(walletInfo, createDAppClient(network));
}
