import { BigNumber } from "bignumber.js";

import { NetworkType } from "@airgap/beacon-sdk";

export interface AppConfig {
  aboutRedirectUrl: string;
}

export enum Token {
  XTZ = "XTZ",
  TzBTC = "TzBTC",
  Sirs = "Sirs",
}

export interface Balance {
  decimal: BigNumber;
  mantissa: BigNumber;
  greaterOrEqualTo: (balance: Balance) => boolean;
}

export interface Asset {
  name: Token;
  label: string;
  logo: string;
  address: string;
  decimals: number;
}

export interface AssetBalance {
  balance: Balance | undefined;
  asset: Asset;
}

export enum TransactionStatus {
  INITIALISED = "Initialised",
  MODIFIED = "Estimating",
  INSUFFICIENT_BALANCE = "Insufficient Balance",
  SUFFICIENT_BALANCE = "Sufficient Balance",
  PENDING = "In Progress",
  COMPLETED = "Completed",
  FAILED = "Failed",
}

export enum TransactingComponent {
  SWAP = "Swap",
  ADD_LIQUIDITY = "Add Liquidity",
  REMOVE_LIQUIDITY = "Remove Liquidity",
}

export type Id = string;

export type SendOrRecieve = "Send" | "Receive";
export type Amount = [Balance] | [Balance, Balance];
export type AssetOrAssetPair = [Asset] | [Asset, Asset];

export enum CompletionState {
  SUCCESS = "Transaction Complete!",
  FAILED = "Error",
}

export enum Errors {
  GAS_ESTIMATION = "Failed during estimating fee, gas and storage limit.",
  GENERAL = "Network Issues",
  TRANSACTION_FAILED = "An error occurred that prevented the transaction from completing. Please try again. ",
  SLIPPAGE = " This transaction will not succeed due to the network price movement. You can try increasing your slippage percentage.",
  LB_CONTRACT_STORAGE = "An error was encountered when Querying Dex Storage",
  INTERNAL = "Internal Error",
}

export interface FailedRecord {
  reason: Errors;
}

export interface SuccessRecord {
  opHash: string;
}
export type CompletionRecord =
  | [CompletionState.FAILED, FailedRecord]
  | [CompletionState.SUCCESS, SuccessRecord];

export enum Assets {
  ASSET = 1,
  PAIR = 2,
}

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

export interface LiquidityBakingStorageXTZ {
  xtzPool: BigNumber;
  tokenPool: BigNumber;
  lqtTotal: BigNumber;
}
