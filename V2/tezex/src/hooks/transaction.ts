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
export interface TransactionOps {
  initialize: (
    sendAsset: AssetOrAssetPair,
    recieveAsset: AssetOrAssetPair,
    sendAmount?: Amount,
    receiveAmount?: Amount,
    slippage?: number
  ) => Promise<boolean>;
  getActiveTransaction: () => Transaction | undefined;
  updateAmount: (sendAmount?: string, slippage?: string) => Promise<void>;
  swapFields: () => Promise<void>;
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

  const setDebouncedLoading = useRef(
    debounce((newLoadingState) => {
      setLoading(newLoadingState);
    }, 1000) // 300ms debounce time
  ).current;

  useEffect(() => {
    if (wallet && wallet.lbContractStorage) {
      //console.log("lbContractStorage", wallet.lbContractStorage);
    }
  }, [wallet, loading]);

  //  useEffect(() => {
  //    if (wallet && wallet.lbContractStorage) {
  //      const currentTransaction = wallet.getActiveTransaction(component);
  //      if (currentTransaction) {
  //        const _assetStates = transactionToAssetStates(currentTransaction);
  //        setAssetStates(_assetStates);
  //        setLoading(false);
  //
  //        console.log("loaded");
  //      }
  //    }
  //  }, [wallet, loading]);

  /*
  const debouncedTransactionRead = useRef(
    debounce(
      () => {
        console.log("debouncedTransactionRead");
        console.log("debouncedTransactionRead loading status", loading);
        const _transaction = wallet.getActiveTransaction(component);
        if (loading && !transaction && _transaction) {
          console.log(
            "UPDATED Init first transaction! :debouncedTransactionRead, Transaction : ",
            _transaction
          );
          setTransaction(_transaction);
          setLoading(false);
        }
        if (loading && !eq(_transaction, transaction)) {
          console.log(
            "UPDATED new Tranasaction! :debouncedTransactionRead, Transaction : ",
            _transaction
          );
          setTransaction(_transaction);
          setLoading(false);
        } else {
          console.log(
            "NOT UPDATED! : debouncedTransactionRead, _transaction : ",
            _transaction
          );
          console.log(
            "NOT UPDATED2! : debouncedTransactionRead, Transaction : ",
            transaction
          );
        }
      },
      300,
      {
        leading: true,
        trailing: false,
      }
    )
  ); // 300ms debounce time
  useEffect(() => {
    debouncedTransactionRead.current();
  }, [wallet.getActiveTransaction, transaction]);
*/
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
      debug && console.log("internalUpdate");
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

  useEffect(() => {
    debug && console.log("useEffect loading", loading);
  }, [loading]);

  useEffect(() => {
    debug && console.log("useEffect transactioni", transaction);
  }, [transaction]);

  const _counter = useCallback(() => {
    return counter;
  }, [counter]);

  // Callback to get active transaction from wallet
  const active = useCallback(() => {
    return wallet.getActiveTransaction(component);
  }, [wallet.getActiveTransaction, component]);

  const debouncedUpdateStateEffect = useCallback(
    (counter?: number) => {
      //console.log("Debounced function is executing");
      debug && console.log("debouncedUpdateStateEffect counter", counter);
      const currentTransaction = active();
      debug &&
        console.log(
          "debouncedUpdateStateEffect ,loading , current",
          loading,
          currentTransaction
        );
      if (loading && currentTransaction) {
        debug &&
          console.log(
            "debouncedUpdateStateEffect  loading && currentTransaction"
          );
        internalUpdate(currentTransaction, loading, trackAsset);
      } else if (currentTransaction && transaction) {
        if (!eq(currentTransaction, transaction)) {
          internalUpdate(currentTransaction, loading, trackAsset);
        }
        // console.log(
        //   "debouncedUpdateStateEffect lbContractStorage",
        //   wallet.lbContractStorage
        // );
        if (update && wallet.lbContractStorage) {
          debug && console.log(" retrying update amount");
          updateAmount(update.sendAmount, update.slippage);
        }
      }
    },
    [active, loading, transaction, update, trackAsset, counter]
  );
  useEffect(() => {
    //const currentTransaction = active();
    //  debug &&
    //    console.log(
    //      "useEffect update currentTransaction, counter",
    //      currentTransaction,
    //      counter
    //    );
    //   debug &&
    //     console.log("useEffect update,  loading, counter", loading, counter);
    setCounter((c) => c + 1);
    debouncedUpdateStateEffect(counter);

    //    return () => {
    //      debouncedUpdateStateEffect.current.cancel();
    //    };
  }, [wallet.getActiveTransaction, loading]);

  useEffect(() => {
    if (loading && transaction) {
      debug && console.log("useEffect loading && transaction", transaction);
      setDebouncedLoading(false);
    } else if (!transaction) {
      debug &&
        console.log("Null useEffect loading && transaction", transaction);
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
      // console.log("assetStates", assetStates);
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
          console.log("done : ", done);
          sendAmount && console.log("init sendAmount : ", sendAmount);
          // if send amount was passed, update send amount which calls estimating recieve amount
          sendAmount &&
            (await updateAmount(sendAmount[0].string, slippage?.toString()));
          //done && setLoading(false);
          // update transaction balance
          if (done && wallet.client)
            await wallet.updateTransactionBalance(component);

          // set loading to true if transaction was initialized
          done && setLoading(true);
          return done;
        });
    },
    [wallet, component]
  );
  const debouncedSwapFields = useRef(
    debounce(
      async (oldTransaction: Transaction) => {
        debug && console.log("debouncedSwapFields");
        debug &&
          console.log(
            "debouncedSwapFields receiveAsset",
            oldTransaction.receiveAsset
          );
        debug &&
          debug &&
          console.log(
            "debouncedSwapFields sendAsset",
            oldTransaction.sendAsset
          );

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
      300,
      {
        leading: true,
        trailing: false,
      }
    )
  ).current;
  const swapFields = useCallback(async () => {
    debug && console.log("swapFields");
    if (transaction) {
      await debouncedSwapFields(transaction);
    } else {
      debug && console.log("swapFields transaction is undefined", transaction);
    }
  }, [transaction, initialize]);

  const getActiveTransaction = useCallback((): Transaction | undefined => {
    return transaction;
  }, [transaction]);

  // calback to handle send amount or slippage updates to transaction in context
  const _updateAmount = useCallback(
    async (sendAmount?: string, slippage?: string): Promise<boolean> => {
      // variable to track if transaction was updated
      let updated = false;
      // if transaction exists and is not locked
      if (transaction && !transaction.locked) {
        // handle slippage update
        if (slippage) {
          const _slippage = new BigNumber(slippage).toNumber();
          console.log("_updateAmount slippage", _slippage);
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
          console.log("init _updateAmount sendAmount", sendAmount);
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
    [transaction, wallet, component, transacting]
  );

  // exported callback to handle send amount or slippage updates to transaction in context
  const updateAmount = useCallback(
    async (sendAmount?: string, slippage?: string) => {
      sendAmount && console.log("updateAmount send Amount", sendAmount);
      slippage && console.log("updateAmount slippage", slippage);
      // check if slippage or send amount is being updated
      if (sendAmount || slippage) {
        //check if update was successful
        if (await _updateAmount(sendAmount, slippage)) {
          console.log("init updateAmount updated", update);
          // if update was successful and pending update exists
          if (update) {
            debug && console.log("clearing update");
            // clear pending update if it exists
            setUpdate(undefined);
          }
        } else {
          console.log("updateAmount update failed , added pending update");
          // if update failed, add pending update
          setUpdate({ sendAmount, slippage });
        }
      }
    },
    [update, _updateAmount]
  );

  return {
    initialize,
    swapFields,
    getActiveTransaction,
    updateAmount,
    getAsetState,
    loading,
    transacting,
    trackedAsset: assetState,
  };
}
