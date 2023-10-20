import { useContext, useCallback, useEffect, useState, useRef } from "react";
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
  trackedAsset: AssetState | undefined;
}
export interface TransactionUpdate {
  sendAmount?: string;
  slippage?: string;
}
export function useTransaction(
  component: TransactingComponent,
  trackAsset?: {
    transFerType: TransferType;
    asset: Asset;
  }
): TransactionOps {
  const wallet = useContext(WalletContext);
  const network = useNetwork();
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

  const debouncedTransactionRead = useRef(
    debounce(
      () => {
        const _transaction = wallet.getActiveTransaction(component);
        if (!eq(_transaction, transaction)) {
          setTransaction(_transaction);
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

  const debouncedUpdateStateEffect = useRef(
    debounce(
      () => {
        const currentTransaction = wallet.getActiveTransaction(component);
        if (currentTransaction && transaction) {
          if (
            transaction.lastModified !== currentTransaction.lastModified ||
            transaction.transactionStatus !==
              currentTransaction.transactionStatus
          ) {
            const _assetStates = transactionToAssetStates(currentTransaction);
            setTransaction(currentTransaction);
            console.log("transaction", transaction);
            console.log("currentTransaction", currentTransaction);
            setAssetStates(_assetStates);
            console.log("_assetStates", _assetStates);
          }
        } else if (currentTransaction && !eq(currentTransaction, transaction)) {
          setTransaction(currentTransaction);
          const _assetStates = transactionToAssetStates(currentTransaction);
          console.log("currentTransaction", currentTransaction);
          console.log("_assetStates", _assetStates);
          setAssetStates(_assetStates);
          if (trackAsset) {
            setAssetState(
              getAssetStateByTransactionTypeAndAsset(
                trackAsset.transFerType,
                trackAsset.asset,
                _assetStates
              )
            );
          }
          loading && setLoading(false);
        }
        if (update && wallet.lbContractStorage) {
          console.log(" retrying update amount");
          updateAmount(update.sendAmount, update.slippage);
        }
      },
      300,
      {
        leading: true,
        trailing: false,
      }
    )
  );
  useEffect(() => {
    debouncedUpdateStateEffect.current();
    return () => {
      debouncedUpdateStateEffect.current.cancel();
    };
  }, [wallet, transaction, update, loading]);

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

  const getAsetState = useCallback(
    (transferType: TransferType, asset: Asset): AssetState | undefined => {
      console.log("assetStates", assetStates);
      return getAssetStateByTransactionTypeAndAsset(
        transferType,
        asset,
        assetStates
      );
    },
    [assetStates]
  );

  const debounceInitialize = useRef(
    debounce(
      async (
        sendAsset: AssetOrAssetPair,
        receiveAsset: AssetOrAssetPair,
        sendAmount?: Amount,
        receiveAmount?: Amount,
        slippage?: number
      ): Promise<boolean> => {
        let initialized = false;
        const initializedWithBalanceUpdate: boolean = await wallet
          .initialiseTransaction(
            component,
            sendAsset,
            receiveAsset,
            sendAmount,
            receiveAmount,
            slippage
          )
          .then((done) => {
            initialized = done;
            if (done && wallet.client)
              return wallet.updateTransactionBalance(component);
            return false;
          });
        return initialized;
      },
      300,
      {
        leading: true,
        trailing: false,
      }
    )
  );

  const initialize = useCallback(
    async (
      sendAsset: AssetOrAssetPair,
      receiveAsset: AssetOrAssetPair,
      sendAmount?: Amount,
      receiveAmount?: Amount,
      slippage?: number
    ): Promise<boolean> => {
      return await debounceInitialize.current(
        sendAsset,
        receiveAsset,
        sendAmount,
        receiveAmount,
        slippage
      );
    },
    [wallet, component]
  );
  const debouncedSwapFields = useRef(
    debounce(
      async (oldTransaction: Transaction) => {
        await initialize(
          oldTransaction.receiveAsset,
          oldTransaction.sendAsset,
          oldTransaction.receiveAmount
        );
      },
      300,
      {
        leading: true,
        trailing: false,
      }
    )
  );
  const swapFields = useCallback(async () => {
    if (transaction) {
      await debouncedSwapFields.current(transaction);
    }
  }, [transaction]);

  const getActiveTransaction = useCallback((): Transaction | undefined => {
    return transaction;
  }, [transaction]);

  const _updateAmount = useCallback(
    async (sendAmount?: string, slippage?: string): Promise<boolean> => {
      let updated = false;
      if (transaction && !transaction.locked) {
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
            updated =
              updated ||
              (await wallet.updateAmount(
                _transaction.component,
                _transaction.sendAmount,
                _transaction.receiveAmount
              ));
          }
        }
        if (
          slippage &&
          transaction &&
          !transaction.locked &&
          !new BigNumber(transaction.slippage).eq(slippage)
        ) {
          updated =
            updated ||
            (await wallet.updateAmount(
              component,
              undefined,
              undefined,
              new BigNumber(slippage).toNumber()
            ));
        }
      }
      return updated;
    },
    [transaction, wallet, component, transacting]
  );
  const debouncedUpdateAmount = useRef(
    debounce(
      async (sendAmount, slippage) => {
        if (sendAmount || slippage) {
          if (await _updateAmount(sendAmount, slippage)) {
            if (update) {
              console.log("clearing update");
              // clear pending update if it exists
              setUpdate(undefined);
            }
          } else {
            console.log("update failed , added pending update");

            setUpdate({ sendAmount, slippage });
          }
        }
      },
      500,
      {
        leading: true,
        trailing: false,
      }
    )
  ); // 300ms debounce time

  const updateAmount = useCallback(
    async (sendAmount?: string, slippage?: string) => {
      debouncedUpdateAmount.current(sendAmount, slippage);
    },
    [update, _updateAmount]
  );

  return {
    initialize,
    swapFields,
    getActiveTransaction,
    updateAmount,
    getAsetState,
    trackedAsset: assetState,
  };
}
