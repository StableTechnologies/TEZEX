import React, {
  useCallback,
  createContext,
  useEffect,
  useState,
  Component,
} from "react";
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
import { eq, isNumber } from "lodash";
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
import { Slippage } from "../components/ui/elements/inputs";
import { estimate } from "../functions/estimates";

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
  initialiseTransaction: (
    component: TransactingComponent,
    sendAsset: AssetOrAssetPair,
    receiveAsset: AssetOrAssetPair,
    sendAmount?: Amount,
    receiveAmount?: Amount,
    slipppage?: number
  ) => Promise<boolean>;

  updateTransactionBalance: (
    component: TransactingComponent
  ) => Promise<boolean>;

  updateStatus: (
    component: TransactingComponent,
    transactionStatus: TransactionStatus
  ) => Promise<void>;
  updateAmount: (
    component: TransactingComponent,
    amountUpdateSend?: Amount,
    amountUpdateReceive?: Amount,
    slippageUpdate?: number
  ) => Promise<boolean>;
  getActiveTransaction: (
    component: TransactingComponent
  ) => Transaction | undefined;
}

const defaultWalletInfo: WalletInfo = {
  client: null,
  setClient: () => {
    throw new Error("setClient called outside of wallet provider");
  },
  toolkit: null,
  setToolkit: () => {
    throw new Error("setToolkit called outside of wallet provider");
  },
  address: null,
  lbContractStorage: undefined,
  setAddress: () => {
    throw new Error("setAddress called outside of wallet provider");
  },
  isWalletConnected: false,
  disconnect: () => {
    throw new Error("disconnect called outside of wallet provider");
  },
  initialiseTransaction: async () => {
    throw new Error("initialiseTransaction called outside of wallet provider");
  },
  updateTransactionBalance: async () => {
    throw new Error(
      "updateTransactionBalance called outside of wallet provider"
    );
  },
  updateStatus: async () => {
    throw new Error("updateStatus called outside of wallet provider");
  },
  updateAmount: async () => {
    throw new Error("updateAmount  called outside of wallet provider");
  },
  getActiveTransaction: () => {
    throw new Error("getActiveTransaction called outside of wallet provider");
  },
};

export const WalletContext = createContext<WalletInfo>(defaultWalletInfo);

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

  const [loading, setLoading] = useState(true);
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [client, setClient] = useState<DAppClient | null>(null);
  const [toolkit, setToolkit] = useState<TezosToolkit | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [lbContractStorage, setLbContractStorage] = useState<
    LiquidityBakingStorageXTZ | undefined
  >(undefined);
  const [assetBalances, setAssetBalances] = useState<AssetBalance[]>(
    network.info.assets.map((asset) => {
      return { balance: undefined, asset: asset };
    })
  );

  // zero balance object
  const zeroBalance: Balance = {
    decimal: new BigNumber(0),
    mantissa: new BigNumber(0),
    string: "0.00",
    greaterOrEqualTo: (balance: Balance): boolean => {
      return new BigNumber(0).isGreaterThanOrEqualTo(balance.mantissa);
    },
  };

  //calback to find the balance of an asset
  const findAssetBalance = useCallback(
    (asset: Asset): Balance => {
      // find the balance of an asset
      const found = assetBalances.find((assetBalance: AssetBalance) => {
        return (assetBalance.asset.name as string) === (asset.name as string);
      });
      // if found return the balance or zero balance else throw error
      if (found) {
        if (found.balance) return found.balance as Balance;
        // if balance is undefined return zero balance
        return zeroBalance;
      } else throw Error("Asset : " + asset.name + " not found in Config");
    },
    [assetBalances]
  );

  // callback to get the balance of an asset or an asset pair
  const getBalancesOfAssets = useCallback(
    (assets: AssetOrAssetPair): Amount => {
      // map asset or asset pair to get combined amount
      const amount: Amount = assets.map((asset: Asset) => {
        // find the balance of this asset
        return findAssetBalance(asset);
      }) as Amount;
      return amount;
    },
    [findAssetBalance]
  );

  // callback to update state of asset balances
  const updateBalances = useCallback(async () => {
    if (address && toolkit && client) {
      // get balances of all assets by mapping over current asset balances
      const _assetBalances: AssetBalance[] = await Promise.all(
        assetBalances.map(async (assetBalance: AssetBalance) => {
          return {
            balance: await getBalance(toolkit, address, assetBalance.asset),
            asset: assetBalance.asset,
          };
        })
      );
      //only update if balances have changed
      if (!eq(_assetBalances, assetBalances)) setAssetBalances(_assetBalances);
    }
  }, [assetBalances, address, toolkit, client]);

  const updateStorage = useCallback(async () => {
    // get the current storage of the liquidity baking contract
    const newStorage = await network.getDexStorage().catch((e) => {
      session.setAlert(completionRecordFailed(e as Errors));
      return undefined;
    });

    setLbContractStorage((storage) => {
      // if the storage has changed update it
      if (newStorage) {
        // don not update if storage is the same
        if (storage && eq(storage, newStorage)) return storage;
        return newStorage;
      } else {
        // if the storage is undefined return the old storage
        return storage;
      }
    });
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
  //  useEffect(() => {
  //    const _updateStorage = async () => {
  //      await updateStorage();
  //    };
  //    const _updateBalances = async () => {
  //      await updateBalances();
  //    };
  //
  //    const interval = setInterval(() => {
  //      _updateBalances();
  //      _updateStorage();
  //    }, 5000);
  //    return () => clearInterval(interval);
  //  });
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
          const updatedTransaction = await transact(currentTransaction).then(
            (transaction) => {
              transaction.locked = false;
              return transaction;
            }
          );
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
      op?: (transaction: Draft<Transaction>) => boolean
    ): boolean => {
      let updated = false;
      const activeTransaction = getActiveTransaction(component);
      setTransactions((draft) => {
        const draftTransaction = draft[component];
        if (op && draftTransaction) {
          updated = op(draftTransaction as Draft<Transaction>);
        } else if (transaction && !eq(activeTransaction, transaction)) {
          draft[component] = transaction;
          updated = true;
        }
      });
      return updated;
    },
    [setTransactions]
  );

  const initialiseTransaction = useCallback(
    async (
      component: TransactingComponent,
      sendAsset: AssetOrAssetPair,
      receiveAsset: AssetOrAssetPair,
      sendAmount?: Amount,
      receiveAmount?: Amount,
      slipppage = 0.5
    ): Promise<boolean> => {
      return await transactionUpdateMutex.runExclusive(() => {
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

        const _transaction: Transaction = {
          id: uuidv4(),

          network: network.network,
          component,
          sendAsset,
          sendAmount: send,
          sendAssetBalance: initBalance(sendAsset),
          receiveAsset,
          receiveAmount: receive,
          receiveAssetBalance: initBalance(receiveAsset),
          transactionStatus: TransactionStatus.INITIALIZED,
          slippage: slipppage,
          lastModified: new Date(),
          locked: false,
        };

        const transaction: Transaction = lbContractStorage
          ? estimate(_transaction, lbContractStorage)
          : _transaction;
        return setActiveTransaction(component, transaction);
      });
    },
    [lbContractStorage, network.network, setActiveTransaction]
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

  const TranscationWithUpdatedBalance = useCallback(
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

  const updateBalancesOfAllTransactions = useCallback(async () => {
    console.log("*&*updateBalancesOfAllTransactions");
    await transactionUpdateMutex.runExclusive(() => {
      Object.entries(transactions).forEach(([key, transaction]) => {
        const component = key as TransactingComponent;
        if (transaction) {
          const updatedTransaction = TranscationWithUpdatedBalance(transaction);

          const t = transactions[component]!;
          if (
            t &&
            !eq(JSON.stringify(updatedTransaction), JSON.stringify(t))
            // &&
            // !eq(
            //   JSON.stringify(t.sendAssetBalance),
            //   JSON.stringify(updatedTransaction.sendAssetBalance)
            // )
          ) {
            console.log(
              "*&*, !eq(updatedTransaction, transaction)",
              "newUpdate: ",
              JSON.stringify(t.sendAssetBalance),
              "current transaction",
              JSON.stringify(updatedTransaction.sendAssetBalance)
            );
            setTransactions((draft) => {
              const _ = updateTransaction(draft[component], (transaction) => {
                if (
                  transaction.sendAssetBalance !==
                  updatedTransaction.sendAssetBalance
                ) {
                  transaction.lastModified = new Date();
                  transaction.sendAssetBalance =
                    updatedTransaction.sendAssetBalance;
                }
                if (
                  transaction.receiveAssetBalance !==
                  updatedTransaction.receiveAssetBalance
                ) {
                  transaction.lastModified = new Date();

                  transaction.receiveAssetBalance =
                    updatedTransaction.receiveAssetBalance;
                }
                if (
                  transaction.transactionStatus !==
                  updatedTransaction.transactionStatus
                ) {
                  transaction.lastModified = new Date();

                  transaction.transactionStatus =
                    updatedTransaction.transactionStatus;
                }

                return true;
              });

              console.log("*&* transaction balances updated");
            });
          } else {
            console.log("*&* transaction balances not updated");
          }
        }
      });
    });
  }, [transactions, TranscationWithUpdatedBalance, setTransactions]);

  // Effect to update balances of all transactions on change of balances
  useEffect(() => {
    console.log(
      "*&*useEffect updateBalancesOfAllTransactions , assetBalances",
      assetBalances
    );
    updateBalancesOfAllTransactions();
  }, [assetBalances, updateBalancesOfAllTransactions]);

  const updateTransactionBalance = useCallback(
    async (component: TransactingComponent): Promise<boolean> => {
      const transaction = getActiveTransaction(component);
      let updated = false;
      transaction &&
        (await transactionUpdateMutex.runExclusive(() => {
          const _transaction: Transaction =
            TranscationWithUpdatedBalance(transaction);
          setTransactions((draft) => {
            updated = updateTransaction(draft[component], (transaction) => {
              if (
                transaction &&
                transaction.id &&
                transaction.id === transaction.id
              ) {
                transaction.sendAssetBalance = _transaction.sendAssetBalance;
                transaction.receiveAssetBalance =
                  _transaction.receiveAssetBalance;
                transaction.transactionStatus = _transaction.transactionStatus;
                transaction.lastModified = new Date();
                return true;
              }

              return false;
            });
          });
        }));
      return updated;
    },
    [TranscationWithUpdatedBalance, setTransactions]
  );

  const updateStatus = useCallback(
    async (
      component: TransactingComponent,
      transactionStatus: TransactionStatus
    ) => {
      await transactionUpdateMutex.runExclusive(() => {
        setTransactions((draft) => {
          const updated = updateTransaction(draft[component], (transaction) => {
            if (transaction && !transaction.locked) {
              transaction.transactionStatus = transactionStatus;
              if (transactionStatus === TransactionStatus.PENDING) {
                draft[component]!.locked = true;
              }
              draft[component]!.lastModified = new Date();
              return true;
            } else return false;
          });
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

  // debug effect trasactions
  useEffect(() => {
    console.log("*&* transactions modified", transactions);
  }, [transactions]);

  // Allows for safe update of a transaction
  const updateTransaction = (
    transaction: WritableDraft<Transaction> | undefined,
    updater: (transaction: WritableDraft<Transaction>) => boolean
  ): boolean => {
    // if the transaction is locked or undefined  return
    if (!transaction) return false;
    if (transaction.locked) return false;
    // else safe to update, run the updater

    return updater(transaction);
  };

  const updateAmount = useCallback(
    async (
      component: TransactingComponent,
      amountUpdateSend?: Amount,
      amountUpdateReceive?: Amount,
      slippageUpdate?: number
    ): Promise<boolean> => {
      let updated = true;
      await transactionUpdateMutex.runExclusive(() => {
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
                updated = true;
              }
              if (
                isNumber(slippageUpdate) &&
                transaction.slippage !== slippageUpdate
              ) {
                console.log("slippage update");
                transaction.slippage = slippageUpdate;
                updated = true;
              } else {
                console.log(
                  "slippage not updated. slippage: " +
                    slippageUpdate +
                    " transaction.slippage: " +
                    transaction.slippage
                );
              }
              return (
                updateTransactionStatusBasedOnBalance(
                  transaction,
                  amountUpdateSend
                ) || updated
              );
            }
          );
          if (wasUpdated && draft[component]) {
            draft[component]!.lastModified = new Date();
          } else {
            updated = false;
          }
        });
      });
      return updated;
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
