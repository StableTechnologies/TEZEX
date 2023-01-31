import { BigNumber } from "bignumber.js";

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

const swap = async (
	transaction: Transaction,
	userAddress: string,
	dex: string,
	toolkit: TezosToolkit,
) => {
	switch (transaction.sendAsset[0].name) {
		case TokenKind.XTZ:
			await xtzToToken(
				transaction.sendAmount[0].mantissa,
				transaction.receiveAmount[0].mantissa,
				userAddress,
				dex,
				toolkit
			);
			break;
		case TokenKind.TzBTC:
			await tokenToXtz(
				transaction.sendAmount[0].mantissa,
				transaction.receiveAmount[0].mantissa,
				userAddress,
				dex,
				transaction.sendAsset[0].address,
				toolkit,
				transaction.slippage
			);
			break;
	}
};

//const transact = async (component, transaction, ) => {
/*
const transact = async () => {
	if (inputAmountMantissa && outputAmountMantissa && walletInfo) {
		switch (inToken) {
			case TokenKind.XTZ:
				await xtzToToken(
					new BigNumber(
						inputAmountMantissa
					),
					networkInfo.addresses.tzbtc.dex
						.sirius,
					walletInfo
				);
				break;
			case TokenKind.TzBTC:
				await tokenToXtz(
					new BigNumber(
						inputAmountMantissa
					),
					new BigNumber(
						outputAmountMantissa
					),
					networkInfo.addresses.tzbtc.dex
						.sirius,
					networkInfo.addresses.tzbtc
						.address,
					walletInfo,
					slippage ? slippage : 0
				);
		}
	}
};
*/
export const decimals = {
	XTZ: 6,
	TzBTC: 8,
	Sirius: 0,
};

export function tokenMantissaToDecimal(
	mantissa: BigNumber | number | string,
	asset: TokenKind
) {
	const decimal = new BigNumber(mantissa).div(
		new BigNumber(10).pow(decimals[asset])
	);

	return decimal;
}
export function tokenDecimalToMantissa(
	decimalAmount: BigNumber | number | string,
	asset: TokenKind
) {
	const mantissa = new BigNumber(10)
		.pow(decimals[asset])
		.times(decimalAmount)
		.decimalPlaces(0, 1);

	return mantissa;
}
