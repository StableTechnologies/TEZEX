import { createContext} from "react";
import { DAppClient } from '@airgap/beacon-sdk';

export interface WalletInfo {
	client: DAppClient | null,
	setClient: React.Dispatch<React.SetStateAction<DAppClient | null>>, 	
	address: string | null,
	setAddress: React.Dispatch<React.SetStateAction<string | null>>,
	disconnect: () => void
}
 
export const WalletContext = createContext<WalletInfo | null>(null)


