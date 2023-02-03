import { useContext } from "react";

import { getAsset } from "../constants";
import { BigNumber } from "bignumber.js";
import { estimateTokensReceivedSwap } from "../functions/estimates";
import { WalletContext, balanceBuilder, WalletInfo } from "../contexts/wallet";

import {
	Transaction,
	TokenKind,
	Asset,
	Balance,
	Id,
	TransactionStatus,
	TransactingComponent,
	Amount,
	AssetOrAssetPair,
	SendOrRecieve,
} from "../types/general";

/*
export function useWalletProcessSwapTransaction(id,sendAsset,recieveAsset,sendAmount?,slippage?) {
    const wallet = useContext(WalletContext);

    return wallet;
}
export function useWalletViewSwap(id,sendAsset,recieveAsset,sendAmount?,slippage?) {
    const wallet = useContext(WalletContext);

    return wallet;
}
export function useWalletUpdateSwap(sendAsset,recieveAsset,sendAmount?,slippage?) {
    const wallet = useContext(WalletContext);

    return wallet;
}
export function useWalletInitializeSwap(sendAsset,recieveAsset,sendAmount?,slippage?) {
    const wallet = useContext(WalletContext);

    return wallet;
}
*/

export interface SwapOps {
	initializeSwap: (
		sendAsset: TokenKind,
		recieveAsset: TokenKind,
		sendAmount?: BigNumber, //TODO
		receiveAmount?: BigNumber, //TODO
		slippage?: number //TODO
	) => Promise<Transaction | undefined>;
	viewTransaction: (id: Id) => Transaction | undefined | null;
	getActiveTransaction: () => Transaction | undefined ;
	updateBalance: (transaction: Transaction) => Promise<boolean>;
}

export function useWalletConnected(): boolean {
	const wallet = useContext(WalletContext);
	if (wallet) {
		return wallet.isWalletConnected;
	} else return false;
}
export function useWalletSwapOps(): SwapOps {
	const wallet = useContext(WalletContext);

	const initializeSwap = async (
		sendAsset: TokenKind,
		recieveAsset: TokenKind,
		sendAmount?: BigNumber, //TODO
		receiveAmount?: BigNumber, //TODO
		slippage?: number //TODO
	): Promise<Transaction | undefined> => {
		//esitmate receive

		if (wallet) {
			console.log("\n", " init swap in hook ", "\n");
			const transaction: Transaction = wallet.initialiseTransaction(
				TransactingComponent.SWAP,
				[getAsset(sendAsset)],
				[getAsset(recieveAsset)]
			);
			
			console.log('\n','in init hook transaction : ', transaction,'\n'); 
			await wallet.updateBalance(TransactingComponent.SWAP,transaction);
			return transaction
		} else return undefined;
	};

	const updateBalance = async (transaction: Transaction): Promise<boolean> => {
		//esitmate receive

		console.log("\n", "balance update : ", "\n");
		if (wallet) {
			console.log("\n", "balance update in wallet: ", "\n");
		return	await wallet.updateBalance(TransactingComponent.SWAP, transaction);
		} else return false;
	};

	const getActiveTransaction = (): Transaction | undefined => {
		if (wallet) {
			return wallet.swapTransaction
		}
	};
	const viewTransaction = (id: Id): Transaction | undefined => {
		//esitmate receive

		if (wallet) {
			return wallet.fetchTransaction(id);
		}
	};
	return { initializeSwap, viewTransaction, getActiveTransaction, updateBalance };
}
export function useWallet() {
	const wallet = useContext(WalletContext);

	return wallet;
}
