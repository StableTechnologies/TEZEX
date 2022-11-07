import { createContext, FC, useEffect, useState } from "react";
import { WalletContext, WalletInfo } from "./wallet";
export const SessionContext = createContext<any | null>(null);

export function SessionProvider({ children }) {
	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [client, setClient] = useState<any | null>(null);

	useEffect(() => {
		client
			? setIsWalletConnected(true)
			: setIsWalletConnected(false);
	}, [client]);

	const disconnect = () => {
		setClient(null)
	}
	const walletInfo: WalletInfo = { client, setClient, disconnect };

	return (
		<SessionContext.Provider
			value={{
				isWalletConnected,
			}}
		>
			<WalletContext.Provider value={walletInfo}>
				{children}
			</WalletContext.Provider>
		</SessionContext.Provider>
	);
}
