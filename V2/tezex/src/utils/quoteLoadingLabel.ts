export const getQuoteLoadingLabel = (hasReceivedQuote = false): string =>
  hasReceivedQuote ? "Updating quote" : "Fetching quote";
