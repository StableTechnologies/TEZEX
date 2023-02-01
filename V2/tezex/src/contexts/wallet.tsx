import produce from "immer";
import React, { useCallback, createContext, useEffect, useState } from "react";
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
		console.log("\n", " here ", "\n");
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
	isReady: () => boolean;
	disconnect: () => void;
	transactions: Transaction[] | null | undefined;
	initialiseTransaction: (
		component: TransactingComponent,
		sendAsset: AssetOrAssetPair,
		receiveAsset: AssetOrAssetPair,
		sendAmount?: Amount,
		receiveAmount?: Amount
	) => Id | null;

	updateBalance: (id: string) => Promise<boolean>;
	updateAmount: (
		id: string,
		assets: AssetOrAssetPair,
		kind: SendOrRecieve,
		amountUpdate?: Amount,
		slippageUpdate?: number
	) => Promise<boolean>;
	fetchTransaction: (id: string) => Transaction | undefined | null;
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

const canModifyTransaction = (t: Transaction | undefined | null): boolean => {
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

	//use Immer
	const [transactions, setTransactions] = useState<
		Transaction[] | null | undefined
	>();

	const [isWalletConnected, setIsWalletConnected] = useState(false);
	const [walletStatus, setWalletStatus] = useState(
		WalletStatus.DISCONNECTED
	);
	const [client, setClient] = useState<DAppClient | null>(null);
	const [toolkit, setToolkit] = useState<TezosToolkit | null>(null);
	const [address, setAddress] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

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
		): Id | null => {
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
			setTransactions(
				produce(
					(
						draft:
							| Transaction[]
							| undefined
							| null
					) => {
						if (draft) {
							draft.push(transaction);
						} else {

							draft = [transaction];
						}
						id = transaction.id;
					}
				)
			);
			return id;
		},
		[]
	);
	useEffect(() => {
		console.log('\n','transactions : ', transactions,'\n'); 
	},[transactions])

	type EditTransaction = (transaction: Transaction) => boolean;
	type EditTransactionAsync = (
		transaction: Transaction | undefined | null
	) => Promise<Transaction | null>;

	const modifyAmount = (
		kind: "Send" | "Receive",
		amount?: Amount,
		slippage?: number
	): EditTransaction => {
		const mod = (transaction: Transaction): boolean => {
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

	const fetchTransaction = (
		id: string
	): Transaction | undefined | null => {
		if (transactions) {
			return transactions.find(
				(t: Transaction) => t.id === id
			);
		}
		return null;
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
						(transaction: Transaction) => {
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
		setTransactions(
			produce((draft: Transaction[] | null) => {
				const transaction:
					| Transaction
					| null
					| undefined =
					draft &&
					draft.find(
						(transaction) =>
							transaction.id === id
					);
				if (transaction) {
					return edit(transaction);
				}
			})
		);
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

	const getBalanceOfAssets = async (
		assets: AssetOrAssetPair
	): Promise<Amount | null> => {
		if (toolkit && address) {
			switch (assets.length) {
				case 1:
					return [
						await getBalance(
							toolkit,
							address,
							assets[0]
						),
					];
				case 2:
					return [
						await getBalance(
							toolkit,
							address,
							assets[0]
						),
						await getBalance(
							toolkit,
							address,
							assets[1]
						),
					];
			}
		}

		return null;
	};

	const checkSufficientBalance = (
		userBalance: Amount,
		requiredAmount: Amount
	): boolean => {
		if (userBalance.length === requiredAmount.length)
			throw Error("Error: balance check asset pair mismatch");
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
						"Balance issue , during suffucientcy check"
					);
			}
		);
		const hasSufficientBalance: boolean = checks.reduce(
			(accumulator, currentValue) =>
				accumulator === currentValue,
			true
		);

		return hasSufficientBalance;
	};
	type MaybeTransaction = Transaction | undefined | null;
	type AmountCheck =
		| [Amount, MaybeTransaction, boolean]
		| [null, null, false];

	const updateBalance = useCallback(async (id: string): Promise<boolean> => {
		var updated = false;
		withTransactionAsync(
			id,
			async (oldTransaction: MaybeTransaction) => {
				var updated = false;
				if (oldTransaction) {
					await getBalanceOfAssets(
						oldTransaction.sendAsset
					)
						.then(
							(
								sendAssetBalance: Amount | null
							) => {
								if (
									sendAssetBalance
								) {
									oldTransaction.sendAssetBalance =
										sendAssetBalance;
									updated =
										true;
								}
								return getBalanceOfAssets(
									oldTransaction.sendAsset
								);
							}
						)
						.then(
							(
								receiveAssetBalance: Amount | null
							) => {
								if (
									receiveAssetBalance
								) {
									oldTransaction.receiveAssetBalance =
										receiveAssetBalance;
									updated =
										true;
								}
							}
						);
				}
				return null;
			}
		);
		return updated;
	}, []);
	const updateAmount = useCallback(
		async (
			id: string,
			assets: AssetOrAssetPair,
			kind: SendOrRecieve,
			amountUpdate?: Amount,
			slippageUpdate?: number
		): Promise<boolean> => {
			const update: EditTransactionAsync = async (
				oldTransaction: MaybeTransaction
			) => {
				return await getBalanceOfAssets(assets)
					.then((userBalance: Amount | null) => {
						if (
							userBalance &&
							amountUpdate
						) {
							const checkBalance: boolean =
								kind === "Send"
									? checkSufficientBalance(
											userBalance,
											amountUpdate
									  )
									: true;

							return [
								userBalance,
								fetchTransaction(
									id
								),
								checkBalance,
							] as AmountCheck;
						}
						return [
							null,
							null,
							false,
						] as AmountCheck;
					})
					.then((checkedBalance: AmountCheck) => {
						if (
							checkedBalance[0] &&
							checkedBalance[1] &&
							amountUpdate
						) {
							switch (kind) {
								case "Send":
									checkedBalance[1].sendAmount =
										amountUpdate;

									checkedBalance[1].transactionStatus =
										checkedBalance[2]
											? TransactionStatus.PENDING
											: TransactionStatus.INSUFFICIENT_BALANCE;
									if (
										slippageUpdate
									) {
										checkedBalance[1].slippage =
											slippageUpdate;
										return checkedBalance[1];
									} else
										return checkedBalance[1];
								case "Receive":
									checkedBalance[1].receiveAmount =
										amountUpdate;
									if (
										slippageUpdate
									) {
										checkedBalance[1].slippage =
											slippageUpdate;
										return checkedBalance[1];
									} else
										return checkedBalance[1];
							}
						}

						return null;
					})
					.catch((error) => {
						return null;
					});
			}; //
			withTransactionAsync(id, update);
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

	useEffect(() => {
		const interval = setInterval(() => {
			console.log("This will run every second!");
		}, 5000);
		return () => clearInterval(interval);
	}, []);

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
		isReady: isReady(walletStatus),
		transactions,
		initialiseTransaction,
		updateBalance,
		updateAmount,
		fetchTransaction,
		disconnect,
	};

	return (
		<WalletContext.Provider value={walletInfo}>
			{props.children}
		</WalletContext.Provider>
	);
}
