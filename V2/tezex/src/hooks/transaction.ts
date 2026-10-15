import { useContext, useCallback, useEffect, useMemo } from "react";
import { BigNumber } from "bignumber.js";
import { WalletContext } from "../contexts/wallet";
import {
  balanceBuilder,
  getAssetStateByTransactionTypeAndAsset,
  transactionToAssetStates,
} from "../functions/util";
import {
  Transaction,
  TransactionStatus,
  TransactingComponent,
  AssetOrAssetPair,
  AssetState,
  TransferType,
  Asset,
  Amount,
  Token,
} from "../types/general";

import {
  getSlippageValidationMessage,
  getSpendableXtz,
} from "../functions/transactionSafety";

export interface TransactionOps {
  initialize: (
    sendAsset: AssetOrAssetPair,
    recieveAsset: AssetOrAssetPair,
    poolId: string,
    sendAmount?: Amount,
    receiveAmount?: Amount,
    slippage?: number
  ) => Promise<boolean>;
  getActiveTransaction: () => Transaction | undefined;
  updateAmount: (
    sendAmount?: string,
    slippage?: string,
    caller?: string
  ) => Promise<void>;
  swapFields: () => Promise<void>;
  useMax: () => Promise<void>;
  getAsetState: (
    transferType: TransferType,
    asset: Asset
  ) => AssetState | undefined;
  loading: boolean;
  trackedAsset: AssetState | undefined;
}
export interface TransactionUpdate {
  sendAmount?: string;
  slippage?: string;
}
export function useTransaction(
  component: TransactingComponent,
  trackAsset?: {
    transferType: TransferType;
    asset: Asset;
  }
): TransactionOps {
  const wallet = useContext(WalletContext);
  // Read the current snapshot on every context render. A stable getter is not
  // a subscription: copying its result into effect-managed state misses resets
  // and quote updates when the getter identity does not change.
  const transaction = wallet.getActiveTransaction(component);
  const loading = !transaction;
  const assetStates = useMemo(
    () => (transaction ? transactionToAssetStates(transaction) : []),
    [transaction]
  );
  const assetState = trackAsset
    ? getAssetStateByTransactionTypeAndAsset(
        trackAsset.transferType,
        trackAsset.asset,
        assetStates
      )
    : undefined;
  const getActiveTransaction = useCallback(
    () => wallet.getActiveTransaction(component),
    [wallet.getActiveTransaction, component]
  );

  useEffect(() => {
    if (
      transaction &&
      transaction.transactionStatus === TransactionStatus.COMPLETED
    ) {
      initialize(
        transaction.sendAsset,
        transaction.receiveAsset,
        transaction.poolId,
        undefined,
        undefined,
        transaction.slippage
      );
    }
  }, [transaction]);

  // Callback to get asset state from transaction in context
  const getAsetState = useCallback(
    (transferType: TransferType, asset: Asset): AssetState | undefined => {
      return getAssetStateByTransactionTypeAndAsset(
        transferType,
        asset,
        assetStates
      );
    },
    [assetStates]
  );

  // callback to initialize transaction in context
  const initialize = useCallback(
    async (
      sendAsset: AssetOrAssetPair,
      receiveAsset: AssetOrAssetPair,
      poolId: string,
      sendAmount?: Amount,
      receiveAmount?: Amount,
      slippage?: number
    ): Promise<boolean> => {
      return await wallet
        .initialiseTransaction(
          component,
          sendAsset,
          receiveAsset,
          poolId,
          sendAmount,
          receiveAmount,
          slippage
        )
        .then(async (done) => {
          // update transaction balance
          if (done && wallet.client)
            await wallet.updateTransactionBalance(component);

          return done;
        });
    },
    [
      wallet.initialiseTransaction,
      wallet.updateTransactionBalance,
      wallet.client,
      component,
    ]
  );
  const debouncedSwapFields = useCallback(
    async (oldTransaction: Transaction) => {
      //setLoading(true);
      switch (component) {
        case TransactingComponent.SWAP:
          await initialize(
            oldTransaction.receiveAsset,
            oldTransaction.sendAsset,
            oldTransaction.poolId,
            oldTransaction.receiveAmount,
            undefined,
            oldTransaction.slippage
          );
          break;
        case TransactingComponent.ADD_LIQUIDITY:
          if (oldTransaction.sendAmount[1] && oldTransaction.sendAsset[1]) {
            await initialize(
              [oldTransaction.sendAsset[1], oldTransaction.sendAsset[0]],
              oldTransaction.receiveAsset,
              oldTransaction.poolId,
              [oldTransaction.sendAmount[1], oldTransaction.sendAmount[0]],
              oldTransaction.receiveAmount,
              oldTransaction.slippage
            );
          }
          break;
        case TransactingComponent.REMOVE_LIQUIDITY:
          break;
      }
    },
    [initialize, component]
  );
  const swapFields = useCallback(async () => {
    const transaction = getActiveTransaction();
    if (transaction) {
      await debouncedSwapFields(transaction);
    }
  }, [getActiveTransaction, debouncedSwapFields, initialize]);

  // calback to handle send amount or slippage updates to transaction in context
  const _updateAmount = useCallback(
    async (
      sendAmount?: string,
      slippage?: string,
      debounceMs = 0
    ): Promise<boolean> => {
      const transaction = getActiveTransaction();
      if (!transaction || transaction.locked) return false;

      let slippageUpdate: number | undefined;
      if (slippage !== undefined) {
        const validationMessage = getSlippageValidationMessage(slippage);
        if (validationMessage) {
          await wallet.invalidateTransactionQuote(
            component,
            TransactionStatus.INVALID_SLIPPAGE,
            slippage
          );
          return true;
        }
        slippageUpdate = new BigNumber(slippage).toNumber();
      }

      const sendAmountUpdate =
        sendAmount !== undefined
          ? ((!transaction.sendAmount[1]
              ? [
                  balanceBuilder(
                    sendAmount || "0",
                    transaction.sendAsset[0],
                    false
                  ),
                ]
              : [
                  balanceBuilder(
                    sendAmount || "0",
                    transaction.sendAsset[0],
                    false
                  ),
                  transaction.sendAmount[1],
                ]) as Amount)
          : undefined;

      return wallet.refreshTransactionQuote(
        component,
        sendAmountUpdate,
        slippageUpdate,
        debounceMs
      );
    },
    [getActiveTransaction, wallet, component]
  );

  // exported callback to handle send amount or slippage updates to transaction in context
  const updateAmount = useCallback(
    async (sendAmount?: string, slippage?: string, caller?: string) => {
      if (sendAmount !== undefined || slippage !== undefined) {
        // A failed quote is surfaced through the transaction status. Retrying
        // here on every wallet-context render creates an unbounded RPC loop and
        // prevents the amount fields from settling. A later user edit or an
        // explicit submission attempt will request a fresh quote.
        await _updateAmount(
          sendAmount,
          slippage,
          caller === "tokenInput" || caller === "slippageInput" ? 500 : 0
        );
      }
    },
    [_updateAmount]
  );

  //callback to set transaction with max send amount
  const useMax = useCallback(async () => {
    const transaction = getActiveTransaction();
    if (transaction && !transaction.sendAssetBalance[0].decimal.isZero()) {
      const maxAmount =
        transaction.sendAsset[0].name === Token.XTZ
          ? getSpendableXtz(transaction.sendAssetBalance[0].decimal).toFixed()
          : transaction.sendAssetBalance[0].string;
      if (!transaction.sendAmount[0].decimal.eq(maxAmount)) {
        await updateAmount(maxAmount);
      }
    }
  }, [getActiveTransaction, updateAmount]);

  return {
    initialize,
    swapFields,
    useMax,
    getActiveTransaction,
    updateAmount,
    getAsetState,
    loading,
    trackedAsset: assetState,
  };
}
