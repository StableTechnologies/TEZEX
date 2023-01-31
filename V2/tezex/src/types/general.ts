import { BigNumber } from "bignumber.js";

import { NetworkType } from "@airgap/beacon-sdk";

export enum TokenKind {
	XTZ = "XTZ",
	TzBTC = "TzBTC",
	Sirius = "Sirius",
}

export interface Balance {
	decimal: BigNumber;
	mantissa: BigNumber;
	greaterOrEqualTo: (balance: Balance) => boolean 
}
export interface Asset {
	name: TokenKind;
	label: string;
	logo: string;
	address: string;
}


export enum TransactionStatus {
	INITIALISED = "Initialised",
	MODIFIED = "Modified",
	INSUFFICIENT_BALANCE = "Insufficient Balance",
	PENDING = "Pending",
	COMPLETED = "Completed",
	FAILED = "Failed",
}

export enum TransactingComponent {
	SWAP = "Swap",
	ADD_LIQUIDITY = "Add Liquidity",
	REMOVE_LIQUIDITY = "Remove Liquidity",
}

export type Id = string;

export type Amount = [Balance] | [Balance, Balance];
export type AssetOrAssetPair = [Asset] | [Asset, Asset];

export interface Transaction {
	id: Id;
	network: NetworkType;
	component: TransactingComponent;
	sendAsset: AssetOrAssetPair;
	sendAmount: Amount;
	sendAssetBalance: Amount;
	receiveAsset: AssetOrAssetPair;
	receiveAmount: Amount;
	slippage: number;
	receiveAssetBalance: Amount;
	transactionStatus: TransactionStatus;
	lastModified: Date;
}
