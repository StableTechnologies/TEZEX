import React, { useCallback, createContext, useEffect, useState } from "react";
import { Draft } from "immer";
import { useImmer } from "use-immer";

import { DAppClient } from "@airgap/beacon-sdk";
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
import { toAlertableError } from "../functions/util";

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
  // eslint-disable-next-line

  const network = useNetwork();
  const session = useSession();

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
        session.setAlert(toAlertableError(e as Errors));
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
  const getActiveTransaction = useCallback(
    (component: TransactingComponent): Transaction | undefined => {
      switch (component) {
        case TransactingComponent.SWAP:
          return swapTransaction;
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
            network.info.dex.address,
            toolkit
          )
            .then(() => {
              return updateBalances();
            })
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
    (component: TransactingComponent, transaction: Transaction) => {
      const _transaction: Transaction = updateBalanceTransaction(transaction);
      switch (component) {
        case TransactingComponent.SWAP:
          setSwapTransaction((draft: Draft<Transaction | undefined>) => {
            if (draft && transaction.id === draft.id) {
              draft.sendAssetBalance = _transaction.sendAssetBalance;
              draft.receiveAssetBalance = _transaction.receiveAssetBalance;
              draft.transactionStatus = _transaction.transactionStatus;
            }
          });
          break;
        case TransactingComponent.ADD_LIQUIDITY:
          setAddLiquidityTransaction(
            (draft: Draft<Transaction | undefined>) => {
              if (draft && transaction.id === draft.id) {
                draft.sendAssetBalance = _transaction.sendAssetBalance;
                draft.receiveAssetBalance = _transaction.receiveAssetBalance;
                draft.transactionStatus = _transaction.transactionStatus;
              }
            }
          );
          break;
        case TransactingComponent.REMOVE_LIQUIDITY:
          setRemoveLiquidityTransaction(
            (draft: Draft<Transaction | undefined>) => {
              if (draft && transaction.id === draft.id) {
                draft.sendAssetBalance = _transaction.sendAssetBalance;
                draft.receiveAssetBalance = _transaction.receiveAssetBalance;
                draft.transactionStatus = _transaction.transactionStatus;
              }
            }
          );
          break;
      }
      return true;
    },
    [
      updateBalanceTransaction,
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
                if (swapTransaction && isWalletConnected)
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
                  if (addLiquidityTransaction && isWalletConnected)
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
                  if (removeLiquidityTransaction && isWalletConnected)
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
