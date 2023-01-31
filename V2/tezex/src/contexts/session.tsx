import { createContext, useEffect, useState } from "react";
import {
	WalletProvider,
	WalletContext,
	WalletInfo,
	WalletStatus,
	walletUser,
	isReady,
} from "./wallet";
import { NetworkContext, networkDefaults } from "./network";
import { TezosToolkit } from "@taquito/taquito";
import { DAppClient } from "@airgap/beacon-sdk";

import { TokenKind } from "../types/general";
import { getBalance } from "../functions/beacon";
import { NetworkInfo } from "./network";
import { useWallet } from "../hooks/wallet";
import { useNetwork } from "../hooks/network";
export const SessionContext = createContext<SessionInfo>({
	isWalletConnected: false,
});

export interface SessionInfo {
	isWalletConnected: boolean;
}
export interface ISession {
	children:
		| JSX.Element[]
		| JSX.Element
		| React.ReactElement
		| React.ReactElement[]
		| string;
}

export function SessionProvider(props: ISession) {
	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [walletStatus, setWalletStatus] = useState(
		WalletStatus.DISCONNECTED
	);
	const [client, setClient] = useState<DAppClient | null>(null);
	const [toolkit, setToolkit] = useState<TezosToolkit | null>(null);
	const [address, setAddress] = useState<string | null>(null);

	useEffect(() => {
		if (client) {
			setIsWalletConnected(true);
			setWalletStatus(WalletStatus.READY);
		} else {
			setIsWalletConnected(false);
			setWalletStatus(WalletStatus.BUSY);
		}
	}, [client]);

	const disconnect = () => {
		setClient(null);
		setAddress(null);
	};

	const network = useNetwork();
	const wallet = useWallet();

	useEffect(() => {
		const interval = setInterval(() => {
			console.log("This will run every second!");
		}, 5000);
		return () => clearInterval(interval);
	}, []);


	return (
		<SessionContext.Provider
			value={{
				isWalletConnected,
			}}
		>
			<NetworkContext.Provider value={networkDefaults}>
				<WalletProvider>
					{props.children}
				</WalletProvider>
			</NetworkContext.Provider>
		</SessionContext.Provider>
	);
}
