import { useContext } from "react";
import { TezosToolkit} from "@taquito/taquito";

import { getAsset } from "../constants";
import { BigNumber } from "bignumber.js";
import { estimate, estimateTokensReceivedSwap } from "../functions/estimates";
import { WalletContext, WalletInfo } from "../contexts/wallet";
import {useNetwork} from "../hooks/network";

import {balanceBuilder} from "../functions/util"
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


export interface RemoveLiquidityOps {
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

export interface AddLiquidityOps {
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
	updateAmount: (transaction: Transaction,sendAmount?: string,slippage?: string)=> Promise<boolean>;
}

export function useWalletConnected(): boolean {
	const wallet = useContext(WalletContext);
	if (wallet) {
		return wallet.isWalletConnected;
	} else return false;
}


export function useWalletAddLiquidityOps(): AddLiquidityOps {
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
				TransactingComponent.ADD_LIQUIDITY,
				[getAsset(sendAsset)],
				[getAsset(recieveAsset)]
			);
			
			console.log('\n','in init hook transaction : ', transaction,'\n'); 
			await wallet.updateBalance(TransactingComponent.ADD_LIQUIDITY,transaction);
			return transaction
		} else return undefined;
	};

	const updateBalance = async (transaction: Transaction): Promise<boolean> => {
		//esitmate receive

		console.log("\n", "balance update : ", "\n");
		if (wallet) {
			console.log("\n", "balance update in wallet: ", "\n");
		return	await wallet.updateBalance(TransactingComponent.ADD_LIQUIDITY, transaction);
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
export function useWalletRemoveLiquidityOps(): RemoveLiquidityOps {
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
export function useWalletSwapOps(): SwapOps {
	const wallet = useContext(WalletContext);
	const network = useNetwork();

	const initializeSwap = async (
		sendAsset: TokenKind,
		recieveAsset: TokenKind,
		sendAmount?: BigNumber, //TODO
		receiveAmount?: BigNumber, //TODO
		slippage?: number //TODO
	): Promise<Transaction | undefined> => {
		//esitmate receive

		console.log('\n','wallet : ', wallet,'\n'); 
		if (wallet) {
			console.log("\n", " init swap in hook ", "\n");
			const transaction: Transaction = wallet.initialiseTransaction(
				TransactingComponent.SWAP,
				[getAsset(sendAsset)],
				[getAsset(recieveAsset)]
			);
			
			console.log('\n','in init hook transaction : ', transaction,'\n'); 
			if(wallet.client)await wallet.updateBalance(TransactingComponent.SWAP,transaction);
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
	const updateAmount = async(transaction: Transaction,sendAmount?: string,slippage?: string): Promise<boolean> =>{

		
		console.log('\n',' in updateAmount hook','\n'); 
		var updated = false
		if(wallet && sendAmount) wallet.updateAmount(transaction.component,[balanceBuilder(sendAmount, transaction.sendAsset[0], false)]);
		if(wallet && slippage) wallet.updateAmount(transaction.component,undefined,undefined,new BigNumber(slippage).toNumber())

	        const toolkit = new TezosToolkit(network.tezosServer);
		if(wallet ) await estimate(transaction, toolkit).then((transaction: Transaction) => {
			wallet.updateAmount(transaction.component,undefined,transaction.receiveAmount)
   
		}).catch((e)=>{console.log('estmation Failed',e);})
		return updated


	}
	return { initializeSwap, viewTransaction, getActiveTransaction, updateBalance , updateAmount};
}
export function useWallet() {
	const wallet = useContext(WalletContext);

	return wallet;
}
