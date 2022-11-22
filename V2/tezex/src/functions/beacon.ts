import { DAppClient } from "@airgap/beacon-sdk";
import { WalletInfo } from "../contexts/wallet";
import { NetworkInfo } from "../contexts/network";
import { BeaconWallet } from "@taquito/beacon-wallet";
import { TezosToolkit, MichelCodecPacker  } from "@taquito/taquito";
  

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


  const tezos = new TezosToolkit(network.tezosServer);
	var err = false;
	try {
		await beaconWallet.requestPermissions({network: {type: network.network}});
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
		if(err){
			walletInfo.setClient(null);
	         walletInfo.setToolkit(null);
		} else {

		 walletInfo.setClient(beaconWallet.client);
		 walletInfo.setToolkit(tezos);
		}
	}
}
