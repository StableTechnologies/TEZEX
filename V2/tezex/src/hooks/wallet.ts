import { useContext, useCallback, useEffect, useState } from "react";
import { TezosToolkit } from "@taquito/taquito";

import { BigNumber } from "bignumber.js";
import { estimate} from "../functions/estimates";
import { processTransaction } from "../functions/transactions";
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
					break;
				case TransactingComponent.ADD_LIQUIDITY:
					setTransaction(
						wallet.addLiquidityTransaction
					);
					break;
				case TransactingComponent.REMOVE_LIQUIDITY:
					setTransaction(
						wallet.removeLiquidityTransaction
					);
					break;
			}
		}
	}, [wallet, component]);
	//const transaction =  useCallback(()=>{if (wallet.swapTransaction) processTransaction(wallet.swapTransaction)},[wallet])
	useEffect(() => {

		if(transacting && transaction && transaction.transactionStatus!==TransactionStatus.PENDING){
					wallet && wallet.updateStatus(component, TransactionStatus.PENDING);

		}
	})
	const initialize = useCallback(
		async (
			sendAsset: AssetOrAssetPair,
			recieveAsset: AssetOrAssetPair,
			sendAmount?: BigNumber, //TODO
			receiveAmount?: BigNumber, //TODO
			slippage?: number //TODO
		): Promise<Transaction | undefined> => {
			//esitmate receive

			console.log("\n", "wallet : ", wallet, "\n");
			if (wallet) {
				console.log("\n", " init swap in hook ", "\n");
				const transaction: Transaction =
					wallet.initialiseTransaction(
						component,
						sendAsset,
						recieveAsset
					);

				console.log(
					"\n",
					"in init hook transaction : ",
					transaction,
					"\n"
				);
				if (wallet.client)
					await wallet.updateBalance(
						TransactingComponent.SWAP,
						transaction
					);
				return transaction;
			} else return undefined;
		},
		[wallet, component]
	);

	const updateBalance = useCallback(async (): Promise<boolean> => {
		//esitmate receive

		console.log("\n", "balance update : ", "\n");
		if (wallet && transaction && !transacting) {
			console.log("\n", "balance update in wallet: ", "\n");
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
		setTransacting(true);
		if (wallet && transaction && wallet.address && wallet.toolkit) {
			await processTransaction(
				transaction,
				wallet.address,
				wallet.toolkit
			);
		setTransacting(false);

		}
	}, [wallet, transaction]);

	const updateAmount = useCallback(
		async (
			sendAmount?: string,
			slippage?: string
		): Promise<boolean> => {

			console.log("\n", " in updateAmount hook", "\n");
			var updated = false;
			if (transaction && !transacting && (sendAmount && !transaction.sendAmount[0].decimal.eq(sendAmount))) {
				if (wallet && sendAmount) {
					wallet.updateStatus(component, TransactionStatus.MODIFIED);
					console.log(
						"\n",
						" :wallet and sendAmount ",
						"\n"
					);
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
										console.log(
											"\n",
											"transaction : ",
											transaction,
											"\n"
										);
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
								console.log(
									"\n",
									"_transaction : ",
									_transaction,
									"\n"
								);
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
					console.log('\n','slippagepdateslippagepdate hook condition: ','\n'); 
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
