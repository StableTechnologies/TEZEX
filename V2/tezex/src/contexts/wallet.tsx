import { createContext, useState } from "react";

export interface WalletInfo {
	client: any,
	setClient: any,
	address: any,
	setAddress: any,
	disconnect: any
}
 
const emptyInfo = () => {
	return {
		client: null,
		setClient: (any) => {},
		address: null,
		setAddress: (any) => {},
		disconnect: (any) => {},
	}
}
export const WalletContext = createContext<WalletInfo>(emptyInfo());


