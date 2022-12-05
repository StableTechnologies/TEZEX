import { DAppClient } from "@airgap/beacon-sdk";
import { WalletInfo } from "../contexts/wallet";
import { NetworkInfo } from "../contexts/network";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";
import { NetworkType } from "@airgap/beacon-sdk";
import { useNetwork } from "../hooks/network";

import { TokenKind } from "../types/general";

export function mutezToTez(amount: BigNumber) {
	return amount.dividedBy(1000000);
}
export async function getBalance(
	walletInfo: WalletInfo,
	asset: TokenKind,
	mantissa: boolean
) {
	if (walletInfo.toolkit && walletInfo.address) {
		switch (asset) {
			case TokenKind.XTZ:
				const amount =
					await walletInfo.toolkit.tz.getBalance(
						walletInfo.address
					);
				if (!mantissa) {
					return mutezToTez(amount);
				} else {
					return amount;
				}
			case TokenKind.TzBTC:
				return new BigNumber(0); //todo
		}
	} else return new BigNumber(0);
}

export async function hasSufficientBalance(
	minimumBalance: BigNumber,
	walletInfo: WalletInfo,
	asset: TokenKind,
	mantissa: boolean = false
): Promise<boolean> {
	const balance = await getBalance(walletInfo, asset, mantissa);
	return minimumBalance.isLessThanOrEqualTo(balance);
}

export default async function connectWallet(
	walletInfo: WalletInfo,
	network: NetworkInfo
) {
	const beaconWallet = new BeaconWallet({
		name: "Tezex",
		preferredNetwork: network.network,
	});

	const tezos = new TezosToolkit(network.tezosServer);
	var err = false;
	try {
		await beaconWallet.requestPermissions({
			network: { type: network.network },
		});
		const activeAccount =
			await beaconWallet.client.getActiveAccount();

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
