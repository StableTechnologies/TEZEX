import { createContext } from "react";
import { DAppClient } from "@airgap/beacon-sdk";
import { TezosToolkit } from "@taquito/taquito";

export enum WalletStatus {
	DISCONNECTED = "disconnected",
	READY = "ready",
	BUSY = "busy",
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
	disconnect: () => void;
}

export const WalletContext = createContext<WalletInfo | null>(null);
