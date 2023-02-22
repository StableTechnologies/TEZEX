import { useContext, useCallback, useEffect, useState } from "react";
import { TezosToolkit } from "@taquito/taquito";

import { BigNumber } from "bignumber.js";
import { estimate} from "../functions/estimates";
import { WalletContext} from "../contexts/wallet";
import { useNetwork } from "../hooks/network";

import { balanceBuilder } from "../functions/util";
import {
	Transaction,
	Id,
	TransactionStatus,
	TransactingComponent,
	AssetOrAssetPair,
} from "../types/general";

export interface WalletOps {
	initialize: (
		sendAsset: AssetOrAssetPair,
		recieveAsset: AssetOrAssetPair,
		sendAmount?: BigNumber, //TODO
		receiveAmount?: BigNumber, //TODO
		slippage?: number //TODO
	) => Promise<Transaction | undefined>;
	viewTransaction: (id: Id) => Transaction | undefined | null;
	getActiveTransaction: () => Transaction | undefined;
	updateBalance: () => Promise<boolean>;
	updateAmount: (
		sendAmount?: string,
		slippage?: string
	) => Promise<boolean>;
	sendTransaction: () => Promise<void>;
}
export function useWalletOps(component: TransactingComponent): WalletOps {
	const wallet = useContext(WalletContext);
	const network = useNetwork();

	const [loading, setLoading] = useState<boolean>(
		true
	);

	const [transacting, setTransacting] = useState<boolean>(
		false
	);

	const [transaction, setTransaction] = useState<Transaction | undefined>(
		undefined
	);

	useEffect(() => {
		if (wallet) {
			switch (component) {
				case TransactingComponent.SWAP:
					setTransaction(wallet.swapTransaction);
setLoading(false)

					break;
				case TransactingComponent.ADD_LIQUIDITY:
					setTransaction(
						wallet.addLiquidityTransaction
					);
setLoading(false)

					break;
				case TransactingComponent.REMOVE_LIQUIDITY:
					setTransaction(
						wallet.removeLiquidityTransaction
					);
setLoading(false)

					break;
			}
		}
	}, [wallet, component]);
	//const transaction =  useCallback(()=>{if (wallet.swapTransaction) processTransaction(wallet.swapTransaction)},[wallet])
	useEffect(() => {

		if(transacting && transaction && transaction.transactionStatus!==TransactionStatus.PENDING){
			setTransacting(false)
			if (loading) setLoading(false)

		}else if(!transacting && transaction && transaction.transactionStatus===TransactionStatus.PENDING){
			setTransacting(true)
			if (loading) setLoading(false)
		} else if (loading && transaction) setLoading(false)
	},[transacting, transaction, setTransacting, loading])

	const initialize = useCallback(
		async (
			sendAsset: AssetOrAssetPair,
			recieveAsset: AssetOrAssetPair,
			sendAmount?: BigNumber, //TODO
			receiveAmount?: BigNumber, //TODO
			slippage?: number //TODO
		): Promise<Transaction | undefined> => {
			//esitmate receive

			/*
			const checkActive = (transaction: Transaction) => {
			  if (transaction.transactionStatus === TransactionStatus.PENDING) 
			}
			
			*/

			if (loading) {
				return transaction
			} else if (wallet && !loading && transaction && transaction.transactionStatus===TransactionStatus.PENDING){
				return transaction
			} else if (wallet && !loading ) {
				
				const transaction: Transaction =
					wallet.initialiseTransaction(
						component,
						sendAsset,
						recieveAsset
					);

				
				if (wallet.client)
					await wallet.updateBalance(
						component,
						transaction
					);
				return transaction;
			} else return undefined;
		},
		[wallet, loading, transaction, component]
	);

	const updateBalance = useCallback(async (): Promise<boolean> => {
		//esitmate receive

		
		if (wallet && transaction && transaction.transactionStatus!==TransactionStatus.PENDING && !transacting) {
			
			return await wallet.updateBalance(
				component,
				transaction
			);
		} else return false;
	}, [wallet, component, transaction, transacting]);

	const getActiveTransaction = useCallback(():
		| Transaction
		| undefined => {
		return transaction;
	}, [transaction]);
	const viewTransaction = (id: Id): Transaction | undefined => {
		//esitmate receive

		if (wallet) {
			return wallet.fetchTransaction(id);
		}
	};
	const sendTransaction = useCallback(async () => {
	//	setTransacting(true);
		if (wallet && transaction && wallet.address && wallet.toolkit) {
                      wallet.updateStatus(component, TransactionStatus.PENDING);
	//	setTransacting(false);

		}
	}, [wallet,component, transaction]);

	const updateAmount = useCallback(
		async (
			sendAmount?: string,
			slippage?: string
		): Promise<boolean> => {

			var updated = false;
			if (transaction && transaction.transactionStatus!==TransactionStatus.PENDING && !transacting && (sendAmount && !transaction.sendAmount[0].decimal.eq(sendAmount))) {
				if (wallet && sendAmount) {
					wallet.updateStatus(component, TransactionStatus.MODIFIED);
					
					const toolkit = new TezosToolkit(
						network.tezosServer
					);
					const updatedTransaction =
						(): Transaction => {
							switch (component) {
								case TransactingComponent.SWAP:
									return {
										...transaction,
										sendAmount: [
											balanceBuilder(
												sendAmount,
												transaction
													.sendAsset[0],
												false
											),
										],
									};
								case TransactingComponent.ADD_LIQUIDITY:
									if (
										transaction
											.sendAmount[1]
									) {
										return {
											...transaction,
											sendAmount: [
												balanceBuilder(
													sendAmount,
													transaction
														.sendAsset[0],
													false
												),
												transaction
													.sendAmount[1],
											],
										};
									} else {
										
										throw Error(
											"Got single Asset of addLiquidity"
										);
									}
								case TransactingComponent.REMOVE_LIQUIDITY:
									return {
										...transaction,
										sendAmount: [
											balanceBuilder(
												sendAmount,
												transaction
													.sendAsset[0],
												false
											),
										],
									};
							}
						};

					await estimate(
						updatedTransaction(),
						toolkit
					)
						.then(
							(
								_transaction: Transaction
							) => {
								
								wallet.updateAmount(
									_transaction.component,
									_transaction.sendAmount,
									_transaction.receiveAmount
								);
								return true;
							}
						)
						.catch((e) => {
							console.log(
								"estmation Failed",
								e
							);
						});
				}} else if ( slippage && !transacting && transaction  && !(new BigNumber(transaction.slippage).eq(slippage))){
					 
					wallet && slippage && wallet.updateAmount(
						component,
						undefined,
						undefined,
						new BigNumber(
							slippage
						).toNumber()
					);
				}
			return updated;
		},
		[transaction, wallet, component, network , transacting]
	);
	return {
		initialize,
		viewTransaction,
		getActiveTransaction,
		updateBalance,
		updateAmount,
		sendTransaction,
	};
}

export function useWalletConnected(): boolean {
	const wallet = useContext(WalletContext);
	if (wallet) {
		return wallet.isWalletConnected;
	} else return false;
}
export function useWallet() {
	const wallet = useContext(WalletContext);

	return wallet;
}
