import { createContext, useState } from "react";

export interface WalletInfo {
	client: any
	setClient: any
	address: any
	disconnect: any
}
export const WalletContext = createContext<WalletInfo | null>(null);


