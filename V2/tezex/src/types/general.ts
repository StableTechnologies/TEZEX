import { BigNumber } from "bignumber.js";

import { DAppClient, NetworkType } from "@airgap/beacon-sdk";
import { TezosToolkit } from "@taquito/taquito";

export interface Breakpoints {
  breakpoints: {
    values: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
      mobile: number;
      tablet: number;
      laptop: number;
      desktop: number;
    };
  };
}
export interface AppConfig {
  aboutRedirectUrl: string;
}

export enum Pages {
  HOME = "/",
  SWAP = "/",
  ADD_LIQUIDITY = "/liquidity",
  REMOVE_LIQUIDITY = "/liquidity/remove",
  ANALYTICS = "/analytics",
  ABOUT = "/about",
}

export enum Token {
  XTZ = "XTZ",
  TzBTC = "TzBTC",
  Sirs = "Sirs",
  USDtz = "USDtz",
  LP_XTZUSDtz = "LP_XTZUSDtz",
  USDt = "USDt",
  LP_XTZUSDt = "LP_XTZUSDt",
  BTCtz = "BTCtz",
  LP_XTZBTCtz = "LP_XTZBTCtz",
  LP_tzBTCBTCtz = "LP_tzBTCBTCtz",
  LP_USDtzUSDt = "LP_USDtzUSDt",
}

export interface Balance {
  decimal: BigNumber;
  mantissa: BigNumber;
  string: string;
  greaterOrEqualTo: (balance: Balance) => boolean;
}

export enum TokenType {
  FA12 = "FA1.2",
  FA2 = "FA2",
  XTZ = "XTZ",
}

export interface Asset {
  name: Token;
  label: string;
  logo: string;
  address: string;
  decimals: number;
  type: TokenType;
  tokenId?: number; // Only for FA2 tokens
}

export enum TransferType {
  SEND = "Send",
  RECEIVE = "Receive",
}

export interface AssetState {
  transferType: TransferType;
  amount: Balance | undefined;
  balance: Balance | undefined;
  asset: Asset;
}
export interface AssetBalance {
  balance: Balance | undefined;
  asset: Asset;
}

export enum TransactionStatus {
  INITIALIZED = "Initialized",
  UNINITIALIZED = "Uninitialized",
  ZERO_AMOUNT = "Enter Amount",
  MODIFIED = "Estimating",
  INSUFFICIENT_BALANCE = "Insufficient Balance",
  SUFFICIENT_BALANCE = "Sufficient Balance",
  INVALID_SLIPPAGE = "Check Slippage",
  PENDING = "Awaiting Wallet",
  SUBMITTED = "Confirming",
  CONFIRMATION_UNKNOWN = "Confirmation Unknown",
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
  WALLET_REJECTED = "The request was declined in your wallet.",
  INSUFFICIENT_FUNDS = "Your wallet did not have enough spendable balance to complete the transaction.",
  NETWORK_CONFIRMATION = "TEZEX did not receive confirmation from the Tezos network.",
  LB_CONTRACT_STORAGE = "An error was encountered when Querying Dex Storage",
  INTERNAL = "Internal Error",
}

export interface FailedRecord {
  reason: Errors;
  detail?: string;
  component?: TransactingComponent;
  opHash?: string;
  network?: NetworkType;
  submitted?: boolean;
  safeToRetry?: boolean;
}

export type ExecutionKit = {
  toolkit: TezosToolkit;
  client: DAppClient;
};

export interface SuccessRecord {
  opHash: string;
  tx: Transaction;
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
  poolId: string;
  sendAsset: AssetOrAssetPair;
  sendAmount: Amount;
  sendAssetBalance: Amount;
  receiveAsset: AssetOrAssetPair;
  receiveAmount: Amount;
  slippage: number;
  receiveAssetBalance: Amount;
  transactionStatus: TransactionStatus;
  operationHash?: string;
  lastModified: Date;
  locked: boolean;
}

export interface LiquidityBakingStorageXTZ {
  xtzPool: BigNumber;
  tokenPool: BigNumber;
  lqtTotal: BigNumber;
}
