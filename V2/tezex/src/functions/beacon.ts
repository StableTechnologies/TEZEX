import type { WalletInfo } from "../contexts/wallet";
import type { INetwork } from "../contexts/network";
import { TezosToolkit } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

import { Asset, Balance, TokenType } from "../types/general";
import { balanceBuilder, getBalanceFromTzKT } from "./util";
import {
  AccountInfo,
  BeaconEvent,
  DAppClient,
  NetworkType,
} from "@airgap/beacon-dapp";

async function getFa12BalanceFromStorage(
  toolkit: TezosToolkit,
  tokenAddress: string,
  owner: string
): Promise<BigNumber> {
  const contract = await toolkit.contract.at(tokenAddress);
  const storage: {
    tokens?: { get: (k: string) => Promise<unknown> };
    balances?: { get: (k: string) => Promise<unknown> };
    ledger?: { get: (k: string) => Promise<unknown> };
  } = await contract.storage();

  const ledger = storage.tokens ?? storage.balances ?? storage.ledger;
  if (!ledger || typeof ledger.get !== "function") {
    throw new Error(
      `FA1.2 token ${tokenAddress} has no tokens/balances/ledger bigmap`
    );
  }

  const entry = await ledger.get(owner);
  if (entry == null) {
    return new BigNumber(0);
  }

  if (
    typeof entry === "object" &&
    entry !== null &&
    "balance" in entry &&
    (entry as { balance: unknown }).balance != null
  ) {
    return new BigNumber(
      (entry as { balance: { toString(): string } }).balance.toString()
    );
  }

  return new BigNumber((entry as { toString(): string }).toString());
}

export async function getBalance(
  toolkit: TezosToolkit,
  network: NetworkType,
  address: string,
  asset: Asset
): Promise<Balance> {
  // TezLink Previewnet/Shadownet often breaks run_view and FA2 bigmap key
  // encoding. Prefer views, then storage bigmap, then TzKT.
  const getBalance = async () => {
    try {
      switch (asset.type) {
        case TokenType.XTZ:
          return await toolkit.tz.getBalance(address);
        case TokenType.FA12: {
          try {
            const contract = await toolkit.contract.at(asset.address);
            return await contract.views.getBalance(address).read();
          } catch (viewError) {
            console.warn(
              `[getBalance] FA1.2 view failed for ${asset.name}, trying storage:`,
              viewError
            );
            return await getFa12BalanceFromStorage(
              toolkit,
              asset.address,
              address
            );
          }
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
