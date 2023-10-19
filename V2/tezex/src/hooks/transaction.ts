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

import { debounce, eq } from "lodash";
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
}
export interface TransactionUpdate {
  sendAmount?: string;
  slippage?: string;
}
export function useTransaction(
  component: TransactingComponent
): TransactionOps {
  const wallet = useContext(WalletContext);
  const network = useNetwork();
  const [loading, setLoading] = useState<boolean>(true);
  const [assetStates, setAssetStates] = useState<AssetState[]>([]);
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

  useEffect(() => {
    if (wallet) {
      const currentTransaction = wallet.getActiveTransaction(component);
      if (currentTransaction && transaction) {
        if (
          transaction.lastModified !== currentTransaction.lastModified ||
          transaction.transactionStatus !== currentTransaction.transactionStatus
        ) {
          const _assetStates = transactionToAssetStates(currentTransaction);
          setTransaction(currentTransaction);
          console.log("transaction", transaction);
          console.log("currentTransaction", currentTransaction);
          setAssetStates(_assetStates);
          console.log("_assetStates", _assetStates);
        }
      } else if (currentTransaction && !transaction) {
        setTransaction(currentTransaction);
        const _assetStates = transactionToAssetStates(currentTransaction);
        console.log("currentTransaction", currentTransaction);
        console.log("_assetStates", _assetStates);
        setAssetStates(_assetStates);
        loading && setLoading(false);
      }
      if (update && wallet.lbContractStorage) {
        console.log(" retrying update amount");
        updateAmount(update.sendAmount, update.slippage);
      }
    }
  }, [wallet, transaction, update, loading]);

  useEffect(() => {
    if (
      transaction &&
      transaction.transactionStatus === TransactionStatus.COMPLETED
    ) {
      setTransaction(undefined);
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

  const initialize = useCallback(
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
    [wallet, component]
  );
  const swapFields = useCallback(async () => {
    if (wallet && transaction) {
      await initialize(
        transaction.receiveAsset,
        transaction.sendAsset,
        transaction.receiveAmount
      );
    }
  }, [wallet, transaction]);

  const getActiveTransaction = useCallback((): Transaction | undefined => {
    return transaction;
  }, [transaction]);

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
    [update]
  );
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

  return {
    initialize,
    swapFields,
    getActiveTransaction,
    updateAmount,
    getAsetState,
  };
}
