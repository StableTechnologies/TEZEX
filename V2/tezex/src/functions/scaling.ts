import { BigNumber } from "bignumber.js";
import { TokenKind } from "../types/general";

export const decimals = {
	XTZ: 6,
	TzBTC: 8,
};

function tokenDecimalToMantissa(decimalAmount: BigNumber, asset: TokenKind) {
	const mantissa = new BigNumber(10)
		.pow(decimals[asset])
		.times(decimalAmount)
		.decimalPlaces(0, 1);
	return mantissa;
}
