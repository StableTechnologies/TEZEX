import { WalletInfo } from "../contexts/wallet";
import { NetworkInfo } from "../contexts/network";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

import { TokenKind } from "../types/general";
import {  tokenMantissaToDecimal } from "./scaling";
export function mutezToTez(amount: BigNumber) {
	return amount.dividedBy(1000000);
}
export async function getBalance(
	walletInfo: WalletInfo,
	netInfo: NetworkInfo,
	asset: TokenKind
) {
	if (walletInfo.toolkit && walletInfo.address) {
		switch (asset) {
			case TokenKind.XTZ:
				return await walletInfo.toolkit.tz.getBalance(
					walletInfo.address
				);
			case TokenKind.TzBTC:
				const tzBtcContract =
					await walletInfo.toolkit.wallet.at(
						netInfo.addresses.tzbtc.address
					);
				return await tzBtcContract.views
					.getBalance(walletInfo.address)
					.read();
			case TokenKind.Sirius:
				const siriusContract =
					await walletInfo.toolkit.wallet.at(
						netInfo.addresses.sirs.address
					);
				return await siriusContract.views
					.getBalance(walletInfo.address)
					.read();
		}
	} else return new BigNumber(0);
}

export async function hasSufficientBalance(
	minimumBalance: BigNumber,
	walletInfo: WalletInfo,
	netInfo: NetworkInfo,
	asset: TokenKind,
	mantissa: boolean = false
): Promise<boolean> {
	const balance = await getBalance(walletInfo, netInfo, asset);
	if (!mantissa) {
		return minimumBalance.isLessThanOrEqualTo(
			tokenMantissaToDecimal(balance, asset)
		);
	} else {
		return minimumBalance.isLessThanOrEqualTo(balance);
	}
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
