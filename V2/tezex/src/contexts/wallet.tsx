import { createContext } from "react";
import { DAppClient } from "@airgap/beacon-sdk";
import { TezosToolkit } from "@taquito/taquito";
import { TokenKind } from "../types/general";
import { NetworkInfo } from "./network";

import { getBalance } from "../functions/beacon";

export enum WalletStatus {
	DISCONNECTED = "disconnected",
	READY = "ready",
	BUSY = "busy",
}

export function isReady(walletStatus: WalletStatus) {
	const ready = (): boolean => {
		return walletStatus === WalletStatus.READY;
	};
	return ready;
}
export function walletUser(
	walletStatus: WalletStatus,
	setWalletStatus: React.Dispatch<React.SetStateAction<WalletStatus>>
) {
	const useWallet = async (op: () => Promise<unknown>) => {
		const setBusy = async () => {
			setWalletStatus(WalletStatus.BUSY);
		};
		const setReady = async () => {
			setWalletStatus(WalletStatus.READY);
		};
		if (walletStatus === WalletStatus.READY) {
			await setBusy();
			await op();
			await setReady();
		}
	};

	return useWallet;
}

export async function viewBalance(
	asset: TokenKind,
	wallet: WalletInfo,
	network: NetworkInfo
): Promise<string> {
	console.log("\n", "balance : ");
	console.log("\n", "wallet : ", wallet, "\n");
	if (wallet) {
		const balance = await getBalance(wallet, network, asset, true);
		console.log("\n", "balance : ", balance, "\n");
		return balance.toString();
	} else return "";
}
export interface WalletInfo {
	client: DAppClient | null;
	setClient: React.Dispatch<React.SetStateAction<DAppClient | null>>;
	toolkit: TezosToolkit | null;
	setToolkit: React.Dispatch<React.SetStateAction<TezosToolkit | null>>;
	address: string | null;
	setAddress: React.Dispatch<React.SetStateAction<string | null>>;
	walletStatus: WalletStatus;
	setWalletStatus: React.Dispatch<React.SetStateAction<WalletStatus>>;
	walletUser: (op: () => Promise<unknown>) => Promise<void>;
	isReady: () => boolean;
	disconnect: () => void;
	viewBalance: (
		asset: TokenKind,
		wallet: WalletInfo,
		network: NetworkInfo
	) => Promise<string>;
}

export const WalletContext = createContext<WalletInfo | null>(null);
