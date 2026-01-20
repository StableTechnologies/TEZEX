import { WalletInfo } from "../contexts/wallet";
import { INetwork } from "../contexts/network";
import { TezosToolkit } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

import { Token, Asset, Balance } from "../types/general";
import { balanceBuilder } from "./util";
import { DAppClient } from "@airgap/beacon-dapp";

export async function getBalance(
  toolkit: TezosToolkit,
  address: string,
  asset: Asset
): Promise<Balance> {
  const getBalance = async () => {
    if (asset.name === Token.XTZ) {
      return await toolkit.tz.getBalance(address);
    } else {
      const contract = await toolkit.contract.at(asset.address);
      return await contract.views.getBalance(address).read();
    }
  };

  const balance = await getBalance();
  return balanceBuilder(balance, asset, true);
}

export async function hasSufficientBalance(
  minimumBalance: BigNumber,
  toolkit: TezosToolkit,
  address: string,
  asset: Asset,
  mantissa = false
): Promise<boolean> {
  const balance = await getBalance(toolkit, address, asset);
  if (!mantissa) {
    return minimumBalance.isLessThanOrEqualTo(balance.mantissa);
  } else {
    return minimumBalance.isLessThanOrEqualTo(balance.decimal);
  }
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
