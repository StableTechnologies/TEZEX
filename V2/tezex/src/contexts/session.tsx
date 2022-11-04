import { createContext, useState } from "react";
import { WalletContext, WalletInfo } from './wallet';
export const SessionContext = createContext<any | null>(null);


export function SessionProvider({ children }) {
	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
	return (
		<SessionContext.Provider
			value={{
				isWalletConnected,
				setIsWalletConnected,
			}}
		>
			<WalletContext.Provider value={walletInfo}>
				{children}
			</WalletContext.Provider>
		</SessionContext.Provider>
	);
}
