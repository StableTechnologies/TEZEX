import { BigNumber } from "bignumber.js";
import {
  Asset,
  Balance,
  Errors,
  CompletionRecord,
  CompletionState,
} from "../types/general";

import { tokenDecimalToMantissa, tokenMantissaToDecimal } from "./scaling";

export const shorten = (first: number, last: number, str: string) => {
  return str.substring(0, first) + "..." + str.substring(str.length - last);
};

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
    ? tokenMantissaToDecimal(value, asset)
    : new BigNumber(value);
  const mantissa: BigNumber = isMantissa
    ? new BigNumber(value)
    : tokenDecimalToMantissa(value, asset);
  const geq = (balance: Balance): boolean => {
    return mantissa.isGreaterThanOrEqualTo(balance.mantissa);
  };
  return {
    decimal,
    mantissa,
    greaterOrEqualTo: geq,
  };
};

export function toAlertableError(e: Errors): CompletionRecord | undefined {
  switch (e) {
    case Errors.TRANSACTION_FAILED:
      return [CompletionState.FAILED, { reason: e }] as CompletionRecord;
    case Errors.GAS_ESTIMATION:
      return [
        CompletionState.FAILED,
        { reason: Errors.TRANSACTION_FAILED },
      ] as CompletionRecord;
    default:
      return undefined;
  }
}
