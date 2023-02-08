
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

import {
	tokenDecimalToMantissa,
	tokenMantissaToDecimal,
} from "./scaling";

export function tezToMutez(amount: BigNumber) {
	return amount.multipliedBy(1000000);
}
export function mutezToTez(amount: BigNumber) {
	return amount.dividedBy(1000000);
}

export const balanceGreaterOrEqualTo = (
	balance1: Balance,
	balance2: Balance
): boolean => {
	return balance1.mantissa.isGreaterThanOrEqualTo(balance2.mantissa);
};
export const balanceBuilder = (
	value: BigNumber | number | string,
	asset: Asset,
	isMantissa?: boolean
): Balance => {
	const decimal: BigNumber = isMantissa
		? tokenMantissaToDecimal(value, asset.name)
		: new BigNumber(value);
	const mantissa: BigNumber = isMantissa
		? new BigNumber(value)
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
