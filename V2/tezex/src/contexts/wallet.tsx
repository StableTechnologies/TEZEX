import React, { useCallback, createContext, useEffect, useState } from "react";
import { Draft } from "immer";
import { useImmer } from "use-immer";

import { DAppClient } from "@airgap/beacon-sdk";
import {
  Transaction,
  Balance,
  TransactionStatus,
  TransactingComponent,
  Amount,
  AssetOrAssetPair,
} from "../types/general";
import { TezosToolkit } from "@taquito/taquito";

import { processTransaction } from "../functions/transactions";
import { useNetwork } from "../hooks/network";
import { v4 as uuidv4 } from "uuid";
import { BigNumber } from "bignumber.js";
import { getBalance } from "../functions/beacon";

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

export function isReady(walletStatus: WalletStatus) {
  const ready = (): boolean => {
    return walletStatus === WalletStatus.READY;
  };
  return ready;
}
export function walletUser(
  walletStatus: WalletStatus,
  setWalletStatus: React.Dispatch<React.SetStateAction<WalletStatus>>
) {
  const useWallet = async (
    op: () => Promise<unknown>,
    transientStatus: WalletStatus = WalletStatus.BUSY,
    force?: boolean
  ) => {
    const setBusy = async () => {
      setWalletStatus(transientStatus);
    };
    const setReady = async () => {
      setWalletStatus(WalletStatus.READY);
    };
    if (!force && walletStatus === WalletStatus.READY) {
      await setBusy();
      await op();
      await setReady();
    } else if (force) {
      await setBusy();
      await op();
    }
  };

  return useWallet;
}

export interface WalletInfo {
  client: DAppClient | null;
  setClient: React.Dispatch<React.SetStateAction<DAppClient | null>>;
  toolkit: TezosToolkit | null;
  setToolkit: React.Dispatch<React.SetStateAction<TezosToolkit | null>>;
  address: string | null;
  setAddress: React.Dispatch<React.SetStateAction<string | null>>;
  walletStatus: WalletStatus;
  setWalletStatus: React.Dispatch<React.SetStateAction<WalletStatus>>;
  walletUser: (
    op: () => Promise<unknown>,
    walletStatus?: WalletStatus
  ) => Promise<void>;
  isWalletConnected: boolean;
  isReady: () => boolean;
  disconnect: () => void;
  transactions: Transaction[];
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

  updateBalance: (
    component: TransactingComponent,
    transaction: Transaction,
    checkBalances?: boolean
  ) => Promise<boolean>;

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
  fetchTransaction: (id: string) => Transaction | undefined;
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
  // eslint-disable-next-line
  const [transactions, setTransactions] = useImmer<Transaction[]>([]);

  const [swapTransaction, setSwapTransaction] = useImmer<
    Transaction | undefined
  >(undefined);
  const [addLiquidityTransaction, setAddLiquidityTransaction] = useImmer<
    Transaction | undefined
  >(undefined);
  const [removeLiquidityTransaction, setRemoveLiquidityTransaction] = useImmer<
    Transaction | undefined
  >(undefined);

  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletStatus, setWalletStatus] = useState(WalletStatus.DISCONNECTED);
  const [client, setClient] = useState<DAppClient | null>(null);
  const [toolkit, setToolkit] = useState<TezosToolkit | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const getActiveTransaction = useCallback(
    (component: TransactingComponent): Transaction | undefined => {
      switch (component) {
        case TransactingComponent.SWAP:
          const t = swapTransaction;
          return t;
        case TransactingComponent.ADD_LIQUIDITY:
          return addLiquidityTransaction;
        case TransactingComponent.REMOVE_LIQUIDITY:
          return removeLiquidityTransaction;
      }
    },
    [swapTransaction, addLiquidityTransaction, removeLiquidityTransaction]
  );
  const transact = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      if (address && toolkit) {
        if (transaction.transactionStatus === TransactionStatus.PENDING) {
          const t: Transaction = await processTransaction(
            transaction,
            address,
            toolkit
          )
            .then(() => {
              return {
                ...transaction,
                transactionStatus: TransactionStatus.COMPLETED,
              };
            })
            .catch(() => {
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
    const proc = async () => {
      swapTransaction &&
        swapTransaction.transactionStatus === TransactionStatus.PENDING &&
        (await transact(swapTransaction).then((transaction: Transaction) => {
          setSwapTransaction(transaction);
        }));
    };
    proc();
  }, [transact, setSwapTransaction, swapTransaction]);

  useEffect(() => {
    const proc = async () => {
      addLiquidityTransaction &&
        addLiquidityTransaction.transactionStatus ===
          TransactionStatus.PENDING &&
        (await transact(addLiquidityTransaction).then(
          (transaction: Transaction) => {
            setAddLiquidityTransaction(transaction);
          }
        ));
    };
    proc();
  }, [transact, setAddLiquidityTransaction, addLiquidityTransaction]);

  useEffect(() => {
    const proc = async () => {
      removeLiquidityTransaction &&
        removeLiquidityTransaction.transactionStatus ===
          TransactionStatus.PENDING &&
        (await transact(removeLiquidityTransaction).then(
          (transaction: Transaction) => {
            setRemoveLiquidityTransaction(transaction);
          }
        ));
    };
    proc();
  }, [transact, setRemoveLiquidityTransaction, removeLiquidityTransaction]);

  const setActiveTransaction = useCallback(
    (
      component: TransactingComponent,
      transaction?: Transaction,
      op?: (transaction: Draft<Transaction>) => void
    ): void => {
      switch (component) {
        case TransactingComponent.SWAP:
          if (op && swapTransaction) {
            setSwapTransaction((draft) => (draft ? op(draft) : draft));
          } else if (transaction) setSwapTransaction(transaction);
          break;
        case TransactingComponent.ADD_LIQUIDITY:
          if (op && addLiquidityTransaction) {
            setAddLiquidityTransaction((draft) => (draft ? op(draft) : draft));
          } else if (transaction) setAddLiquidityTransaction(transaction);
          break;
        case TransactingComponent.REMOVE_LIQUIDITY:
          if (op && removeLiquidityTransaction) {
            setRemoveLiquidityTransaction((draft) =>
              draft ? op(draft) : draft
            );
          } else if (transaction) setRemoveLiquidityTransaction(transaction);
          break;
      }
    },
    [
      setSwapTransaction,
      setAddLiquidityTransaction,
      setRemoveLiquidityTransaction,
      addLiquidityTransaction,
      removeLiquidityTransaction,
      swapTransaction,
    ]
  );

  const network = useNetwork();

  const initialiseTransaction = useCallback(
    (
      component: TransactingComponent,
      sendAsset: AssetOrAssetPair,
      receiveAsset: AssetOrAssetPair,
      sendAmount?: Amount,
      receiveAmount?: Amount
    ): Transaction => {
      const zeroBalance = {
        decimal: new BigNumber(0),
        mantissa: new BigNumber(0),
        greaterOrEqualTo: (balance: Balance): boolean => {
          return new BigNumber(0).isGreaterThanOrEqualTo(balance.mantissa);
        },
      };
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

  const fetchTransaction = (id: string): Transaction | undefined => {
    return transactions.find((t: Transaction) => t.id === id);
  };

  const getBalanceOfAssets = useCallback(
    async (assets: AssetOrAssetPair): Promise<Amount | null> => {
      if (toolkit && address) {
        switch (assets.length) {
          case 1:
            return await getBalance(toolkit, address, assets[0])
              .then((balance: Balance) => {
                return [balance] as Amount;
              })
              .catch((_) => {
                return null;
              });
          case 2:
            return await getBalance(toolkit, address, assets[0])
              .then((balance: Balance) => {
                const withSecondAsset = async () => {
                  return [
                    balance,
                    await getBalance(toolkit, address, assets[1]),
                  ] as Amount;
                };
                return withSecondAsset();
              })
              .catch((_) => {
                return null;
              });
        }
      }
      return null;
    },
    [toolkit, address]
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
    const hasSufficientBalance: boolean = !checks.includes(false);
    if (hasSufficientBalance) {
      return TransactionStatus.SUFFICIENT_BALANCE;
    } else {
      return TransactionStatus.INSUFFICIENT_BALANCE;
    }
  };

  const getBalances = useCallback(
    async (
      transaction: Transaction,
      checkBalance?: boolean
    ): Promise<Transaction> => {
      var userBalanceSend: Amount | undefined;
      var balanceStatus: TransactionStatus | undefined;
      const updated: Transaction = await getBalanceOfAssets(
        transaction.sendAsset
      )
        .then((userBalance: Amount | null) => {
          if (checkBalance && userBalance) {
            balanceStatus = checkSufficientBalance(
              userBalance,
              transaction.sendAmount
            );
          }
          if (userBalance) userBalanceSend = userBalance;
          return getBalanceOfAssets(transaction.receiveAsset);
        })
        .then((userBalance: Amount | null) => {
          const receiveAssetBalance = userBalance
            ? userBalance
            : transaction.receiveAssetBalance;
          const sendAssetBalance: Amount = userBalanceSend
            ? userBalanceSend
            : transaction.sendAssetBalance;
          return {
            ...transaction,
            sendAssetBalance,
            receiveAssetBalance,
            transactionstatus: balanceStatus
              ? balanceStatus
              : transaction.transactionStatus,
          };
        })
        .catch((e) => {
          throw Error(e);
        });
      return updated;
    },
    [getBalanceOfAssets]
  );

  const updateBalance = useCallback(
    async (
      component: TransactingComponent,
      transaction: Transaction,
      checkBalances: boolean = true
    ): Promise<boolean> => {
      var updated = false;

      await getBalances(transaction, checkBalances)
        .then((_transaction: Transaction) => {
          switch (component) {
            case TransactingComponent.SWAP:
              setSwapTransaction((draft: Draft<Transaction | undefined>) => {
                if (draft && transaction.id === draft.id) {
                  draft.sendAssetBalance = _transaction.sendAssetBalance;
                  draft.receiveAssetBalance = _transaction.receiveAssetBalance;
                  draft.transactionStatus = checkSufficientBalance(
                    _transaction.sendAssetBalance,
                    _transaction.sendAmount
                  );
                }
              });
              break;
            case TransactingComponent.ADD_LIQUIDITY:
              setAddLiquidityTransaction(
                (draft: Draft<Transaction | undefined>) => {
                  if (draft && transaction.id === draft.id) {
                    draft.sendAssetBalance = _transaction.sendAssetBalance;
                    draft.receiveAssetBalance =
                      _transaction.receiveAssetBalance;
                    draft.transactionStatus = checkSufficientBalance(
                      _transaction.sendAssetBalance,
                      _transaction.sendAmount
                    );
                  }
                }
              );
              break;
            case TransactingComponent.REMOVE_LIQUIDITY:
              setRemoveLiquidityTransaction(
                (draft: Draft<Transaction | undefined>) => {
                  if (draft && transaction.id === draft.id) {
                    draft.sendAssetBalance = _transaction.sendAssetBalance;
                    draft.receiveAssetBalance =
                      _transaction.receiveAssetBalance;
                    draft.transactionStatus = checkSufficientBalance(
                      _transaction.sendAssetBalance,
                      _transaction.sendAmount
                    );
                  }
                }
              );
              break;
          }
          updated = true;
        })
        .catch((e) => {
          updated = false;
        });
      return updated;
    },
    [
      getBalances,
      setAddLiquidityTransaction,
      setRemoveLiquidityTransaction,
      setSwapTransaction,
    ]
  );

  const updateStatus = useCallback(
    (component: TransactingComponent, transactionStatus: TransactionStatus) => {
      switch (component) {
        case TransactingComponent.SWAP:
          setSwapTransaction((draft: Draft<Transaction | undefined>) => {
            if (draft) {
              draft.transactionStatus = transactionStatus;
            }
          });
          break;
        case TransactingComponent.ADD_LIQUIDITY:
          setAddLiquidityTransaction(
            (draft: Draft<Transaction | undefined>) => {
              if (draft) {
                draft.transactionStatus = transactionStatus;
              }
            }
          );
          break;
        case TransactingComponent.REMOVE_LIQUIDITY:
          setRemoveLiquidityTransaction(
            (draft: Draft<Transaction | undefined>) => {
              if (draft) {
                draft.transactionStatus = transactionStatus;
              }
            }
          );
          break;
      }
    },
    [
      setAddLiquidityTransaction,
      setSwapTransaction,
      setRemoveLiquidityTransaction,
    ]
  );
  const updateAmount = useCallback(
    (
      component: TransactingComponent,
      amountUpdateSend?: Amount,
      amountUpdateReceive?: Amount,
      slippageUpdate?: number
    ): boolean => {
      switch (component) {
        case TransactingComponent.SWAP:
          setSwapTransaction((draft: Draft<Transaction | undefined>) => {
            if (draft) {
              if (
                amountUpdateSend &&
                swapTransaction &&
                !swapTransaction.sendAmount[0].decimal.eq(
                  amountUpdateSend[0].decimal
                )
              ) {
                draft.sendAmount = amountUpdateSend;
                if (swapTransaction)
                  draft.transactionStatus = checkSufficientBalance(
                    swapTransaction.sendAssetBalance,
                    amountUpdateSend
                  );
              }
              if (
                amountUpdateReceive &&
                swapTransaction &&
                !swapTransaction.receiveAmount[0].decimal.eq(
                  amountUpdateReceive[0].decimal
                )
              ) {
                draft.receiveAmount = amountUpdateReceive;
              }
              if (
                slippageUpdate &&
                swapTransaction &&
                swapTransaction.slippage !== slippageUpdate
              )
                draft.slippage = slippageUpdate;
            }
          });
          break;
        case TransactingComponent.ADD_LIQUIDITY:
          setAddLiquidityTransaction(
            (draft: Draft<Transaction | undefined>) => {
              if (draft) {
                if (
                  amountUpdateSend &&
                  addLiquidityTransaction &&
                  !addLiquidityTransaction.sendAmount[0].decimal.eq(
                    amountUpdateSend[0].decimal
                  )
                ) {
                  draft.sendAmount = amountUpdateSend;
                  if (addLiquidityTransaction)
                    draft.transactionStatus = checkSufficientBalance(
                      addLiquidityTransaction.sendAssetBalance,
                      amountUpdateSend
                    );
                }
                if (
                  amountUpdateReceive &&
                  addLiquidityTransaction &&
                  !addLiquidityTransaction.receiveAmount[0].decimal.eq(
                    amountUpdateReceive[0].decimal
                  )
                ) {
                  draft.receiveAmount = amountUpdateReceive;
                }
                if (
                  slippageUpdate &&
                  addLiquidityTransaction &&
                  addLiquidityTransaction.slippage !== slippageUpdate
                )
                  draft.slippage = slippageUpdate;
              }
            }
          );
          break;
        case TransactingComponent.REMOVE_LIQUIDITY:
          setRemoveLiquidityTransaction(
            (draft: Draft<Transaction | undefined>) => {
              if (draft) {
                if (
                  amountUpdateSend &&
                  removeLiquidityTransaction &&
                  !removeLiquidityTransaction.sendAmount[0].decimal.eq(
                    amountUpdateSend[0].decimal
                  )
                ) {
                  draft.sendAmount = amountUpdateSend;
                  if (removeLiquidityTransaction)
                    draft.transactionStatus = checkSufficientBalance(
                      removeLiquidityTransaction.sendAssetBalance,
                      amountUpdateSend
                    );
                }
                if (
                  amountUpdateReceive &&
                  removeLiquidityTransaction &&
                  !removeLiquidityTransaction.receiveAmount[0].decimal.eq(
                    amountUpdateReceive[0].decimal
                  )
                ) {
                  draft.receiveAmount = amountUpdateReceive;
                }
                if (
                  slippageUpdate &&
                  removeLiquidityTransaction &&
                  removeLiquidityTransaction.slippage !== slippageUpdate
                )
                  draft.slippage = slippageUpdate;
              }
            }
          );
          break;
      }
      if (!amountUpdateSend || (!amountUpdateReceive && !slippageUpdate)) {
        return false;
      } else return true;
    },
    [
      addLiquidityTransaction,
      removeLiquidityTransaction,
      swapTransaction,
      setSwapTransaction,
      setAddLiquidityTransaction,
      setRemoveLiquidityTransaction,
    ]
  );

  useEffect(() => {
    if (client) {
      setIsWalletConnected(true);
      setWalletStatus(WalletStatus.READY);
    } else {
      setIsWalletConnected(false);
      setWalletStatus(WalletStatus.BUSY);
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
    setAddress,
    walletStatus,
    setWalletStatus,
    walletUser: walletUser(walletStatus, setWalletStatus),
    isWalletConnected,
    isReady: isReady(walletStatus),
    transactions,
    swapTransaction,
    addLiquidityTransaction,
    removeLiquidityTransaction,
    initialiseTransaction,
    updateStatus,
    updateBalance,
    updateAmount,
    getActiveTransaction,
    fetchTransaction,
    disconnect,
  };

  return (
    <WalletContext.Provider value={walletInfo}>
      {props.children}
    </WalletContext.Provider>
  );
}
