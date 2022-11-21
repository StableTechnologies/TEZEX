import { createContext} from "react";
import { DAppClient } from '@airgap/beacon-sdk';
import { TezosToolkit } from "@taquito/taquito";

export interface WalletInfo {
	client: DAppClient | null,
	setClient: React.Dispatch<React.SetStateAction<DAppClient | null>>, 	
	toolkit: TezosToolkit | null,
	setToolkit: React.Dispatch<React.SetStateAction<TezosToolkit | null>>, 	
	address: string | null,
	setAddress: React.Dispatch<React.SetStateAction<string | null>>,
	disconnect: () => void
}
 
export const WalletContext = createContext<WalletInfo | null>(null)


