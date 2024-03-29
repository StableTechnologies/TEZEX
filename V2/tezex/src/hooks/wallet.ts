import { useContext, useCallback, useEffect, useState } from "react";
import { WalletContext } from "../contexts/wallet";
import {
  Transaction,
  TransactionStatus,
  TransactingComponent,
} from "../types/general";

export interface WalletOps {
  updateBalance: () => Promise<boolean>;
  getActiveTransaction: () => Transaction | undefined;
  getTransactionStatus: () => TransactionStatus;
  sendTransaction: () => Promise<void>;
  transaction: Transaction | undefined;
}

export function useWalletOps(
  component: TransactingComponent,
  trackTransaction = false
): WalletOps {
  const wallet = useContext(WalletContext);

  const [loading, setLoading] = useState<boolean>(true);
  const [transaction, setTransaction] = useState<Transaction | undefined>(
    wallet.getActiveTransaction(component)
  );

  useEffect(() => {
    if (loading) {
      if (trackTransaction) {
        const currentTransaction = wallet.getActiveTransaction(component);
        if (currentTransaction) {
          setTransaction(currentTransaction);
          loading && setLoading(false);
        }
      } else setLoading(false);
    }
  }, [wallet, component, loading]);

  const updateBalance = useCallback(async (): Promise<boolean> => {
    return await wallet.updateTransactionBalance(component);
  }, [wallet, component]);

  const getActiveTransaction = useCallback((): Transaction | undefined => {
    return wallet.getActiveTransaction(component);
  }, [wallet, component]);

  const getTransactionStatus = useCallback((): TransactionStatus => {
    const _transaction = wallet.getActiveTransaction(component);
    if (_transaction) {
      if (_transaction.sendAmount[0].decimal.eq(0))
        return TransactionStatus.ZERO_AMOUNT;
      return _transaction.transactionStatus;
    } else return TransactionStatus.UNINITIALIZED;
  }, [wallet.getActiveTransaction, component]);

  const sendTransaction = useCallback(async () => {
    const _transaction = wallet.getActiveTransaction(component);
    if (wallet && _transaction && !_transaction.locked) {
      await wallet.updateStatus(component, TransactionStatus.PENDING);
    }
  }, [wallet, component, transaction]);

  return {
    getActiveTransaction,
    getTransactionStatus,
    updateBalance,
    sendTransaction,
    transaction,
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
