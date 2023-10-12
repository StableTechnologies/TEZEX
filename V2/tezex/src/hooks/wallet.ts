import { useContext, useCallback, useEffect, useState } from "react";
import { BigNumber } from "bignumber.js";
import { WalletContext } from "../contexts/wallet";
import { useNetwork } from "../hooks/network";
import { balanceBuilder } from "../functions/util";
import { estimate } from "../functions/estimates";
import {
  Transaction,
  TransactionStatus,
  TransactingComponent,
  AssetOrAssetPair,
  LiquidityBakingStorageXTZ,
} from "../types/general";

export interface WalletOps {
  initialize: (
    sendAsset: AssetOrAssetPair,
    recieveAsset: AssetOrAssetPair,
    sendAmount?: BigNumber,
    receiveAmount?: BigNumber,
    slippage?: number
  ) => Transaction | undefined;
  getActiveTransaction: () => Transaction | undefined;
  updateTransactionBalance: () => boolean;
  updateAmount: (sendAmount?: string, slippage?: string) => boolean;
  sendTransaction: () => Promise<void>;
}

export function useWalletOps(component: TransactingComponent): WalletOps {
  const wallet = useContext(WalletContext);
  const network = useNetwork();

  const [loading, setLoading] = useState<boolean>(true);
  const [transacting, setTransacting] = useState<boolean>(false);
  const [transaction, setTransaction] = useState<Transaction | undefined>(
    undefined
  );

  useEffect(() => {
    if (wallet) {
      const currentTransaction = wallet.getActiveTransaction(component);
      setTransaction(currentTransaction);
      setLoading(false);
    }
  }, [wallet, component]);

  useEffect(() => {
    if (
      transaction &&
      transaction.transactionStatus === TransactionStatus.COMPLETED
    ) {
      setTransaction(undefined);
    }
  }, [transaction]);

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
        setTransaction(transaction);
        return transaction;
      }
      return undefined;
    },
    [wallet, component]
  );

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
        !new BigNumber(transaction.slippage).eq(slippage)
      ) {
        wallet &&
          wallet.updateAmount(
            component,
            undefined,
            undefined,
            new BigNumber(slippage).toNumber()
          );
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
  };
}

export function useWalletConnected(): boolean {
  const wallet = useContext(WalletContext);
  return wallet ? wallet.isWalletConnected : false;
}

export function useWallet() {
  const wallet = useContext(WalletContext);
  return wallet;
}
