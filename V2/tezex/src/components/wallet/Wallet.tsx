import { FC } from "react";
import React, { useEffect } from "react";
import connectWallet from "../../functions/beacon";
import { useWallet} from "../../hooks/wallet";
import { WalletInfo } from "../../context/wallet";
import { WaletConnected } from "../session/WalletConnected";
import { WalletDisconnected } from "../session/WalletDisconnected";

export const Wallet: FC = () => {
	const walletInfo : WalletInfo = useWallet();
	const onSubmit = async () => {
		await connectWallet(walletInfo.setClient);
	};
	return (
		<WalletDisconnected>
			{" "}
			<button onClick={onSubmit}>Connect Wallet</button>{" "}
		</WalletDisconnected>
	);
};
