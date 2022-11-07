import { DAppClient } from "@airgap/beacon-sdk";
import { WalletInfo } from "../contexts/wallet";

export default async function connectWallet(walletInfo: WalletInfo) {
	const dAppClient = new DAppClient({ name: "Beacon Docs" });

	try {
		console.log("Requesting permissions...");
		const permissions = await dAppClient.requestPermissions();
		walletInfo.setAddress(permissions.address)
		console.log("Got permissions:", permissions.address);
	} catch (error) {
		console.log("Got error:", error);
	} finally {
		walletInfo.setClient(dAppClient);

	}
}
