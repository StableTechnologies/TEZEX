import { NetworkType } from "@airgap/beacon-sdk";

import {
  Asset,
  Transaction,
  TransactionQuote,
  TransactionStatus,
} from "../types/general";

export interface QuoteContext {
  account: string | null;
  network: NetworkType;
  chainId: string;
}

export interface QuoteRequest {
  transactionId: string;
  revision: number;
  inputFingerprint: string;
}

const assetFingerprint = (asset: Asset) => ({
  name: asset.name,
  type: asset.type,
  address: asset.address,
  tokenId: asset.tokenId ?? null,
  decimals: asset.decimals,
});

const amountFingerprint = (transaction: Transaction) =>
  transaction.sendAmount.map((amount) => amount.mantissa.toFixed());

const receiveFingerprint = (transaction: Transaction) =>
  transaction.receiveAmount.map((amount) => amount.mantissa.toFixed());

export const createQuoteInputFingerprint = (
  transaction: Transaction,
  context: QuoteContext
): string =>
  JSON.stringify({
    transactionId: transaction.id,
    component: transaction.component,
    account: context.account,
    network: context.network,
    chainId: context.chainId,
    transactionNetwork: transaction.network,
    poolId: transaction.poolId,
    sendAssets: transaction.sendAsset.map(assetFingerprint),
    receiveAssets: transaction.receiveAsset.map(assetFingerprint),
    sendAmounts: amountFingerprint(transaction),
    slippage: transaction.slippage,
  });

export const createQuoteResultFingerprint = (
  transaction: Transaction,
  context: QuoteContext
): string =>
  JSON.stringify({
    input: createQuoteInputFingerprint(transaction, context),
    receiveAmounts: receiveFingerprint(transaction),
  });

export const createQuoteRequest = (
  transaction: Transaction,
  context: QuoteContext,
  revision: number
): QuoteRequest => ({
  transactionId: transaction.id,
  revision,
  inputFingerprint: createQuoteInputFingerprint(transaction, context),
});

export const quoteRequestMatches = (
  transaction: Transaction | undefined,
  context: QuoteContext,
  request: QuoteRequest
): transaction is Transaction =>
  Boolean(
    transaction &&
      transaction.id === request.transactionId &&
      (transaction.quoteRevision ?? 0) === request.revision &&
      createQuoteInputFingerprint(transaction, context) ===
        request.inputFingerprint
  );

export const createTransactionQuote = (
  transaction: Transaction,
  context: QuoteContext,
  revision: number,
  preparedForSubmission = false
): TransactionQuote => ({
  revision,
  inputFingerprint: createQuoteInputFingerprint(transaction, context),
  resultFingerprint: createQuoteResultFingerprint(transaction, context),
  quotedAt: new Date().toISOString(),
  preparedForSubmission,
});

export const hasFreshTransactionQuote = (
  transaction: Transaction,
  context: QuoteContext,
  requireSubmissionReady = false
): boolean =>
  Boolean(
    transaction.quote &&
      transaction.quote.revision === (transaction.quoteRevision ?? 0) &&
      transaction.quote.inputFingerprint ===
        createQuoteInputFingerprint(transaction, context) &&
      transaction.quote.resultFingerprint ===
        createQuoteResultFingerprint(transaction, context) &&
      (!requireSubmissionReady || transaction.quote.preparedForSubmission)
  );

export const applyQuoteResult = (
  currentTransaction: Transaction | undefined,
  estimatedTransaction: Transaction,
  context: QuoteContext,
  request: QuoteRequest,
  transactionStatus: TransactionStatus,
  preparedForSubmission = false
): Transaction | undefined => {
  if (!quoteRequestMatches(currentTransaction, context, request)) {
    return undefined;
  }

  const nextTransaction: Transaction = {
    ...currentTransaction,
    sendAmount: estimatedTransaction.sendAmount,
    receiveAmount: estimatedTransaction.receiveAmount,
    transactionStatus,
    lastModified: new Date(),
  };

  return {
    ...nextTransaction,
    quote: createTransactionQuote(
      nextTransaction,
      context,
      request.revision,
      preparedForSubmission
    ),
  };
};
