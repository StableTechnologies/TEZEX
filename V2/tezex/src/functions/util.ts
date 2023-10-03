import { BigNumber } from "bignumber.js";
import {
  Asset,
  Balance,
  Errors,
  CompletionRecord,
  SuccessRecord,
  CompletionState,
  Breakpoints,
} from "../types/general";

import { tokenDecimalToMantissa, tokenMantissaToDecimal } from "./scaling";

export const adjustBreakpointsForDpr = (
  breakpoints: Breakpoints
): Breakpoints => {
  const dpr: number = window.devicePixelRatio || 1;
  const adjustedBreakpoints = { ...breakpoints };

  for (const [key, value] of Object.entries(breakpoints.breakpoints.values)) {
    const breakpointKey = key as keyof typeof breakpoints.breakpoints.values;

    adjustedBreakpoints.breakpoints.values[breakpointKey] = value * dpr;

    //  adjustedBreakpoints.breakpoints.values[breakpointKey] = value;
  }
  return adjustedBreakpoints;
};
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

export function completionRecordSuccess(
  success: SuccessRecord
): CompletionRecord {
  return [CompletionState.SUCCESS, success] as CompletionRecord;
}

export function completionRecordFailed(e: Errors): CompletionRecord {
  return [CompletionState.FAILED, { reason: e }] as CompletionRecord;
}

export function showAlert(
  record: CompletionRecord | undefined
): CompletionRecord | undefined {
  if (record && record[0] === CompletionState.FAILED) {
    switch (record[1].reason) {
      case Errors.TRANSACTION_FAILED:
        return record;
      case Errors.GAS_ESTIMATION:
        return [
          CompletionState.FAILED,
          { reason: Errors.TRANSACTION_FAILED },
        ] as CompletionRecord;
      default:
        return undefined;
    }
  } else return record;
}
