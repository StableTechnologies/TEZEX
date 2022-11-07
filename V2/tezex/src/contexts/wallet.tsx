import { createContext, useState } from "react";

export interface WalletInfo {
	client: any,
	setClient: any,
	address: any,
	setAddress: any,
	disconnect: any
}
export const WalletContext = createContext<WalletInfo | null>(null);


