import { FC } from "react";
import React, { useEffect } from "react";
import connectWallet from "../../functions/wallet";

import { WaletConnected } from "../session/walletConnected";
import { WalletDisconnected } from "../session/walletDisconnected";
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
