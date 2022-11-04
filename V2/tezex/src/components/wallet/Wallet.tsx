import { FC } from "react";
import React, { useEffect } from "react";
import connectWallet from "../../functions/beacon";

import { WaletConnected } from "../session/WalletConnected";
import { WalletDisconnected } from "../session/WalletDisconnected";
export const Wallet: FC = () => {
	const onSubmit = async () => {
		await connectWallet();
	};
	return (
		<WalletDisconnected>
			{" "}
			<button onClick={onSubmit}>Connect Wallet</button>{" "}
		</WalletDisconnected>
	);
};
