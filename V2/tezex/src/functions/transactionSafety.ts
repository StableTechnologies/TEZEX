import BigNumber from "bignumber.js";

import { TransactionStatus } from "../types/general";

export const MIN_SLIPPAGE_PERCENT = 0.1;
export const MAX_SLIPPAGE_PERCENT = 5;
export const HIGH_SLIPPAGE_PERCENT = 1;

// Keep enough tez available for a multi-operation wallet batch. The wallet
// still estimates the exact fee; this reserve prevents a "Max" amount from
// consuming every spendable mutez before that fee is applied.
export const XTZ_FEE_RESERVE_TEZ = new BigNumber("0.05");

// A quote is protected by its minimum output, so a longer deadline does not
// weaken slippage protection. Ten minutes gives mobile wallets enough time to
// hand off, review, and return without routinely expiring the operation.
export const TRANSACTION_DEADLINE_MS = 10 * 60 * 1000;

export const isValidSlippage = (value: number): boolean =>
  Number.isFinite(value) &&
  value >= MIN_SLIPPAGE_PERCENT &&
  value <= MAX_SLIPPAGE_PERCENT;

export const shouldApplyTransactionStatus = (
  currentStatus: TransactionStatus,
  nextStatus: TransactionStatus
): boolean => currentStatus !== nextStatus;

export const getStatusAfterBalanceCheck = (
  currentStatus: TransactionStatus,
  balanceStatus: TransactionStatus
): TransactionStatus =>
  currentStatus === TransactionStatus.INVALID_SLIPPAGE
    ? currentStatus
    : balanceStatus;

export const shouldApplySlippageUpdate = (
  currentSlippage: number,
  nextSlippage: number,
  currentStatus: TransactionStatus
): boolean =>
  isValidSlippage(nextSlippage)
    ? currentSlippage !== nextSlippage ||
      currentStatus === TransactionStatus.INVALID_SLIPPAGE
    : currentStatus !== TransactionStatus.INVALID_SLIPPAGE;

export const getSpendableXtz = (
  balance: BigNumber,
  reserve = XTZ_FEE_RESERVE_TEZ
): BigNumber => BigNumber.maximum(balance.minus(reserve), 0);

export const getSlippageValidationMessage = (
  value: string
): string | undefined => {
  if (!value.trim()) return "Enter a slippage tolerance.";

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "Enter a valid slippage tolerance.";
  }
  if (numericValue < MIN_SLIPPAGE_PERCENT) {
    return `Use at least ${MIN_SLIPPAGE_PERCENT}% slippage.`;
  }
  if (numericValue > MAX_SLIPPAGE_PERCENT) {
    return `For safety, slippage is capped at ${MAX_SLIPPAGE_PERCENT}%.`;
  }

  return undefined;
};
