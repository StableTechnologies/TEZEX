import { BigNumber } from "bignumber.js";
import { getAsset, getDex } from "../constants";
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
} from "../types/general";

import { TezosToolkit } from "@taquito/taquito";
import { balanceBuilder } from "../functions/util";
import {
	estimateTokensFromXtz,
	estimateXtzFromToken,
	xtzToToken,
	tokenToXtz,
	estimateShares,
} from "../functions/liquidityBaking";

export async function estimate(
	transaction: Transaction,
	toolkit: TezosToolkit
): Promise<Transaction> {
	console.log('\n','estimate got transaction : ', transaction,'\n'); 
	const { sendAmount, sendAsset, receiveAsset } = transaction;
	const dex = getDex(transaction);
	switch (transaction.component) {
		case TransactingComponent.SWAP:
			return await estimateTokensReceivedSwap(
				sendAsset[0],
				sendAmount[0],
				receiveAsset[0],
				dex,
				toolkit
			)
				.then((balance: Balance) => {
					return {
						...transaction,
						receiveAmount: [
							balance,
						] as Amount,
					};
				})
				.catch((e) => {
					throw e;
				});
		case TransactingComponent.ADD_LIQUIDITY:
			if (sendAsset[1]) {
				return await estimateTokensReceivedSwap(
					sendAsset[0],
					sendAmount[0],
					sendAsset[1],
					dex,
					toolkit
				)
					.then(async (secondTokenEstimate: Balance) => {
						const shares: Balance =
							await estimateSharesReceivedAddLiqudity(
								sendAsset,
								receiveAsset,
								[sendAmount[0],secondTokenEstimate ],
								dex,
								toolkit
							);
						return [
							secondTokenEstimate,
							shares,
						] as [Balance, Balance];
					})
					.then((balances: [Balance, Balance]) => {
						return {
							...transaction,
							sendAmount: [
								transaction
									.sendAmount[0],
								balances[0],
							] as Amount,
							receiveAmount: [
								balances[1],
							] as Amount,
						};
					})
					.catch((e) => {
						throw e;
					});
			} else throw Error("second asset not supplied for Add Liquidity");
		case TransactingComponent.REMOVE_LIQUIDITY:
			throw Error("todo");
	}
}

export const estimateTokensReceivedSwap = async (
	sendToken: Asset,
	sendAmount: Balance,
	receive: Asset,
	dex: string,
	toolkit: TezosToolkit
): Promise<Balance> => {
	switch (sendToken.name) {
		case TokenKind.XTZ:
			return await estimateTokensFromXtz(
				sendAmount.mantissa,
				dex,
				toolkit
			)
				.then((amt: number) => {
					return balanceBuilder(
						amt,
						receive,
						true
					);
				})
				.catch((e) => {
					throw e;
				});
		case TokenKind.TzBTC:
			return await estimateXtzFromToken(
				sendAmount.mantissa,
				dex,
				toolkit
			)
				.then((amt: number) => {
					return balanceBuilder(
						amt,
						receive,
						true
					);
				})
				.catch((e) => {
					throw e;
				});
		default:
			console.log('\n','sendToken.name : ', sendToken.name,'\n'); 
			throw Error("unimplemented swap estimate");
	}
};

export const estimateSharesReceivedAddLiqudity = async (
	sendAsset: AssetOrAssetPair,
	receive: AssetOrAssetPair,
	sendAmount: Amount,
	dex: string,
	toolkit: TezosToolkit
): Promise<Balance> => {
	if (sendAsset[0] && sendAmount[1] && sendAsset[1]) {
		switch ([sendAsset[0].name as string, sendAsset[1].name as string].join(' ')) {
			case [TokenKind.XTZ as string, TokenKind.TzBTC as string].join(' '):
				return await estimateShares(
					sendAmount[0].mantissa,
					sendAmount[1].mantissa,
					dex,
					toolkit
				)
					.then((amt: BigNumber) => {
						return balanceBuilder(
							amt,
							receive[0],
							true
						);
					})
					.catch((e) => {
						throw e;
					});
			case [TokenKind.TzBTC as string, TokenKind.XTZ as string].join(' '):
				return await estimateShares(
					sendAmount[1].mantissa,
					sendAmount[0].mantissa,
					dex,
					toolkit
				)
					.then((amt: BigNumber) => {
						return balanceBuilder(
							amt,
							receive[0],
							true
						);
					})
					.catch((e) => {
						throw e;
					});
			default:

			console.log('\n','sendAsset[0].name : ', sendAsset[0].name,'\n'); 
			console.log('\n','sendAsset[1].name : ', sendAsset[1].name,'\n'); 
				throw Error("unimplemented swap estimate");
		}
	} else
		throw Error(
			"Asset Pair required for Adding liquidity , recieved single asset"
		);
};
/*
			


		const shares = async () => {
			if (inputAmountMantissa && walletInfo) {
				switch (inToken) {
					case TokenKind.XTZ:
						setShares(
							await estimateShares(
								new BigNumber(
									inputAmountMantissa
								),
								new BigNumber(
									outputAmountMantissa
								),
								networkInfo
									.addresses
									.tzbtc
									.dex
									.sirius,
								walletInfo
							)
						);
						break;
					case TokenKind.TzBTC:
						setShares(
							await estimateShares(
								new BigNumber(
									outputAmountMantissa
								),
								new BigNumber(
									inputAmountMantissa
								),
								networkInfo
									.addresses
									.tzbtc
									.dex
									.sirius,
								walletInfo
							)
						);
			if (inputAmountMantissa) {
				console.log(
					"\n",
					"inputAmountMantissa : ",
					inputAmountMantissa.toString(),
					"\n"
				);
			}
			if (inputAmountMantissa && walletInfo) {
				switch (inToken) {
					case TokenKind.XTZ:
						setOutputAmountMantissa(
							await estimateTokensFromXtz(
								new BigNumber(
									inputAmountMantissa
								),
								networkInfo
									.addresses
									.tzbtc
									.dex
									.sirius,
								walletInfo
							)
						);
						break;
					case TokenKind.TzBTC:
						setOutputAmountMantissa(
							await estimateXtzFromToken(
								new BigNumber(
									inputAmountMantissa
								),
								networkInfo
									.addresses
									.tzbtc
									.dex
									.sirius,
								walletInfo
							)
						);
						break;
				}
			*/
