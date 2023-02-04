import { BigNumber } from "bignumber.js";
import {getAsset} from "../constants"
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
import {
	balanceBuilder,
} from "../functions/util";
import {
	estimateTokensFromXtz,
	estimateXtzFromToken,
	xtzToToken,
	tokenToXtz,
} from "../functions/liquidityBaking";

const getDex = (
	send: AssetOrAssetPair,
	receive?: AssetOrAssetPair,
): string => {
	const sirius = "KT1TxqZ8QtKvLu3V3JH7Gx58n7Co8pgtpQU5";
	return sirius;
	//Todo
	/* 
	const sendAssets: TokenKind[] = Array.from(send, s => s.name);
	const reciveAssets: TokenKind[] = Array.from(send, s => s.name);
	
	
	switch (sendAssets) {
		case [TokenKind.XTZ] : return "";
		default:
			throw Error("Dex not found for assets");
	}
	*/
};


export async function estimate(transaction: Transaction, toolkit: TezosToolkit): Promise<Transaction> {
	const {sendAmount,sendAsset,receiveAsset} = transaction
	switch(transaction.component){
				case TransactingComponent.SWAP:
			return await estimateTokensReceivedSwap(sendAsset[0],sendAmount[0],receiveAsset[0],toolkit).then((
				balance: Balance
			) => { return {...transaction,receiveAmount: [balance] as Amount }}).catch((e)=>{ throw e})
				case TransactingComponent.ADD_LIQUIDITY:
					throw Error("todo");
				case TransactingComponent.REMOVE_LIQUIDITY:
					throw Error("todo");
			}
	}
	
export const estimateTokensReceivedSwap = async (
	sendToken: Asset,
	sendAmount: Balance,
	receive: Asset,
	toolkit: TezosToolkit
): Promise<Balance> => {
	const dex: string = getDex([getAsset(sendToken.name)], [getAsset(receive.name)]);

	switch (sendToken.name) {
		case TokenKind.XTZ:
			return await estimateTokensFromXtz(
				sendAmount.mantissa,
				dex,
				toolkit
			).then((amt: number) => {
				return balanceBuilder(amt,receive,true)
   
			}).catch((e) =>{throw e})
		case TokenKind.TzBTC:
			return await estimateXtzFromToken(
				sendAmount.mantissa,
				dex,
				toolkit
			).then((amt: number) => {
				return balanceBuilder(amt,receive,true)
			}).catch((e) =>{throw e})
		default: throw Error("unimplemented swap estimate");
	}
}
	/*
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
