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


export const estimateTokensReceivedSwap = async (
	sendToken: TokenKind,
	sendAmount: Balance,
	receive: TokenKind,
	toolkit: TezosToolkit
) => {
	const dex: string = getDex([getAsset(sendToken)], [getAsset(receive)]);

	switch (sendToken) {
		case TokenKind.XTZ:
			await estimateTokensFromXtz(
				sendAmount.mantissa,
				dex,
				toolkit
			);
			break;
		case TokenKind.TzBTC:
			await estimateXtzFromToken(
				sendAmount.mantissa,
				dex,
				toolkit
			);
			break;
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
};
