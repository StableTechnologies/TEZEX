import { DAppClient } from "@airgap/beacon-sdk";
import { WalletInfo } from "../contexts/wallet";
import { NetworkInfo } from "../contexts/network";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { NetworkType } from "@airgap/beacon-sdk";
import { useNetwork } from "../hooks/network";

export default async function connectWallet(
	walletInfo: WalletInfo,
	network: NetworkInfo
) {
	const beaconWallet = new BeaconWallet({
		name: "Tezex",
		preferredNetwork: network.network,
	});

	const dAppClient = new DAppClient({ name: "Tezex" });

	var err = false;
	try {
		await beaconWallet.requestPermissions({network: {type: network.network}});
		const activeAccount =
			await beaconWallet.client.getActiveAccount();
		if (!activeAccount) {
			throw new Error("Could not connect");
		} else {
		walletInfo.setAddress(activeAccount.address);
		}
	} catch (error) {
		err = true;
	} finally {
		err
			? walletInfo.setClient(null)
			: walletInfo.setClient(dAppClient);
	}
}
