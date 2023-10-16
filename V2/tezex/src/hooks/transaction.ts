import { useContext, useCallback, useEffect, useState } from "react";
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
  TranferType,
  Asset,
} from "../types/general";

export interface TransactionOps {
  initialize: (
    sendAsset: AssetOrAssetPair,
    recieveAsset: AssetOrAssetPair,
    sendAmount?: BigNumber,
    receiveAmount?: BigNumber,
    slippage?: number
  ) => Transaction | undefined;
  getActiveTransaction: () => Transaction | undefined;
  updateTransactionBalance: () => boolean;
  updateAmount: (sendAmount?: string, slippage?: string) => void;
  sendTransaction: () => Promise<void>;
  getAsetState: (
    transferType: TranferType,
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
  const [assetStates, setAssetStates] = useState<AssetState[] | undefined>(
    undefined
  );
  const [transacting, setTransacting] = useState<boolean>(false);
  const [transaction, setTransaction] = useState<Transaction | undefined>(
    wallet ? wallet.getActiveTransaction(component) : undefined
  );
  const [update, setUpdate] = useState<TransactionUpdate | undefined>(
    undefined
  );

  useEffect(() => {
    if (wallet) {
      const currentTransaction = wallet.getActiveTransaction(component);
      if (currentTransaction && transaction) {
        if (
          transaction.lastModified !== currentTransaction.lastModified ||
          transaction.transactionStatus !== currentTransaction.transactionStatus
        ) {
          setTransaction(currentTransaction);
          transactionToAssetStates(currentTransaction);
        }
      } else if (currentTransaction && !transaction) {
        setTransaction(currentTransaction);

        transactionToAssetStates(currentTransaction);
        setLoading(false);
      }
      if (update && wallet.lbContractStorage) {
        _updateAmount(update.sendAmount, update.slippage);
      }
    }
  }, [wallet, transaction, component, update]);

  useEffect(() => {
    if (
      transaction &&
      transaction.transactionStatus === TransactionStatus.COMPLETED
    ) {
      setTransaction(undefined);
    }
  }, [transaction]);

  const getAsetState = useCallback(
    (transferType: TranferType, asset: Asset): AssetState | undefined => {
      return getAssetStateByTransactionTypeAndAsset(
        transferType,
        asset,
        assetStates
      );
    },
    [assetStates]
  );

  const initialize = useCallback(
    (
      sendAsset: AssetOrAssetPair,
      receiveAsset: AssetOrAssetPair
    ): Transaction | undefined => {
      if (wallet) {
        const transaction = wallet.initialiseTransaction(
          component,
          sendAsset,
          receiveAsset
        );
        if (wallet.client) {
          wallet.updateTransactionBalance(component, transaction);
        }
        //  setTransaction(transaction);
        return transaction;
      }
      return undefined;
    },
    [wallet, component]
  );
  const swapFields = useCallback(() => {
    if (wallet && transaction) {
      const _transaction = wallet.initialiseTransaction(
        component,
        transaction.sendAsset,
        transaction.receiveAsset,
        transaction.sendAmount,
        transaction.receiveAmount
      );
      if (wallet.client) {
        wallet.updateTransactionBalance(component, transaction);
      }
    }
  }, [wallet, transaction]);

  const updateTransactionBalance = useCallback((): boolean => {
    if (
      wallet &&
      transaction &&
      transaction.transactionStatus !== TransactionStatus.PENDING &&
      !transacting
    ) {
      wallet.updateTransactionBalance(component, transaction);
      return true;
    }
    return false;
  }, [wallet, component, transaction, transacting]);

  const getActiveTransaction = useCallback((): Transaction | undefined => {
    return transaction;
  }, [transaction]);

  const sendTransaction = useCallback(async () => {
    if (wallet && transaction) {
      wallet.updateStatus(component, TransactionStatus.PENDING);
    }
  }, [wallet, component, transaction]);

  const updateAmount = useCallback(
    (sendAmount?: string, slippage?: string) => {
      if (sendAmount || slippage) {
        if (_updateAmount(sendAmount, slippage)) {
          if (update) {
            // clear pending update if it exists
            setUpdate(undefined);
          }
        } else {
          setUpdate({ sendAmount, slippage });
        }
      }
    },
    [update]
  );
  const _updateAmount = useCallback(
    (sendAmount?: string, slippage?: string): boolean => {
      if (transaction && !transacting && sendAmount) {
        if (wallet && wallet.lbContractStorage) {
          const updatedTransaction: Transaction = {
            ...transaction,
            sendAmount: !transaction.sendAmount[1]
              ? [balanceBuilder(sendAmount, transaction.sendAsset[0], false)]
              : [
                  balanceBuilder(sendAmount, transaction.sendAsset[0], false),
                  transaction.sendAmount[1],
                ],
          };
          const _transaction = estimate(
            updatedTransaction,
            wallet.lbContractStorage
          );
          wallet.updateAmount(
            _transaction.component,
            _transaction.sendAmount,
            _transaction.receiveAmount
          );
          return true;
        }
      } else if (
        slippage &&
        transaction &&
        !transacting &&
        !new BigNumber(transaction.slippage).eq(slippage)
      ) {
        if (wallet) {
          return wallet.updateAmount(
            component,
            undefined,
            undefined,
            new BigNumber(slippage).toNumber()
          );
        }
      }
      return false;
    },
    [transaction, wallet, component, transacting]
  );

  return {
    initialize,
    getActiveTransaction,
    updateTransactionBalance,
    updateAmount,
    sendTransaction,
    getAsetState,
  };
}
