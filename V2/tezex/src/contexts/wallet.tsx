import { createContext, useState } from "react";

export interface WalletInfo {
	client: any
	setClient: any
}
export const WalletContext = createContext<WalletInfo | null>(null);


