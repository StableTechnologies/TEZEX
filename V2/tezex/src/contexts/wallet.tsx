import React, { useCallback, createContext, useEffect, useState } from "react";
import { produce, Draft } from "immer";
import { useImmer } from "use-immer";

import { DAppClient } from "@airgap/beacon-sdk";
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
import { TezosToolkit } from "@taquito/taquito";

import { useSession } from "../hooks/session";
import { useNetwork } from "../hooks/network";
import { NetworkType } from "@airgap/beacon-sdk";
import { NetworkInfo } from "./network";
import { v4 as uuidv4 } from "uuid";
import { BigNumber } from "bignumber.js";
import { getBalance } from "../functions/beacon";

import {
	tokenDecimalToMantissa,
	tokenMantissaToDecimal,
} from "../functions/scaling";
export enum WalletStatus {
	ESTIMATING_SIRS = "Estimating Sirs",
	ESTIMATING_XTZ = "Estimating Tez",
	ESTIMATING_TZBTC = "Estimating tzBTC",
	ZERO_BALANCE = "Insufficient Funds",
	ZERO_AMOUNT = "Enter Amount",
	DISCONNECTED = "disconnected",
	READY = "ready",
	BUSY = "In Progress",
	LOADING = "Loading",
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
	const useWallet = async (
		op: () => Promise<unknown>,
		transientStatus: WalletStatus = WalletStatus.BUSY,
		force?: boolean
	) => {
		const setBusy = async () => {
			setWalletStatus(transientStatus);
		};
		const setReady = async () => {
			setWalletStatus(WalletStatus.READY);
		};
		if (!force && walletStatus === WalletStatus.READY) {
			await setBusy();
			await op();
			await setReady();
		} else if (force) {
			await setBusy();
			await op();
		}
	};

	return useWallet;
}

/*
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
*/
export interface WalletInfo {
	client: DAppClient | null;
	setClient: React.Dispatch<React.SetStateAction<DAppClient | null>>;
	toolkit: TezosToolkit | null;
	setToolkit: React.Dispatch<React.SetStateAction<TezosToolkit | null>>;
	address: string | null;
	setAddress: React.Dispatch<React.SetStateAction<string | null>>;
	walletStatus: WalletStatus;
	setWalletStatus: React.Dispatch<React.SetStateAction<WalletStatus>>;
	walletUser: (
		op: () => Promise<unknown>,
		walletStatus?: WalletStatus
	) => Promise<void>;
	isWalletConnected: boolean;
	isReady: () => boolean;
	disconnect: () => void;
	transactions: Transaction[];
	swapTransaction: Transaction | undefined;
	addLiquidityTransaction: Transaction | undefined;
	removeLiquidityTransaction: Transaction | undefined;
	initialiseTransaction: (
		component: TransactingComponent,
		sendAsset: AssetOrAssetPair,
		receiveAsset: AssetOrAssetPair,
		sendAmount?: Amount,
		receiveAmount?: Amount
	) => Transaction;

	updateBalance: (
		component: TransactingComponent,
		transaction: Transaction,
		checkBalances?: boolean
	) => Promise<boolean>;
	updateAmount: (
		id: string,
		amountUpdateSend?: Amount,
		amountUpdateReceive?: Amount,
		slippageUpdate?: number
	) => boolean;
	getActiveTransaction: (
		component: TransactingComponent
	) => Transaction | undefined;
	fetchTransaction: (id: string) => Transaction | undefined;
}

export const WalletContext = createContext<WalletInfo | undefined>(undefined);

export interface IWallet {
	children:
		| JSX.Element[]
		| JSX.Element
		| React.ReactElement
		| React.ReactElement[]
		| string;
}

type AssetType = "Asset" | "AssetPair";

const canModifyTransaction = (t: Draft<Transaction> | Transaction): boolean => {
	if (
		t &&
		(t.transactionStatus === TransactionStatus.FAILED ||
			t.transactionStatus === TransactionStatus.COMPLETED)
	) {
		return false;
	}
	return true;
};
const date = new Date();

export const balanceGreaterOrEqualTo = (
	balance1: Balance,
	balance2: Balance
): boolean => {
	return balance1.mantissa.isGreaterThanOrEqualTo(balance2.mantissa);
};

export const balanceBuilder = (
	value: BigNumber,
	asset: Asset,
	isMantissa?: boolean
): Balance => {
	const decimal: BigNumber = isMantissa
		? tokenMantissaToDecimal(value, asset.name)
		: value;
	const mantissa: BigNumber = isMantissa
		? value
		: tokenDecimalToMantissa(value, asset.name);
	const geq = (balance: Balance): boolean => {
		return mantissa.isGreaterThanOrEqualTo(balance.mantissa);
	};
	return {
		decimal,
		mantissa,
		greaterOrEqualTo: geq,
	};
};
interface IWalletProvider {
	children:
		| JSX.Element[]
		| JSX.Element
		| React.ReactElement
		| React.ReactElement[]
		| string;
}
export function WalletProvider(props: IWalletProvider) {
	const zeroBalance = {
		decimal: new BigNumber(0),
		mantissa: new BigNumber(0),
		greaterOrEqualTo: (balance: Balance): boolean => {
			return new BigNumber(0).isGreaterThanOrEqualTo(
				balance.mantissa
			);
		},
	};
	// session
	const session = useSession();
	//use Immer
	const [transactions, setTransactions] = useImmer<Transaction[]>([]);

	const [_swapTransaction, set_SwapTransaction] = useState<
		Transaction | undefined
	>(undefined);
	const [swapTransaction, setSwapTransaction] = useImmer<
		Transaction | undefined
	>(undefined);
	const [addLiquidityTransaction, setAddLiquidityTransaction] = useImmer<
		Transaction | undefined
	>(undefined);
	const [removeLiquidityTransaction, setRemoveLiquidityTransaction] =
		useImmer<Transaction | undefined>(undefined);

	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [walletStatus, setWalletStatus] = useState(
		WalletStatus.DISCONNECTED
	);
	const [client, setClient] = useState<DAppClient | null>(null);
	const [toolkit, setToolkit] = useState<TezosToolkit | null>(null);
	const [address, setAddress] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	useEffect(() => {
		console.log("\n", "toolkit : ", toolkit, "\n");
		console.log("\n", "client : ", client, "\n");
	}, [toolkit, client]);
	const getActiveTransaction = useCallback(
		(component: TransactingComponent): Transaction | undefined => {
			switch (component) {
				case TransactingComponent.SWAP:
					const t = swapTransaction;
					return t;
				case TransactingComponent.ADD_LIQUIDITY:
					return addLiquidityTransaction;
				case TransactingComponent.REMOVE_LIQUIDITY:
					return removeLiquidityTransaction;
			}
		},
		[
			swapTransaction,
			addLiquidityTransaction,
			removeLiquidityTransaction,
		]
	);

	useEffect(() => {
		const interval = setInterval(() => {
			/*
			console.log(
				"\n",
				"swap active in context : ",
				swapTransaction,
				"\n"
			);
			
			swapTransaction &&
				console.log(
					"\n",
					"swapTransaction.sendAssetBalance[0].decimal : ",
					swapTransaction.sendAssetBalance[0].decimal.toString(),
					"\n"
				);
			*/
		}, 5000);
		return () => clearInterval(interval);
		//if (isWalletConnected) updateTransactionBalance();
	}, [swapTransaction]);

	const setActiveTransaction = useCallback(
		(
			component: TransactingComponent,
			transaction?: Transaction,
			op?: (transaction: Draft<Transaction>) => void
		): void => {
			switch (component) {
				case TransactingComponent.SWAP:
					if (op && swapTransaction) {
						setSwapTransaction((draft) =>
							draft
								? op(draft)
								: draft
						);
					} else if (transaction)
						setSwapTransaction(transaction);
					break;
				case TransactingComponent.ADD_LIQUIDITY:
					if (op && addLiquidityTransaction) {
						setAddLiquidityTransaction(
							(draft) =>
								draft
									? op(
											draft
									  )
									: draft
						);
					} else if (transaction)
						setAddLiquidityTransaction(
							transaction
						);
					break;
				case TransactingComponent.REMOVE_LIQUIDITY:
					if (op && removeLiquidityTransaction) {
						setRemoveLiquidityTransaction(
							(draft) =>
								draft
									? op(
											draft
									  )
									: draft
						);
					} else if (transaction)
						setRemoveLiquidityTransaction(
							transaction
						);
					break;
			}
		},
		[
			setSwapTransaction,
			setAddLiquidityTransaction,
			setRemoveLiquidityTransaction,
			addLiquidityTransaction,
			removeLiquidityTransaction,
			swapTransaction,
		]
	);

	const network = useNetwork();
	useEffect(() => {
		if (loading) {
			setLoading(false);
		}
	}, []);

	//check and update balance of Modifyable

	const initialiseTransaction = useCallback(
		(
			component: TransactingComponent,
			sendAsset: AssetOrAssetPair,
			receiveAsset: AssetOrAssetPair,
			sendAmount?: Amount,
			receiveAmount?: Amount
		): Transaction => {
			console.log("\n", " in initTransaction ", "\n");
			var id = null;
			const initBalance = (
				asset: AssetOrAssetPair
			): Amount => {
				switch (asset.length) {
					case 1:
						return [zeroBalance];
					case 2:
						return [
							zeroBalance,
							zeroBalance,
						];
				}
			};
			const send: Amount = sendAmount
				? sendAmount
				: initBalance(sendAsset);
			const receive: Amount = receiveAmount
				? receiveAmount
				: initBalance(receiveAsset);

			const transaction: Transaction = {
				id: uuidv4(),

				network: network.network,
				component,
				sendAsset,
				sendAmount: send,
				sendAssetBalance: initBalance(sendAsset),
				receiveAsset,
				receiveAmount: receive,
				receiveAssetBalance: initBalance(receiveAsset),
				transactionStatus:
					TransactionStatus.INITIALISED,
				slippage: 0.5,
				lastModified: new Date(),
			};
			setActiveTransaction(component, transaction);
			return transaction;
		},
		[]
	);

	useEffect(() => {
		console.log("\n", "swapTransaction : ", swapTransaction, "\n");
		swapTransaction &&
			console.log(
				"\n",
				"swapTransaction.sendAssetBalances[0].decimal.toString() : ",
				swapTransaction.sendAssetBalance[0].decimal.toString(),
				"\n"
			);
	}, [swapTransaction]);

	useEffect(() => {}, [transactions]);

	type EditTransaction = (transaction: Draft<Transaction>) => boolean;
	type EditTransactionAsync = (
		transaction: Transaction | undefined | null
	) => Promise<Transaction | null>;

	const modifyAmount = (
		kind: "Send" | "Receive",
		amount?: Amount,
		slippage?: number
	): EditTransaction => {
		const mod = (transaction: Draft<Transaction>): boolean => {
			if (transaction && canModifyTransaction(transaction)) {
				if (slippage) transaction.slippage = slippage;
				if (kind === "Send") {
					if (amount) {
						transaction.sendAmount = amount;
					}
				}

				if (kind === "Receive") {
					if (amount) {
						transaction.receiveAmount =
							amount;
					}
				}

				transaction.transactionStatus =
					TransactionStatus.MODIFIED;
				if (amount || slippage) {
					return true;
				} else return false;
			}
			return false;
		};
		return mod;
	};

	const fetchTransaction = (id: string): Transaction | undefined => {
		return transactions.find((t: Transaction) => t.id === id);
	};

	const withTransactionAsync = async (
		id: string,
		edit: EditTransactionAsync
	): Promise<boolean> => {
		return await edit(fetchTransaction(id))
			.then((modifiedTransaction: Transaction | null) => {
				if (modifiedTransaction) {
					return withTransaction(
						id,
						(
							transaction: Draft<Transaction>
						) => {
							transaction =
								modifiedTransaction;
							return true;
						}
					);
				} else return false;
			})
			.catch((e) => {
				throw e;
			});
	};
	const withTransaction = (
		id: string,
		edit: EditTransaction
	): boolean => {
		var updated = false;
		setTransactions((draft) => {
			const transaction = draft.find(
				(transaction) => transaction.id === id
			);
			if (transaction) {
				return edit(transaction);
			}
		});
		return updated;
	};
	const modifyTransaction = (
		id: string,
		kind: "Send" | "Receive",
		amount?: Amount,
		slippage?: number
	): boolean => {
		return withTransaction(
			id,
			modifyAmount(kind, amount, slippage)
		);
	};

	const getBalanceOfAssets = useCallback(
		async (assets: AssetOrAssetPair): Promise<Amount | null> => {
			if (toolkit && address) {
				switch (assets.length) {
					case 1:
						return await getBalance(
							toolkit,
							address,
							assets[0]
						)
							.then(
								(
									balance: Balance
								) => {
									//console.log('\n','assets[0] : ', assets[0],'\n');
									//console.log('\n','balance : ', balance.decimal.toString(),'\n');
									return [
										balance,
									] as Amount;
								}
							)
							.catch((_) => {
								console.log('\n',' :failed in getBalanceOfAssets ','\n'); 
								return null;
							});
					case 2:
						return await getBalance(
							toolkit,
							address,
							assets[0]
						)
							.then(
								(
									balance: Balance
								) => {
									const withSecondAsset =
										async () => {
											return [
												balance,
												await getBalance(
													toolkit,
													address,
													assets[1]
												),
											] as Amount;
										};
									return withSecondAsset();
								}
							)
							.catch((_) => {
								return null;
							});
				}
			}
			return null;
		},
		[toolkit, address, getActiveTransaction]
	);

	const checkSufficientBalance = (
		userBalance: Amount,
		requiredAmount: Amount
	): TransactionStatus => {
		if (userBalance.length !== requiredAmount.length)
		{
			console.log('\n','userBalance : ', userBalance,'\n'); 
			console.log('\n','requiredAmount : ', requiredAmount,'\n'); 
			throw Error("Error: balance check asset pair mismatch");
		}
		const checks: boolean[] = Array.from(
			userBalance,
			(assetBalance, index) => {
				const required = requiredAmount[index];
				if (required) {
					return assetBalance.greaterOrEqualTo(
						required
					);
				} else
					throw Error(
						"Amount indexs don't match / align"
					);
			}
		);
		const hasSufficientBalance: boolean = checks.reduce(
			(accumulator, currentValue) =>
				accumulator === currentValue,
			true
		);
		if (hasSufficientBalance) {
			return TransactionStatus.SUFFICIENT_BALANCE;
		} else {
			return TransactionStatus.INSUFFICIENT_BALANCE;
		}
	};
	type MaybeTransaction = Transaction | undefined | null;
	type AmountCheck =
		| [Amount, MaybeTransaction, boolean]
		| [null, null, false];

	//sync
	/*
	const transactionModify = (
		sendAssetBalances,
		recieveAssetBalances
	) => {};
	*/

	const getBalances = useCallback(
		async (
			transaction: Transaction,
			checkBalance?: boolean
		): Promise<Transaction> => {
			var userBalanceSend: Amount | undefined;
			var userBalanceReceive: Amount | undefined;
			var balanceStatus: TransactionStatus | undefined;
			const updated: Transaction = await getBalanceOfAssets(
				transaction.sendAsset
			)
				.then((userBalance: Amount | null) => {

					        console.log('\n',' got send Balance in get Balances ','\n');  
					userBalance && console.log('\n','userBalance[0].decimal.toString() : ', userBalance[0].decimal.toString(),'\n'); 
					if (checkBalance && userBalance) {
						balanceStatus =
							checkSufficientBalance(
								userBalance,
								transaction.sendAmount
							);
					}
					if (userBalance)
						userBalanceSend = userBalance;
					        console.log('\n',' got send Balance in get Balances ','\n');  
					return getBalanceOfAssets(
						transaction.receiveAsset
					);
				})
				.then((userBalance: Amount | null) => {

					        console.log('\n',' got receive Balance in get Balances ','\n');  
					userBalance && console.log('\n','receive userBalance[0].decimal.toString() : ', userBalance[0].decimal.toString(),'\n'); 
					const receiveAssetBalance = userBalance
						? userBalance
						: transaction.receiveAssetBalance;
					const sendAssetBalance: Amount =
						userBalanceSend
							? userBalanceSend
							: transaction.sendAssetBalance;
					const transactionStatus: TransactionStatus =
						balanceStatus
							? balanceStatus
							: transaction.transactionStatus;
					return {
						...transaction,
						sendAssetBalance,
						receiveAssetBalance,
						transactionStatus,
					};
				}).catch((e) => {
					console.log('\n',' failed in getBalances: ','\n'); 
					console.log('\n','transaction : ', transaction,'\n'); 
					console.log('\n','e : ', e,'\n'); 
					throw Error(e)
				});
			return updated;
		},
		[getBalanceOfAssets]
	);

	const updateBalance = useCallback(
		async (
			component: TransactingComponent,
			transaction: Transaction,
			checkBalances: boolean = true
		): Promise<boolean> => {
			var updated = false;
			console.log("\n", " in updateBalance context", "\n");

			await getBalances(transaction, checkBalances)
				.then((_transaction: Transaction) => {
					/*
					setActiveTransaction(
					
						component,
						undefined,
						(_transaction: Draft<Transaction>) => {
							_transaction.sendAssetBalance  = transaction.sendAssetBalance
							_transaction.receiveAssetBalance  = transaction.receiveAssetBalance
						},
					
					);
					*/

					console.log('\n','transaction : ', transaction,'\n'); 
					console.log('\n','recieved after getBalance transaction.sendAssetBalance[0].decimal.toString() : ', transaction.sendAssetBalance[0].decimal.toString(),'\n'); 
					setSwapTransaction(
						(
							draft: Draft<
								| Transaction
								| undefined
							>
						) => {
							if (draft) {
								draft.sendAssetBalance =
									_transaction.sendAssetBalance;
							}
						}
					);
					updated = true;
				})
				.catch((e) => {
					console.log('\n',' falied update balance ','\n'); 
					updated = false;
				});
			return updated;
		},
		[getBalances,setSwapTransaction]
	);

	const updateAmount = useCallback(
		(
			id: string,
			amountUpdateSend?: Amount,
			amountUpdateReceive?: Amount,
			slippageUpdate?: number
		): boolean => {
			withTransaction(
				id,
				(
					oldTransaction: Draft<Transaction>
				): boolean => {
					if (
						oldTransaction &&
						(amountUpdateSend ||
							amountUpdateReceive ||
							slippageUpdate)
					) {
						oldTransaction.sendAmount =
							amountUpdateSend
								? amountUpdateSend
								: oldTransaction.sendAmount;
						oldTransaction.receiveAmount =
							amountUpdateReceive
								? amountUpdateReceive
								: oldTransaction.receiveAmount;
						oldTransaction.slippage =
							slippageUpdate
								? slippageUpdate
								: oldTransaction.slippage;
						return true;
					}
					return false;
				}
			);

			//^^^ MAKE ASYNC...set balance THEN check balance THEN modify transaction
			//todo create async getBlaance(loadAsset, Amount)
			//todo create sync checkSufficientBalance(Amount, Amount)
			// modify transaction with balance and sufficiency check
			//delete below strategy
			return false;
		},
		[]
	);

	useEffect(() => {
		if (client) {
			setIsWalletConnected(true);
			setWalletStatus(WalletStatus.READY);
		} else {
			setIsWalletConnected(false);
			setWalletStatus(WalletStatus.BUSY);
		}
	}, [client]);

	const disconnect = () => {
		setClient(null);
		setAddress(null);
	};

	const walletInfo: WalletInfo = {
		client,
		setClient,
		toolkit,
		setToolkit,
		address,
		setAddress,
		walletStatus,
		setWalletStatus,
		walletUser: walletUser(walletStatus, setWalletStatus),
		isWalletConnected,
		isReady: isReady(walletStatus),
		transactions,
		swapTransaction,
		addLiquidityTransaction,
		removeLiquidityTransaction,
		initialiseTransaction,
		updateBalance,
		updateAmount,
		getActiveTransaction,
		fetchTransaction,
		disconnect,
	};

	return (
		<WalletContext.Provider value={walletInfo}>
			{props.children}
		</WalletContext.Provider>
	);
}
