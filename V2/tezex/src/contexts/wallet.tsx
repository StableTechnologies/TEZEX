import React, { useCallback, createContext, useEffect, useState } from "react";
import { Draft } from "immer";
import { useImmer } from "use-immer";
import { Mutex } from "async-mutex";
import { DAppClient } from "@airgap/beacon-dapp";
import {
  Transaction,
  Asset,
  AssetBalance,
  Balance,
  TransactionStatus,
  TransactingComponent,
  Amount,
  AssetOrAssetPair,
  LiquidityBakingStorageXTZ,
  Errors,
} from "../types/general";
import { TezosToolkit } from "@taquito/taquito";

import { processTransaction } from "../functions/transactions";
import { useNetwork } from "../hooks/network";
import { useSession } from "../hooks/session";
import { v4 as uuidv4 } from "uuid";
import { BigNumber } from "bignumber.js";
import { getBalance } from "../functions/beacon";
import {
  completionRecordFailed,
  completionRecordSuccess,
} from "../functions/util";
import { Writable } from "stream";
import { WritableDraft } from "immer/dist/types/types-external";

export enum WalletStatus {
  ESTIMATING_SIRS = "Estimating Sirs",
  ESTIMATING_XTZ = "Estimating Tez",
  ESTIMATING_TZBTC = "Estimating tzBTC",
  ZERO_BALANCE = "Insufficient Funds",
  ZERO_AMOUNT = "Enter Amount",
  DISCONNECTED = "disconnected",
  READY = "ready",
  BUSY = "In Progress",
  LOADING = "Loading",
}

export interface WalletInfo {
  client: DAppClient | null;
  setClient: React.Dispatch<React.SetStateAction<DAppClient | null>>;
  toolkit: TezosToolkit | null;
  setToolkit: React.Dispatch<React.SetStateAction<TezosToolkit | null>>;
  address: string | null;
  lbContractStorage: LiquidityBakingStorageXTZ | undefined;
  setAddress: React.Dispatch<React.SetStateAction<string | null>>;
  isWalletConnected: boolean;
  disconnect: () => void;
  swapTransaction: Transaction | undefined;
  addLiquidityTransaction: Transaction | undefined;
  removeLiquidityTransaction: Transaction | undefined;
  initialiseTransaction: (
    component: TransactingComponent,
    sendAsset: AssetOrAssetPair,
    receiveAsset: AssetOrAssetPair,
    sendAmount?: Amount,
    receiveAmount?: Amount
  ) => Transaction;

  updateTransactionBalance: (
    component: TransactingComponent,
    transaction: Transaction
  ) => void;

  updateStatus: (
    component: TransactingComponent,
    transactionStatus: TransactionStatus
  ) => void;
  updateAmount: (
    component: TransactingComponent,
    amountUpdateSend?: Amount,
    amountUpdateReceive?: Amount,
    slippageUpdate?: number
  ) => boolean;
  getActiveTransaction: (
    component: TransactingComponent
  ) => Transaction | undefined;
}

export const WalletContext = createContext<WalletInfo | undefined>(undefined);

export interface IWallet {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}

interface IWalletProvider {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}
export function WalletProvider(props: IWalletProvider) {
  const network = useNetwork();
  const session = useSession();
  const mutex = new Mutex();
  const transactionMutex = new Mutex();
  const transactionUpdateMutex = new Mutex();
  const [transactions, setTransactions] = useImmer<{
    [key in TransactingComponent]?: Transaction;
  }>({});
  const [swapTransaction, setSwapTransaction] = useImmer<
    Transaction | undefined
  >(undefined);
  const [addLiquidityTransaction, setAddLiquidityTransaction] = useImmer<
    Transaction | undefined
  >(undefined);
  const [removeLiquidityTransaction, setRemoveLiquidityTransaction] = useImmer<
    Transaction | undefined
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [client, setClient] = useState<DAppClient | null>(null);
  const [toolkit, setToolkit] = useState<TezosToolkit | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [lbContractStorage, setLbContractStroage] = useState<
    LiquidityBakingStorageXTZ | undefined
  >(undefined);
  const [assetBalances, setAssetBalances] = useState<AssetBalance[]>(
    network.info.assets.map((asset) => {
      return { balance: undefined, asset: asset };
    })
  );

  const zeroBalance: Balance = {
    decimal: new BigNumber(0),
    mantissa: new BigNumber(0),
    greaterOrEqualTo: (balance: Balance): boolean => {
      return new BigNumber(0).isGreaterThanOrEqualTo(balance.mantissa);
    },
  };
  const findAssetBalance = (asset: Asset): Balance => {
    const found = assetBalances.find((assetBalance: AssetBalance) => {
      return (assetBalance.asset.name as string) === (asset.name as string);
    });
    if (found) {
      if (found.balance) return found.balance as Balance;
      return zeroBalance;
    } else throw Error("Asset : " + asset.name + " not found in Config");
  };
  const getBalancesOfAssets = (assets: AssetOrAssetPair): Amount => {
    const amount: Amount = assets.map((asset: Asset) => {
      return findAssetBalance(asset);
    }) as Amount;
    return amount;
  };
  const updateBalances = useCallback(async () => {
    if (address && toolkit && client) {
      const _assetBalances: AssetBalance[] = await Promise.all(
        assetBalances.map(async (assetBalance: AssetBalance) => {
          return {
            balance: await getBalance(toolkit, address, assetBalance.asset),
            asset: assetBalance.asset,
          };
        })
      );
      setAssetBalances(_assetBalances);
    }
  }, [address, toolkit, client]);

  const updateStorage = useCallback(async () => {
    setLbContractStroage(
      await network.getDexStorage().catch((e) => {
        session.setAlert(completionRecordFailed(e as Errors));
        return undefined;
      })
    );
  }, [network]);

  useEffect(() => {
    const loadStorage = async () => {
      await updateStorage();
      setLoading(false);
    };
    if (loading) {
      loadStorage;
    }
  }, [loading]);

  useEffect(() => {
    const _updateBalances = async () => {
      await updateBalances();
    };
    _updateBalances();
  }, [isWalletConnected]);

  useEffect(() => {
    const _updateStorage = async () => {
      await updateStorage();
    };
    if (!lbContractStorage) {
      const interval = setInterval(() => {
        _updateStorage();
      }, 1000);
      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        _updateStorage();
      }, 60000);
      return () => clearInterval(interval);
    }
  });
  useEffect(() => {
    const _updateStorage = async () => {
      await updateStorage();
    };
    const _updateBalances = async () => {
      await updateBalances();
    };

    const interval = setInterval(() => {
      _updateBalances();
      _updateStorage();
    }, 5000);
    return () => clearInterval(interval);
  });
  //
  const removeTransaction = useCallback(
    (component: TransactingComponent) => {
      setTransactions((draft) => {
        delete draft[component];
      });
    },
    [setTransactions]
  );

  const getActiveTransaction = useCallback(
    (component: TransactingComponent): Transaction | undefined => {
      return transactions[component];
    },
    [transactions]
  );
  const transact = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      if (address && toolkit) {
        if (transaction.transactionStatus === TransactionStatus.PENDING) {
          const t: Transaction = await processTransaction(
            transaction,
            address,
            network.info.dex.address,
            toolkit
          )
            .then((success) => {
              session.setAlert(completionRecordSuccess(success), true);
              return updateBalances();
            })
            .then(() => {
              return {
                ...transaction,
                transactionStatus: TransactionStatus.COMPLETED,
              };
            })
            .catch((e) => {
              session.setAlert(completionRecordFailed(e as Errors), true);
              return {
                ...transaction,
                transactionStatus: TransactionStatus.FAILED,
              };
            });
          return t;
        } else {
          return transaction;
        }
      } else throw Error("wallet not Connected");
    },
    [address, toolkit]
  );

  useEffect(() => {
    const proc = async (component: TransactingComponent) => {
      return transactionMutex.runExclusive(async () => {
        const currentTransaction = transactions[component];
        if (
          currentTransaction &&
          currentTransaction.transactionStatus === TransactionStatus.PENDING
        ) {
          const updatedTransaction = await transact(currentTransaction);
          if (
            updatedTransaction.transactionStatus === TransactionStatus.FAILED
          ) {
            setTransactions((draft) => {
              draft[component] = updatedTransaction;
            });
          } else {
            setTransactions((draft) => {
              delete draft[component];
            });
          }
        }
      });
    };

    Promise.all([
      proc(TransactingComponent.SWAP),
      proc(TransactingComponent.ADD_LIQUIDITY),
      proc(TransactingComponent.REMOVE_LIQUIDITY),
    ]).then(() => {
      //
    });
  }, [transact, transactions, setTransactions]);

  const setActiveTransaction = useCallback(
    (
      component: TransactingComponent,
      transaction?: Transaction,
      op?: (transaction: Draft<Transaction>) => void
    ): void => {
      setTransactions((draft) => {
        const currentTransaction = draft[component];
        if (op && currentTransaction) {
          op(currentTransaction as Draft<Transaction>);
        } else if (transaction) {
          draft[component] = transaction;
        }
      });
    },
    [setTransactions]
  );

  const initialiseTransaction = useCallback(
    (
      component: TransactingComponent,
      sendAsset: AssetOrAssetPair,
      receiveAsset: AssetOrAssetPair,
      sendAmount?: Amount,
      receiveAmount?: Amount
    ): Transaction => {
      const initBalance = (asset: AssetOrAssetPair): Amount => {
        switch (asset.length) {
          case 1:
            return [zeroBalance];
          case 2:
            return [zeroBalance, zeroBalance];
        }
      };
      const send: Amount = sendAmount ? sendAmount : initBalance(sendAsset);
      const receive: Amount = receiveAmount
        ? receiveAmount
        : initBalance(receiveAsset);

      const transaction: Transaction = {
        id: uuidv4(),

        network: network.network,
        component,
        sendAsset,
        sendAmount: send,
        sendAssetBalance: initBalance(sendAsset),
        receiveAsset,
        receiveAmount: receive,
        receiveAssetBalance: initBalance(receiveAsset),
        transactionStatus: TransactionStatus.INITIALISED,
        slippage: 0.5,
        lastModified: new Date(),
      };
      setActiveTransaction(component, transaction);
      return transaction;
    },
    [network.network, setActiveTransaction]
  );

  const checkSufficientBalance = (
    userBalance: Amount,
    requiredAmount: Amount
  ): TransactionStatus => {
    if (userBalance.length !== requiredAmount.length) {
      throw Error("Error: balance check asset pair mismatch");
    }
    const checks: boolean[] = Array.from(userBalance, (assetBalance, index) => {
      const required = requiredAmount[index];
      if (required) {
        return assetBalance.greaterOrEqualTo(required);
      } else throw Error("Amount indexs don't match / align");
    });
    const hasSufficientBalance = !checks.includes(false);
    if (hasSufficientBalance) {
      return TransactionStatus.SUFFICIENT_BALANCE;
    } else {
      return TransactionStatus.INSUFFICIENT_BALANCE;
    }
  };

  const updateBalanceTransaction = useCallback(
    (transaction: Transaction): Transaction => {
      const sendAssetBalance: Amount = getBalancesOfAssets(
        transaction.sendAsset
      );
      const receiveAssetBalance: Amount = getBalancesOfAssets(
        transaction.receiveAsset
      );
      const balanceStatus = checkSufficientBalance(
        sendAssetBalance,
        transaction.sendAmount
      );
      return {
        ...transaction,
        sendAssetBalance,
        receiveAssetBalance,
        transactionStatus: balanceStatus,
      };
    },
    [getBalancesOfAssets]
  );

  const updateTransactionBalance = useCallback(
    async (component: TransactingComponent, transaction: Transaction) => {
      await transactionUpdateMutex.runExclusive(() => {
        const _transaction: Transaction = updateBalanceTransaction(transaction);
        setTransactions((draft) => {
          if (
            draft[component] &&
            draft[component]?.id &&
            draft[component]?.id === transaction.id
          ) {
            draft[component]!.sendAssetBalance = _transaction.sendAssetBalance;
            draft[component]!.receiveAssetBalance =
              _transaction.receiveAssetBalance;
            draft[component]!.transactionStatus =
              _transaction.transactionStatus;
          }
        });
      });
    },
    [updateBalanceTransaction, setTransactions]
  );

  const updateStatus = useCallback(
    async (
      component: TransactingComponent,
      transactionStatus: TransactionStatus
    ) => {
      await transactionUpdateMutex.runExclusive(() => {
        setTransactions((draft) => {
          if (draft[component]) {
            draft[component]!.transactionStatus = transactionStatus;
          }
        });
      });
    },
    [setTransactions]
  );
  const updateTransactionStatusBasedOnBalance = (
    transaction: WritableDraft<Transaction>,
    amountUpdateSend?: Amount
  ) => {
    const sendAssetBalance: Amount = transaction.sendAssetBalance.map(
      (balance) => ({ ...balance })
    ) as Amount;
    if (
      amountUpdateSend &&
      !transaction.sendAmount[0].decimal.eq(amountUpdateSend[0].decimal)
    ) {
      transaction.sendAmount = amountUpdateSend;
      if (isWalletConnected) {
        transaction.transactionStatus = checkSufficientBalance(
          sendAssetBalance,
          amountUpdateSend
        );
      }
      return true;
    }
    return false;
  };

  //type draft = WritableDraft<{ [key in TransactingComponent]?: Transaction }>;

  const updateTransaction = (
    transaction: WritableDraft<Transaction> | undefined,
    updater: (transaction: WritableDraft<Transaction>) => boolean
  ): boolean => {
    if (!transaction) return false;
    return updater(transaction);
  };

  const updateAmount = useCallback(
    (
      component: TransactingComponent,
      amountUpdateSend?: Amount,
      amountUpdateReceive?: Amount,
      slippageUpdate?: number
    ): boolean => {
      let result = false;
      transactionUpdateMutex.runExclusive(() => {
        setTransactions((draft) => {
          const wasUpdated = updateTransaction(
            draft[component],
            (transaction) => {
              if (
                amountUpdateReceive &&
                !transaction.receiveAmount[0].decimal.eq(
                  amountUpdateReceive[0].decimal
                )
              ) {
                transaction.receiveAmount = amountUpdateReceive;
                result = true;
              }
              if (slippageUpdate && transaction.slippage !== slippageUpdate) {
                transaction.slippage = slippageUpdate;
                result = true;
              }
              return (
                updateTransactionStatusBasedOnBalance(
                  transaction,
                  amountUpdateSend
                ) || result
              );
            }
          );
          if (wasUpdated && draft[component]) {
            const currentTransaction = draft[component];
            if (currentTransaction) {
              draft[component] = { ...currentTransaction };
            }
          }
        });
      });
      return result;
    },
    [setTransactions, isWalletConnected]
  );

  useEffect(() => {
    if (client) {
      setIsWalletConnected(true);
    } else {
      setIsWalletConnected(false);
    }
  }, [client]);

  const disconnect = () => {
    setClient(null);
    setAddress(null);
  };

  const walletInfo: WalletInfo = {
    client,
    setClient,
    toolkit,
    setToolkit,
    address,
    lbContractStorage,
    setAddress,
    isWalletConnected,
    swapTransaction,
    addLiquidityTransaction,
    removeLiquidityTransaction,
    initialiseTransaction,
    updateStatus,
    updateTransactionBalance,
    updateAmount,
    getActiveTransaction,
    disconnect,
  };

  return (
    <WalletContext.Provider value={walletInfo}>
      {props.children}
    </WalletContext.Provider>
  );
}
