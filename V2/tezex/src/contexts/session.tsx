import { createContext, useState } from "react";

export const SessionContext = createContext();

export function SessionProvider({ children }) {
	const [isWalletConnected, setIsWalletConnected] = useState(false);
	return <SessionContext.Provider 
		value={{
			isWalletConnected,
			setIsWalletConnected
		}}
	>
       {children}
       </SessionContext.Provider>

}
