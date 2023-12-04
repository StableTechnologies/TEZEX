import {
  useContext,
  useCallback,
  useEffect,
  useState,
  useRef,
  useMemo,
} from "react";
import { BigNumber } from "bignumber.js";
import { WalletContext } from "../contexts/wallet";
import { useNetwork } from "../hooks/network";
import {
  balanceBuilder,
  getAssetStateByTransactionTypeAndAsset,
  transactionToAssetStates,
} from "../functions/util";
import { estimate } from "../functions/estimates";
import {
  Transaction,
  TransactionStatus,
  TransactingComponent,
  AssetOrAssetPair,
  LiquidityBakingStorageXTZ,
  AssetState,
  TransferType,
  Asset,
  Amount,
} from "../types/general";

import { debounce, eq, initial } from "lodash";
import { useDebounce } from "usehooks-ts";
export interface TransactionOps {
  initialize: (
    sendAsset: AssetOrAssetPair,
    recieveAsset: AssetOrAssetPair,
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
  transacting: boolean;
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
  },
  debug?: boolean
): TransactionOps {
  const wallet = useContext(WalletContext);
  const network = useNetwork();
  const [counter, setCounter] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [assetStates, setAssetStates] = useState<AssetState[]>([]);
  const [assetState, setAssetState] = useState<AssetState | undefined>(
    undefined
  );
  const [transacting, setTransacting] = useState<boolean>(false);
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

  const _counter = useCallback(() => {
    return counter;
  }, [counter]);

  // Callback to get active transaction from wallet
  const active = useCallback(() => {
    return wallet.getActiveTransaction(component);
  }, [wallet.getActiveTransaction, component]);

  const debouncedUpdateStateEffect = useCallback(
    (counter?: number) => {
      const currentTransaction = active();
      if (loading && currentTransaction) {
        internalUpdate(currentTransaction, loading, trackAsset);
      } else if (currentTransaction && transaction) {
        if (!eq(currentTransaction, transaction)) {
          internalUpdate(currentTransaction, loading, trackAsset);
        }
        if (update && wallet.lbContractStorage) {
          updateAmount(update.sendAmount, update.slippage);
        }
      }
    },
    [active, loading, transaction, update, trackAsset, counter]
  );
  useEffect(() => {
    setCounter((c) => c + 1);
    debouncedUpdateStateEffect(counter);
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
      sendAmount?: Amount,
      receiveAmount?: Amount,
      slippage?: number
    ): Promise<boolean> => {
      return await wallet
        .initialiseTransaction(
          component,
          sendAsset,
          receiveAsset,
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
      // variable to track if transaction was updated
      let updated = false;
      const transaction = getActiveTransaction();
      // if transaction exists and is not locked
      if (transaction && !transaction.locked) {
        // handle slippage update
        if (slippage) {
          const _slippage = new BigNumber(slippage).toNumber();
          updated =
            updated ||
            (await wallet.updateAmount(
              component,
              undefined,
              undefined,
              _slippage
            ));
        }
        // handle send amount update
        if (sendAmount) {
          if (wallet.lbContractStorage) {
            const updatedTransaction: Transaction = {
              ...transaction,
              sendAmount: !transaction.sendAmount[1]
                ? [balanceBuilder(sendAmount, transaction.sendAsset[0], false)]
                : [
                    balanceBuilder(sendAmount, transaction.sendAsset[0], false),
                    transaction.sendAmount[1],
                  ],
            };
            const _transaction: Transaction = estimate(
              updatedTransaction,
              wallet.lbContractStorage
            );
            updated = await wallet.updateAmount(
              _transaction.component,
              _transaction.sendAmount,
              _transaction.receiveAmount
            );
          }
        }
      }
      return updated;
    },
    [getActiveTransaction, wallet, component, transacting]
  );

  // exported callback to handle send amount or slippage updates to transaction in context
  const updateAmount = useCallback(
    async (sendAmount?: string, slippage?: string, caller?: string) => {
      // check if slippage or send amount is being updated
      if (sendAmount || slippage) {
        console.log(
          "!!updating amount",
          JSON.stringify({ sendAmount, slippage, caller })
        );
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

  //debounced max send amount transaction.
  const debouncedMax = useRef(
    debounce(
      async (oldTransaction: Transaction) => {
        //currently only implemented for remove liquidity
        switch (component) {
          case TransactingComponent.SWAP:
            break;
          case TransactingComponent.ADD_LIQUIDITY:
            break;
          case TransactingComponent.REMOVE_LIQUIDITY:
            await updateAmount(oldTransaction.sendAssetBalance[0].string);
            break;
        }
      },
      300,
      {
        leading: true,
        trailing: false,
      }
    )
  ).current;

  //callback to set transaction with max send amount
  const useMax = useCallback(async () => {
    const transaction = getActiveTransaction();
    // if transaction exists and send amount is not equal to send balance
    if (
      transaction &&
      !eq(
        JSON.stringify(transaction.sendAmount[0]),
        JSON.stringify(transaction.sendAssetBalance[0])
      ) &&
      !transaction.sendAssetBalance[0].decimal.isZero()
    ) {
      await updateAmount(transaction.sendAssetBalance[0].string);
    }
  }, [getActiveTransaction, updateAmount, initialize]);

  return {
    initialize,
    swapFields,
    useMax,
    getActiveTransaction,
    updateAmount,
    getAsetState,
    loading,
    transacting,
    trackedAsset: assetState,
  };
}
