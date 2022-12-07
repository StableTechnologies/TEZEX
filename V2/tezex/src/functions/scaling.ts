import { BigNumber } from "bignumber.js";
import { TokenKind } from "../types/general";

export const decimals = {
	XTZ: 6,
	TzBTC: 8,
};

export function tokenMantissaToDecimal(mantissa: BigNumber | string,  asset: TokenKind) {
	const decimal = new BigNumber(mantissa).div(new BigNumber(10)
		.pow(decimals[asset]))

	return decimal;
}
export function tokenDecimalToMantissa(decimalAmount: BigNumber | string, asset: TokenKind) {
	const mantissa = new BigNumber(10)
		.pow(decimals[asset])
		.times(decimalAmount)
		.decimalPlaces(0, 1);

	return mantissa;
}
