import { DAppClient } from "@airgap/beacon-sdk";

export default async function connectWallet(setClient) {
	const dAppClient = new DAppClient({ name: "Beacon Docs" });

	try {
		console.log("Requesting permissions...");
		const permissions = await dAppClient.requestPermissions();
		console.log("Got permissions:", permissions.address);
	} catch (error) {
		console.log("Got error:", error);
	} finally {
		setClient(dAppClient);

	}
}
