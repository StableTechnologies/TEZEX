import { useContext, useCallback, useEffect, useState } from "react";

import { BigNumber } from "bignumber.js";
import { estimate } from "../functions/estimates";
import { WalletContext } from "../contexts/wallet";
import { useNetwork } from "../hooks/network";

import { balanceBuilder } from "../functions/util";
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
      switch (component) {
        case TransactingComponent.SWAP:
          if (wallet.lbContractStorage) {
            setTransaction(wallet.swapTransaction);
            setLoading(false);
          }

          break;
        case TransactingComponent.ADD_LIQUIDITY:
          if (wallet.lbContractStorage) {
            setTransaction(wallet.addLiquidityTransaction);
            setLoading(false);
          }

          break;
        case TransactingComponent.REMOVE_LIQUIDITY:
          if (wallet.lbContractStorage) {
            setTransaction(wallet.removeLiquidityTransaction);
            setLoading(false);
          }
          break;
      }
    }
  }, [wallet, component]);

  useEffect(() => {
    if (transaction && wallet) {
      if (transaction.transactionStatus === TransactionStatus.COMPLETED) {
        setTransaction(undefined);
      }
    }
  }, [transaction]);

  useEffect(() => {
    if (
      transacting &&
      transaction &&
      transaction.transactionStatus !== TransactionStatus.PENDING
    ) {
      setTransacting(false);
      if (loading) setLoading(false);
    } else if (
      !transacting &&
      transaction &&
      transaction.transactionStatus === TransactionStatus.PENDING
    ) {
      setTransacting(true);
      if (loading) setLoading(false);
    } else if (loading && transaction) setLoading(false);
  }, [transacting, transaction, setTransacting, loading]);

  const initialize = useCallback(
    (
      sendAsset: AssetOrAssetPair,
      recieveAsset: AssetOrAssetPair
    ): Transaction | undefined => {
      if (loading) {
        return transaction;
      } else if (
        wallet &&
        !loading &&
        transaction &&
        transaction.transactionStatus === TransactionStatus.PENDING
      ) {
        return transaction;
      } else if (wallet && !loading) {
        const transaction: Transaction = wallet.initialiseTransaction(
          component,
          sendAsset,
          recieveAsset
        );

        if (wallet.client)
          wallet.updateTransactionBalance(component, transaction);
        return transaction;
      } else return undefined;
    },
    [wallet, loading, transaction, component]
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
    } else return false;
  }, [wallet, component, transaction, transacting]);

  const getActiveTransaction = useCallback((): Transaction | undefined => {
    return transaction;
  }, [transaction]);
  const sendTransaction = useCallback(async () => {
    if (wallet && transaction && wallet.address && wallet.toolkit) {
      wallet.updateStatus(component, TransactionStatus.PENDING);
    }
  }, [wallet, component, transaction]);

  const updateAmount = useCallback(
    (sendAmount?: string, slippage?: string): boolean => {
      const updated = false;
      if (
        transaction &&
        transaction.transactionStatus !== TransactionStatus.PENDING &&
        !transacting &&
        sendAmount &&
        !transaction.sendAmount[0].decimal.eq(sendAmount)
      ) {
        if (wallet && wallet.lbContractStorage && sendAmount) {
          wallet.updateStatus(component, TransactionStatus.MODIFIED);

          const updatedTransaction = (): Transaction => {
            switch (component) {
              case TransactingComponent.SWAP:
                return {
                  ...transaction,
                  sendAmount: [
                    balanceBuilder(sendAmount, transaction.sendAsset[0], false),
                  ],
                };
              case TransactingComponent.ADD_LIQUIDITY:
                if (transaction.sendAmount[1]) {
                  return {
                    ...transaction,
                    sendAmount: [
                      balanceBuilder(
                        sendAmount,
                        transaction.sendAsset[0],
                        false
                      ),
                      transaction.sendAmount[1],
                    ],
                  };
                } else {
                  throw Error("Got single Asset of addLiquidity");
                }
              case TransactingComponent.REMOVE_LIQUIDITY:
                return {
                  ...transaction,
                  sendAmount: [
                    balanceBuilder(sendAmount, transaction.sendAsset[0], false),
                  ],
                };
            }
          };

          const _transaction = estimate(
            updatedTransaction(),
            wallet.lbContractStorage as LiquidityBakingStorageXTZ
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
        !transacting &&
        transaction &&
        !new BigNumber(transaction.slippage).eq(slippage)
      ) {
        wallet &&
          slippage &&
          wallet.updateAmount(
            component,
            undefined,
            undefined,
            new BigNumber(slippage).toNumber()
          );
      }
      return updated;
    },
    [transaction, wallet, component, network, transacting]
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
  if (wallet) {
    return wallet.isWalletConnected;
  } else return false;
}
export function useWallet() {
  const wallet = useContext(WalletContext);

  return wallet;
}
