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
import { balanceBuilder } from "../functions/util";
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

	updateStatus: (
		component: TransactingComponent,
		transactionStatus: TransactionStatus
	) => void;
	updateAmount: (
		component: TransactingComponent,
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
		console.log(
			"\n",
			"tracking addLiquidity transaction : ",
			addLiquidityTransaction,
			"\n"
		);
	}, [addLiquidityTransaction]);
	useEffect(() => {
		console.log(
			"\n",
			"tracking swapTransaction : ",
			swapTransaction,
			"\n"
		);
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
		//////console.log("\n", "swapTransaction : ", swapTransaction, "\n");
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
								//console.log('\n',' :failed in getBalanceOfAssets ','\n');
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
		[toolkit, address]
	);

	const checkSufficientBalance = (
		userBalance: Amount,
		requiredAmount: Amount
	): TransactionStatus => {
		if (userBalance.length !== requiredAmount.length) {
			//console.log('\n','userBalance : ', userBalance,'\n');
			//console.log('\n','requiredAmount : ', requiredAmount,'\n');
			throw Error("Error: balance check asset pair mismatch");
		}
		console.log("\n", " :check balance call ", "\n");
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
		console.log("\n", "checks : ", checks, "\n");
		console.log("\n", "requiredAmount : ", requiredAmount, "\n");
		const hasSufficientBalance: boolean = !checks.includes(false);
		/*
				checks.reduce(
				(accumulator, currentValue) =>
					accumulator === currentValue,
				true
			);
			*/
		console.log(
			"\n",
			"hasSufficientBalance : ",
			hasSufficientBalance,
			"\n"
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
					//console.log('\n',' got send Balance in get Balances ','\n');
					//userBalance && console.log('\n','userBalance[0].decimal.toString() : ', userBalance[0].decimal.toString(),'\n');
					if (checkBalance && userBalance) {
						balanceStatus =
							checkSufficientBalance(
								userBalance,
								transaction.sendAmount
							);
					}
					if (userBalance)
						userBalanceSend = userBalance;
					//console.log('\n',' got send Balance in get Balances ','\n');
					return getBalanceOfAssets(
						transaction.receiveAsset
					);
				})
				.then((userBalance: Amount | null) => {
					//console.log('\n',' got receive Balance in get Balances ','\n');
					//userBalance && console.log('\n','receive userBalance[0].decimal.toString() : ', userBalance[0].decimal.toString(),'\n');
					const receiveAssetBalance = userBalance
						? userBalance
						: transaction.receiveAssetBalance;
					const sendAssetBalance: Amount =
						userBalanceSend
							? userBalanceSend
							: transaction.sendAssetBalance;
					/*
					const transactionStatus: TransactionStatus =
						userBalance ? checkSufficientBalance(
								userBalance,
								transaction.sendAmount
							): transaction.transactionStatus;
					*/
					/*
					if (userBalance) {
						console.log('\n','transactionStatus : ', checkSufficientBalance(  userBalance,
									transaction.sendAmount
								),'\n'); 
					}
					*/
					console.log(
						"\n",
						"balanceStatus : ",
						balanceStatus,
						"\n"
					);
					return {
						...transaction,
						sendAssetBalance,
						receiveAssetBalance,
						transactionstatus: balanceStatus
							? balanceStatus
							: transaction.transactionStatus,
					};
				})
				.catch((e) => {
					//console.log('\n',' failed in getBalances: ','\n');
					//console.log('\n','transaction : ', transaction,'\n');
					//console.log('\n','e : ', e,'\n');
					throw Error(e);
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
			//console.log("\n", " in updateBalance context", "\n");

			await getBalances(transaction, checkBalances)
				.then((_transaction: Transaction) => {
					switch (component) {
						case TransactingComponent.SWAP:
							setSwapTransaction(
								(
									draft: Draft<
										| Transaction
										| undefined
									>
								) => {
									if (
										draft
									) {
										draft.sendAssetBalance =
											_transaction.sendAssetBalance;
										draft.receiveAssetBalance =
											_transaction.receiveAssetBalance;
										draft.transactionStatus =
											checkSufficientBalance(
												_transaction.sendAssetBalance,
												_transaction.sendAmount
											);
									}
								}
							);
							break;
						case TransactingComponent.ADD_LIQUIDITY:
							setAddLiquidityTransaction(
								(
									draft: Draft<
										| Transaction
										| undefined
									>
								) => {
									if (
										draft
									) {
										draft.sendAssetBalance =
											_transaction.sendAssetBalance;
										draft.receiveAssetBalance =
											_transaction.receiveAssetBalance;
										draft.transactionStatus =
											checkSufficientBalance(
												_transaction.sendAssetBalance,
												_transaction.sendAmount
											);
									}
								}
							);
							break;
						case TransactingComponent.REMOVE_LIQUIDITY:
							setRemoveLiquidityTransaction(
								(
									draft: Draft<
										| Transaction
										| undefined
									>
								) => {
									if (
										draft
									) {
										draft.sendAssetBalance =
											_transaction.sendAssetBalance;
										draft.receiveAssetBalance =
											_transaction.receiveAssetBalance;
										draft.transactionStatus =
											checkSufficientBalance(
												_transaction.sendAssetBalance,
												_transaction.sendAmount
											);
									}
								}
							);
							break;
					}
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
					//console.log('\n','transaction : ', transaction,'\n');
					//console.log('\n','recieved after getBalance transaction.sendAssetBalance[0].decimal.toString() : ', transaction.sendAssetBalance[0].decimal.toString(),'\n');
					/*
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
					*/
					updated = true;
				})
				.catch((e) => {
					//console.log('\n',' falied update balance ','\n');
					updated = false;
				});
			return updated;
		},
		[getBalances, setSwapTransaction]
	);

	const updateStatus = useCallback(
		(
			component: TransactingComponent,
			transactionStatus: TransactionStatus
		) => {
			switch (component) {
				case TransactingComponent.SWAP:
					setSwapTransaction(
						(
							draft: Draft<
								| Transaction
								| undefined
							>
						) => {
							if (draft) {
								draft.transactionStatus =
									transactionStatus;
							}
						}
					);
					break;
				case TransactingComponent.ADD_LIQUIDITY:
					setAddLiquidityTransaction(
						(
							draft: Draft<
								| Transaction
								| undefined
							>
						) => {
							if (draft) {
								draft.transactionStatus =
									transactionStatus;
							}
						}
					);
					break;
				case TransactingComponent.REMOVE_LIQUIDITY:
					setRemoveLiquidityTransaction(
						(
							draft: Draft<
								| Transaction
								| undefined
							>
						) => {
							if (draft) {
								draft.transactionStatus =
									transactionStatus;
							}
						}
					);
					break;
			}
		},
		[
			setAddLiquidityTransaction,
			setSwapTransaction,
			setRemoveLiquidityTransaction,
		]
	);
	const updateAmount = useCallback(
		(
			component: TransactingComponent,
			amountUpdateSend?: Amount,
			amountUpdateReceive?: Amount,
			slippageUpdate?: number
		): boolean => {
			switch (component) {
				case TransactingComponent.SWAP:
					setSwapTransaction(
						(
							draft: Draft<
								| Transaction
								| undefined
							>
						) => {
							if (draft) {
								console.log(
									"\n",
									"draft : ",
									swapTransaction,
									"\n"
								);
								if (
									amountUpdateSend &&
									swapTransaction &&
									!swapTransaction.sendAmount[0].decimal.eq(
										amountUpdateSend[0]
											.decimal
									)
								) {
									draft.sendAmount =
										amountUpdateSend;
									if (
										swapTransaction
									)
										draft.transactionStatus =
											checkSufficientBalance(
												swapTransaction.sendAssetBalance,
												amountUpdateSend
											);
								}
								if (
									amountUpdateReceive &&
									swapTransaction &&
									!swapTransaction.receiveAmount[0].decimal.eq(
										amountUpdateReceive[0]
											.decimal
									)
								) {
									draft.receiveAmount =
										amountUpdateReceive;
								}
								if (
									slippageUpdate &&
									swapTransaction &&
									swapTransaction.slippage !==
										slippageUpdate
								)
									draft.slippage =
										slippageUpdate;
							}
						}
					);
					break;
				case TransactingComponent.ADD_LIQUIDITY:
					setAddLiquidityTransaction(
						(
							draft: Draft<
								| Transaction
								| undefined
							>
						) => {
							if (draft) {
								console.log(
									"\n",
									"addLiquidityTransaction : ",
									addLiquidityTransaction,
									"\n"
								);
								console.log(
									"\n",
									" add liquidity update amountUpdateSend, amountUpdateReceive, slippageUpdate, : ",
									amountUpdateSend,
									amountUpdateReceive,
									slippageUpdate,
									"\n"
								);
								if (
									amountUpdateSend &&
									addLiquidityTransaction &&
									!addLiquidityTransaction.sendAmount[0].decimal.eq(
										amountUpdateSend[0]
											.decimal
									)
								) {
									console.log('\n',' send update','\n'); 
									draft.sendAmount =
										amountUpdateSend;
									if (
										addLiquidityTransaction
									)
										draft.transactionStatus =
											checkSufficientBalance(
												addLiquidityTransaction.sendAssetBalance,
												amountUpdateSend
											);
								}
								if (
									amountUpdateReceive &&
									addLiquidityTransaction &&
									!addLiquidityTransaction.receiveAmount[0].decimal.eq(
										amountUpdateReceive[0]
											.decimal
									)
								) {

									console.log('\n',' recieve update','\n'); 
									draft.receiveAmount =
										amountUpdateReceive;
								}
								if (
									slippageUpdate &&
									addLiquidityTransaction &&
									addLiquidityTransaction.slippage !==
										slippageUpdate
								)
									draft.slippage =
										slippageUpdate;
							}
						}
					);
					break;
				case TransactingComponent.REMOVE_LIQUIDITY:
					setRemoveLiquidityTransaction(
						(
							draft: Draft<
								| Transaction
								| undefined
							>
						) => {
							if (draft) {

									console.log('\n',' :remove update ','\n'); 
								console.log('\n','amountUpdateSend before condition: ', amountUpdateSend,'\n'); 
								if (
									amountUpdateSend &&
									removeLiquidityTransaction &&
									!removeLiquidityTransaction.sendAmount[0].decimal.eq(
										amountUpdateSend[0]
											.decimal
									)
								) {
									console.log('\n',' :remove update ammount after condition*******************','\n'); 
									draft.sendAmount =
										amountUpdateSend;
									if (
										removeLiquidityTransaction
									)
										draft.transactionStatus =
											checkSufficientBalance(
												removeLiquidityTransaction.sendAssetBalance,
												amountUpdateSend
											);
								}
								if (
									amountUpdateReceive &&
									removeLiquidityTransaction &&
									!removeLiquidityTransaction.receiveAmount[0].decimal.eq(
										amountUpdateReceive[0]
											.decimal
									)
								) {
									draft.receiveAmount =
										amountUpdateReceive;
								}
								if (
									slippageUpdate &&
									removeLiquidityTransaction &&
									removeLiquidityTransaction.slippage !==
										slippageUpdate
								)
									draft.slippage =
										slippageUpdate;
							}
						}
					);
					break;
			}
			if (
				!amountUpdateSend ||
				(!amountUpdateReceive && !slippageUpdate)
			) {
				return false;
			} else return true;
		},
		[addLiquidityTransaction,removeLiquidityTransaction,swapTransaction,setSwapTransaction, setAddLiquidityTransaction , setRemoveLiquidityTransaction]
	);

	//^^^ MAKE ASYNC...set balance THEN check balance THEN modify transaction
	//todo create async getBlaance(loadAsset, Amount)
	//todo create sync checkSufficientBalance(Amount, Amount)
	// modify transaction with balance and sufficiency check
	//delete below strategy

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
		updateStatus,
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
