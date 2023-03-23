import { WalletInfo } from "../contexts/wallet";
import { INetwork } from "../contexts/network";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

import { Token, Asset, Balance } from "../types/general";
import { balanceBuilder } from "./util";
export function mutezToTez(amount: BigNumber) {
  return amount.dividedBy(1000000);
}

export async function getBalance(
  toolkit: TezosToolkit,
  address: string,
  asset: Asset
): Promise<Balance> {
  const getBalance = async () => {
    if (asset.name === Token.XTZ) {
      return await toolkit.tz.getBalance(address);
    } else {
      const contract = await toolkit.wallet.at(asset.address);
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
  const beaconWallet = new BeaconWallet({
    name: "Tezex",
    preferredNetwork: network.network,
  });

  const tezos = new TezosToolkit(network.info.tezosServer);
  let err = false;
  try {
    await beaconWallet.requestPermissions({
      network: { type: network.network },
    });
    const activeAccount = await beaconWallet.client.getActiveAccount();

    tezos.setPackerProvider(new MichelCodecPacker());
    tezos.setWalletProvider(beaconWallet);
    if (!activeAccount) {
      throw new Error("Could not connect");
    } else {
      walletInfo.setAddress(activeAccount.address);
    }

    // signer provider ??
  } catch (error) {
    err = true;
  } finally {
    if (err) {
      walletInfo.setClient(null);
      walletInfo.setToolkit(null);
    } else {
      walletInfo.setClient(beaconWallet.client);
      walletInfo.setToolkit(tezos);
    }
  }
}
