import { BigNumber } from "bignumber.js";
import { Asset } from "../types/general";

export function tokenMantissaToDecimal(
  mantissa: BigNumber | number | string,
  asset: Asset
) {
  const decimal = new BigNumber(mantissa).div(
    new BigNumber(10).pow(asset.decimals)
  );

  return decimal;
}
export function tokenDecimalToMantissa(
  decimalAmount: BigNumber | number | string,
  asset: Asset
) {
  const mantissa = new BigNumber(10)
    .pow(asset.decimals)
    .times(decimalAmount)
    .decimalPlaces(0, 1);

  return mantissa;
}
