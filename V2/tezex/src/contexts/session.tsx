import {  createContext, useEffect, useState } from "react";
import { WalletContext, WalletInfo } from "./wallet";
import { NetworkContext,  networkDefaults } from "./network";
import { TezosToolkit } from "@taquito/taquito";
import { DAppClient } from '@airgap/beacon-sdk';

export const SessionContext = createContext<SessionInfo>({ isWalletConnected: false});

export interface SessionInfo {
	isWalletConnected: boolean
}
export interface ISession {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string
}

export function SessionProvider(props: ISession) {
	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [client, setClient] = useState<DAppClient | null>(null);
	const [toolkit, setToolkit] = useState<TezosToolkit | null>(null);
	const [address, setAddress] = useState<string | null>(null);

	useEffect(() => {
		client
			? setIsWalletConnected(true)
			: setIsWalletConnected(false);
	}, [client]);

	const disconnect = () => {
		setClient(null);
		setAddress(null);
	};

	const walletInfo: WalletInfo = {
		client,
		setClient,
		toolkit,
		setToolkit,
		address,
		setAddress,
		disconnect,
	};

	return (
		<SessionContext.Provider
			value={{
				isWalletConnected,
			}}
		>
			<NetworkContext.Provider value={networkDefaults}>
			<WalletContext.Provider value={walletInfo}>
				{props.children}
			</WalletContext.Provider>
			</NetworkContext.Provider>
		</SessionContext.Provider>
	);
}
