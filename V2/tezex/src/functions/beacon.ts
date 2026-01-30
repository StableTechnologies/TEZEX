import { WalletInfo } from "../contexts/wallet";
import { INetwork } from "../contexts/network";
import { TezosToolkit } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

import { Token, Asset, Balance } from "../types/general";
import { balanceBuilder, getTzktApiUrl } from "./util";
import { DAppClient, NetworkType } from "@airgap/beacon-dapp";

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
    if (asset.name === Token.XTZ) {
      return await toolkit.tz.getBalance(address);
    } else {
      try {
        const contract = await toolkit.contract.at(asset.address);
        return await contract.views.getBalance(address).read();
      } catch {
        // Fallback to TzKT API
        const api = getTzktApiUrl(network);
        const response = await fetch(
          `${api}/v1/tokens/balances?account=${address}&token.contract=${asset.address}`
        );
        const data = await response.json();
        return data[0]?.balance
          ? new BigNumber(data[0].balance)
          : new BigNumber(0);
      }
    }
  };

  const balance = await getBalance();
  return balanceBuilder(balance, asset, true);
}

export default async function connectWallet(
  walletInfo: WalletInfo,
  network: INetwork
) {
  const dAppClient = new DAppClient({
    name: "Tezex",
    network: { type: network.network },
    preferredNetwork: network.network,
  });

  let err = false;
  try {
    await dAppClient.requestPermissions();
    const activeAccount = await dAppClient.getActiveAccount();
    if (!activeAccount) {
      throw new Error("Could not connect");
    } else {
      walletInfo.setAddress(activeAccount.address);
    }
  } catch (error) {
    console.log("\n", "Error encountered in connectWallet : ", error, "\n");
    err = true;
  } finally {
    if (err) {
      walletInfo.setClient(null);
    } else {
      walletInfo.setClient(dAppClient);
    }
  }
}
