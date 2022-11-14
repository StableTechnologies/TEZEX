import { createContext, FC, useEffect, useState } from "react";
import { WalletContext, WalletInfo } from "./wallet";
export const SessionContext = createContext<any | null>(null);

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
	const [client, setClient] = useState<any | null>(null);
	const [address, setAddress] = useState<any | null>(null);

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
			<WalletContext.Provider value={walletInfo}>
				{props.children}
			</WalletContext.Provider>
		</SessionContext.Provider>
	);
}
