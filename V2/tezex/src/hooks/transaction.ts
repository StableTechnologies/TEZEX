import { useContext, useCallback, useEffect, useState, useRef } from "react";
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

import { debounce, eq } from "lodash";
import { useDebounce } from "usehooks-ts";
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
  const [counter, setCounter] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [assetStates, setAssetStates] = useState<AssetState[]>([]);
  const [assetState, setAssetState] = useState<AssetState | undefined>(
    undefined
  );

  const [transaction, setTransaction] = useState<Transaction | undefined>(
    wallet.getActiveTransaction(component)
  );
  const [update, setUpdate] = useState<TransactionUpdate | undefined>(
    undefined
  );

  const debouncedUpdate = useDebounce(update, 500);
  const setDebouncedLoading = useRef(
    debounce((newLoadingState) => {
      setLoading(newLoadingState);
    }, 1000) // 300ms debounce time
  ).current;

  //callback to get current transaction from wallet
  const getActiveTransaction = useCallback((): Transaction | undefined => {
    return wallet.getActiveTransaction(component);
  }, [wallet.getActiveTransaction, component]);

  //Callback to load transaction and AssetStates from wallet
  const internalUpdate = useCallback(
    (
      transaction: Transaction,
      loading?: boolean,
      trackAsset?: {
        transferType: TransferType;
        asset: Asset;
      }
    ) => {
      setTransaction(transaction);

      // derive asset states from transaction
      const _assetStates = transactionToAssetStates(transaction);
      setAssetStates(_assetStates);
      // check to see if an Asset needs to be tracked
      if (trackAsset) {
        // set tracked asset state
        setAssetState(
          getAssetStateByTransactionTypeAndAsset(
            trackAsset.transferType,
            trackAsset.asset,
            _assetStates
          )
        );
      }
    },
    [transaction, loading, trackAsset]
  );

  // Callback to get active transaction from wallet
  const active = useCallback(() => {
    return wallet.getActiveTransaction(component);
  }, [wallet.getActiveTransaction, component]);

  const debouncedUpdateStateEffect = useCallback(() => {
    const currentTransaction = active();
    if (loading && currentTransaction) {
      internalUpdate(currentTransaction, loading, trackAsset);
    } else if (currentTransaction && transaction) {
      if (!eq(currentTransaction, transaction)) {
        internalUpdate(currentTransaction, loading, trackAsset);
      }
      if (update && currentTransaction.poolId) {
        updateAmount(update.sendAmount, update.slippage);
      }
    }
  }, [active, loading, transaction, update, trackAsset, counter]);
  useEffect(() => {
    setCounter((c) => c + 1);
    debouncedUpdateStateEffect();
  }, [wallet.getActiveTransaction, loading]);

  useEffect(() => {
    if (loading && transaction) {
      setDebouncedLoading(false);
    }
  }, [loading, transaction]);

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

          // set loading to true if transaction was initialized
          done && setLoading(true);
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
    async (sendAmount?: string, slippage?: string): Promise<boolean> => {
      const transaction = getActiveTransaction();
      if (!transaction || transaction.locked) return false;

      let slippageUpdate: number | undefined;
      if (slippage !== undefined) {
        const validationMessage = getSlippageValidationMessage(slippage);
        if (validationMessage) {
          await wallet.invalidateTransactionQuote(
            component,
            TransactionStatus.INVALID_SLIPPAGE
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
        slippageUpdate
      );
    },
    [getActiveTransaction, wallet, component]
  );

  // exported callback to handle send amount or slippage updates to transaction in context
  const updateAmount = useCallback(
    async (sendAmount?: string, slippage?: string) => {
      // check if slippage or send amount is being updated
      if (sendAmount !== undefined || slippage !== undefined) {
        //check if update was successful
        if (await _updateAmount(sendAmount, slippage)) {
          // if update was successful and pending update exists
          if (debouncedUpdate) {
            // clear pending update if it exists
            setUpdate(undefined);
          }
        } else {
          // if update failed, add pending update
          setUpdate({ sendAmount, slippage });
        }
      }
    },
    [debouncedUpdate, _updateAmount]
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
