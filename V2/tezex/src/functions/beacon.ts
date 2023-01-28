import { WalletInfo } from "../contexts/wallet";
import { NetworkInfo } from "../contexts/network";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit, MichelCodecPacker } from "@taquito/taquito";
import { BigNumber } from "bignumber.js";

import { DAppClient } from "@airgap/beacon-sdk";
import { TokenKind,Asset, Balance  } from "../types/general";
import { tokenMantissaToDecimal } from "./scaling";
export function mutezToTez(amount: BigNumber) {
	return amount.dividedBy(1000000);
}
export async function getBalance(
	toolkit: TezosToolkit,
	address: string,
	netInfo: NetworkInfo,
	asset: Asset,
): Promise<Balance> {
	const getBalance = async () => {
			switch (asset.name) {
				case TokenKind.XTZ:
					return await toolkit.tz.getBalance(
						address
					);
				case TokenKind.TzBTC:
					const tzBtcContract =
						await toolkit.wallet.at(
							netInfo.addresses.tzbtc
								.address
						);
					return await tzBtcContract.views
						.getBalance(address)
						.read();
				case TokenKind.Sirius:
					const siriusContract =
						await toolkit.wallet.at(
							netInfo.addresses.sirs
								.address
						);
					return await siriusContract.views
						.getBalance(address)
						.read();
			}
	};
	
	const balance = await getBalance();
	return {
		decimal: tokenMantissaToDecimal(balance, asset.name),
		mantissa: balance
	}
}

export async function hasSufficientBalance(
	minimumBalance: BigNumber,
	toolkit: TezosToolkit,
	address: string,
	netInfo: NetworkInfo,
	asset: Asset,
	mantissa: boolean = false
): Promise<boolean> {
	const balance = await getBalance(toolkit,address, netInfo, asset);
	if (!mantissa) {
		return minimumBalance.isLessThanOrEqualTo(balance.mantissa)
	} else {
		return minimumBalance.isLessThanOrEqualTo(balance.decimal)
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
