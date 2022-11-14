import { FC } from "react";
import connectWallet from "../../functions/beacon";
import { useWallet } from "../../hooks/wallet";
import { WalletInfo } from "../../contexts/wallet";
import { WalletConnected } from "../session/WalletConnected";
import { WalletDisconnected } from "../session/WalletDisconnected";

export const Wallet: FC = () => {
	const walletInfo: WalletInfo | null = useWallet();
	const connect = async () => {
		if (walletInfo) { 
			await connectWallet(walletInfo) ;
		}
	};
	const disconnect = async () => {

		if (walletInfo) { 
		walletInfo.disconnect();
		}
	};
	return (
		<>
			<WalletDisconnected>
				<button onClick={connect}>
					Connect Wallet
				</button>
			</WalletDisconnected>
			<WalletConnected>
				<button onClick={disconnect}>
					{(walletInfo) ? walletInfo.address : ''}
				</button>
			</WalletConnected>
		</>
	);
};
