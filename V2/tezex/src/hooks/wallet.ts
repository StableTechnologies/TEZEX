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
	) => Promise<Id | null>;
	viewTransaction: (id: Id) => Promise<Transaction | undefined | null>;
}
export function useWalletSwapOps(): SwapOps {
	const wallet = useContext(WalletContext);

	const initializeSwap = async (
		sendAsset: TokenKind,
		recieveAsset: TokenKind,
		sendAmount?: BigNumber, //TODO
		receiveAmount?: BigNumber, //TODO
		slippage?: number //TODO
	): Promise<Id | null> => {
		//esitmate receive

		if (wallet) {
			const id: string | null = wallet.initialiseTransaction(
				TransactingComponent.SWAP,
				[getAsset(sendAsset)],
				[getAsset(recieveAsset)]
			);
			id &&
				console.log(
					"\n",
					"wallet.fetchTransaction(id) : ",
					wallet.fetchTransaction(id),
					"\n"
				);
			id && (await wallet.updateBalance(id));
			return id;
		} else return null;
	};

	const viewTransaction = async (
		id: Id
	): Promise<Transaction | undefined | null> => {
		//esitmate receive

		if (wallet) {
			return wallet.fetchTransaction(id);
		}
	};
	return { initializeSwap, viewTransaction };
}
export function useWallet() {
	const wallet = useContext(WalletContext);

	return wallet;
}
