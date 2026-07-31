import React, {
  useCallback,
  createContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { current, Draft, produce } from "immer";
import { useImmer } from "use-immer";
import { Mutex } from "async-mutex";
import { AccountInfo, DAppClient } from "@airgap/beacon-dapp";
import {
  Transaction,
  Asset,
  AssetBalance,
  Balance,
  TransactionStatus,
  TransactingComponent,
  Amount,
  AssetOrAssetPair,
  CompletionState,
  Token,
} from "../types/general";
import { eq, isNumber } from "lodash";
import { processTransaction } from "../functions/transactions";
import { useNetwork } from "../hooks/network";
import { useSession } from "../hooks/session";
import { v4 as uuidv4 } from "uuid";
import { BigNumber } from "bignumber.js";
import {
  createDAppClient,
  disposeDAppClient,
  getBalance,
  subscribeToActiveAccount,
} from "../functions/beacon";
import {
  completionRecordFailed,
  completionRecordSuccess,
} from "../functions/util";
import { WritableDraft } from "immer/dist/types/types-external";
import { estimateWithAdapter } from "../functions/estimates";
import {
  applyQuoteResult,
  createQuoteGuardedDAppClient,
  createQuoteRequest,
  createTransactionQuote,
  hasFreshTransactionQuote,
  QuoteContext,
  QuoteRequest,
  quoteRequestMatches,
  transactionResultMatchesActive,
} from "../functions/quoteSafety";
import {
  getStatusAfterBalanceCheck,
  isValidSlippage,
  shouldApplySlippageUpdate,
  shouldApplyTransactionStatus,
  XTZ_FEE_RESERVE_TEZ,
} from "../functions/transactionSafety";
import {
  accountMatchesConfiguredNetwork,
  createConfiguredNetworkIdentity,
  createGuardedDAppClient,
  networkIdentityFingerprint,
  WalletIdentityError,
} from "../functions/walletIdentity";

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
  address: string | null;
  syncActiveAccount: (
    sourceClient: DAppClient,
    account: AccountInfo | undefined
  ) => boolean;
  isWalletConnected: boolean;
  disconnect: () => Promise<void>;
  initialiseTransaction: (
    component: TransactingComponent,
    sendAsset: AssetOrAssetPair,
    receiveAsset: AssetOrAssetPair,
    poolId: string,
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
  refreshTransactionQuote: (
    component: TransactingComponent,
    amountUpdateSend?: Amount,
    slippageUpdate?: number
  ) => Promise<boolean>;
  prepareTransactionForSubmission: (
    component: TransactingComponent
  ) => Promise<boolean>;
  invalidateTransactionQuote: (
    component: TransactingComponent,
    transactionStatus: TransactionStatus
  ) => Promise<void>;
  getActiveTransaction: (
    component: TransactingComponent
  ) => Transaction | undefined;
  clearTransaction: (component: TransactingComponent) => void;
}

const defaultWalletInfo: WalletInfo = {
  client: null,
  address: null,
  syncActiveAccount: () => {
    throw new Error("syncActiveAccount called outside of wallet provider");
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
  refreshTransactionQuote: async () => {
    throw new Error(
      "refreshTransactionQuote called outside of wallet provider"
    );
  },
  prepareTransactionForSubmission: async () => {
    throw new Error(
      "prepareTransactionForSubmission called outside of wallet provider"
    );
  },
  invalidateTransactionQuote: async () => {
    throw new Error(
      "invalidateTransactionQuote called outside of wallet provider"
    );
  },
  getActiveTransaction: () => {
    throw new Error("getActiveTransaction called outside of wallet provider");
  },
  clearTransaction: () => {
    throw new Error("clearTransaction called outside of wallet provider");
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
  const transactionMutex = useRef(new Mutex()).current;
  const transactionUpdateMutex = useRef(new Mutex()).current;
  const processingTransactionIds = useRef(new Set<string>()).current;
  const latestQuoteRequests = useRef(
    new Map<TransactingComponent, QuoteRequest>()
  ).current;
  const latestTransactionInitializations = useRef(
    new Map<TransactingComponent, symbol>()
  ).current;
  type TransactionState = {
    [key in TransactingComponent]?: Transaction;
  };
  type TransactionStateUpdate =
    | TransactionState
    | ((draft: Draft<TransactionState>) => void);
  const [transactions, setTransactionState] = useImmer<TransactionState>({});
  const transactionsRef = useRef<TransactionState>({});
  const setTransactions = useCallback(
    (update: TransactionStateUpdate): void => {
      const nextTransactions =
        typeof update === "function"
          ? produce(transactionsRef.current, update)
          : update;
      transactionsRef.current = nextTransactions;
      setTransactionState(nextTransactions);
    },
    []
  );

  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [client, setClient] = useState<DAppClient | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const hasReconnectedRef = useRef(false);
  const quoteContextRef = useRef<QuoteContext>({
    account: address,
    network: network.network,
    chainId: network.info.chainId,
  });
  quoteContextRef.current = {
    account: address,
    network: network.network,
    chainId: network.info.chainId,
  };
  const networkRef = useRef(network);
  networkRef.current = network;

  const [assetBalances, setAssetBalances] = useState<AssetBalance[]>(
    network.info.assets.map((asset) => {
      return { balance: undefined, asset: asset };
    })
  );
  const configuredNetworkIdentity = useMemo(
    () =>
      createConfiguredNetworkIdentity({
        type: network.network,
        chainId: network.info.chainId,
        primaryRpcUrl: network.info.tezosServer,
        fallbackRpcUrls: network.info.rpcFallbacks,
      }),
    [
      network.info.chainId,
      network.info.rpcFallbacks,
      network.info.tezosServer,
      network.network,
    ]
  );
  const configuredNetworkFingerprint = networkIdentityFingerprint(
    configuredNetworkIdentity
  );
  const addressRef = useRef<string | null>(null);
  const activeAccountIdentifierRef = useRef<string | null>(null);
  const connectionRevisionRef = useRef(0);

  const clearWalletDerivedState = useCallback(() => {
    processingTransactionIds.clear();
    latestQuoteRequests.clear();
    latestTransactionInitializations.clear();
    setTransactions({});
    setAssetBalances(
      networkRef.current.info.assets.map((asset) => ({
        balance: undefined,
        asset,
      }))
    );
  }, [
    latestQuoteRequests,
    latestTransactionInitializations,
    processingTransactionIds,
    setTransactions,
  ]);

  const syncActiveAccount = useCallback(
    (sourceClient: DAppClient, account: AccountInfo | undefined): boolean => {
      connectionRevisionRef.current += 1;
      clearWalletDerivedState();

      if (
        !account ||
        !accountMatchesConfiguredNetwork(
          account,
          createConfiguredNetworkIdentity({
            type: networkRef.current.network,
            chainId: networkRef.current.info.chainId,
            primaryRpcUrl: networkRef.current.info.tezosServer,
            fallbackRpcUrls: networkRef.current.info.rpcFallbacks,
          })
        )
      ) {
        addressRef.current = null;
        activeAccountIdentifierRef.current = null;
        setAddress(null);
        setClient(null);
        return false;
      }

      addressRef.current = account.address;
      activeAccountIdentifierRef.current = account.accountIdentifier;
      setAddress(account.address);
      setClient(sourceClient);
      return true;
    },
    [clearWalletDerivedState]
  );
  const syncActiveAccountRef = useRef(syncActiveAccount);
  syncActiveAccountRef.current = syncActiveAccount;
  const initialNetworkRef = useRef(network);

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

  useEffect(() => {
    latestQuoteRequests.clear();
    latestTransactionInitializations.clear();
    setTransactions({});
  }, [
    latestQuoteRequests,
    latestTransactionInitializations,
    network.network,
    network.info.chainId,
    setTransactions,
  ]);
  // Auto-reconnect on mount (ONCE)
  useEffect(() => {
    const autoReconnect = async () => {
      if (hasReconnectedRef.current) {
        return;
      }

      hasReconnectedRef.current = true;

      try {
        const dAppClient = createDAppClient(initialNetworkRef.current);

        await subscribeToActiveAccount(dAppClient, (account) => {
          const accepted = syncActiveAccountRef.current(dAppClient, account);
          if (account && !accepted) {
            void disposeDAppClient(dAppClient).catch((cleanupError) =>
              console.warn(
                "Could not clean up the rejected Beacon session:",
                cleanupError
              )
            );
          }
        });

        const activeAccount = await dAppClient.getActiveAccount();

        if (!syncActiveAccountRef.current(dAppClient, activeAccount)) {
          await disposeDAppClient(dAppClient);
        }
      } catch (error) {
        console.error("Auto-reconnect failed:", error);
      }
    };

    autoReconnect();
  }, []);

  // callback to update state of asset balances
  const updateBalances = useCallback(async () => {
    if (address && network.toolkit && client) {
      // get balances of all assets by mapping over current asset balances
      const _assetBalances: AssetBalance[] = await Promise.all(
        assetBalances.map(async (assetBalance: AssetBalance) => {
          return {
            balance: await getBalance(
              network.toolkit,
              network.network,
              address,
              assetBalance.asset
            ),
            asset: assetBalance.asset,
          };
        })
      );
      //only update if balances have changed
      if (!eq(_assetBalances, assetBalances)) setAssetBalances(_assetBalances);
    }
  }, [assetBalances, address, network.toolkit, client]);

  // load / update balances on wallet connection
  useEffect(() => {
    const _updateBalances = async () => {
      await updateBalances();
    };
    _updateBalances();
  }, [isWalletConnected]);

  // Track the full canonical identity so two CUSTOM networks never compare equal.
  const previousNetworkRef = useRef(configuredNetworkFingerprint);

  // Disconnect wallet when network changes
  useEffect(() => {
    const handleNetworkSwitch = async () => {
      if (previousNetworkRef.current !== configuredNetworkFingerprint) {
        previousNetworkRef.current = configuredNetworkFingerprint;
        connectionRevisionRef.current += 1;
        addressRef.current = null;
        activeAccountIdentifierRef.current = null;
        clearWalletDerivedState();
        setAddress(null);
        setClient(null);

        if (client) {
          try {
            await disposeDAppClient(client);
          } catch (error) {
            console.error("Error clearing Beacon account:", error);
          }
        }
      }
    };

    handleNetworkSwitch();
  }, [client, clearWalletDerivedState, configuredNetworkFingerprint]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateBalances();
    }, 15000);

    return () => clearInterval(interval);
  }, [updateBalances]);

  // callback to return the active transaction of a component
  const getActiveTransaction = useCallback(
    (component: TransactingComponent): Transaction | undefined => {
      return transactionsRef.current[component];
    },
    []
  );

  const clearTransaction = useCallback(
    (component: TransactingComponent) => {
      latestQuoteRequests.delete(component);
      latestTransactionInitializations.delete(component);
      setTransactions((draft) => {
        delete draft[component];
      });
    },
    [latestQuoteRequests, latestTransactionInitializations, setTransactions]
  );

  // calback to send a transaction for final processing
  const transact = useCallback(
    async (transaction: Transaction): Promise<Transaction> => {
      // if the wallet is connected and the toolkit is defined
      if (networkRef.current.toolkit && client) {
        // if the transaction is pending process it
        if (transaction.transactionStatus === TransactionStatus.PENDING) {
          let submittedHash: string | undefined;

          try {
            if (
              !hasFreshTransactionQuote(
                transaction,
                quoteContextRef.current,
                true
              )
            ) {
              throw new Error(
                "Transaction quote changed before wallet submission"
              );
            }

            const submission = transaction.submissionContext;
            if (!submission) {
              throw new WalletIdentityError(
                "This transaction was not prepared for the active wallet session."
              );
            }

            const activeNetwork = networkRef.current;
            const adapter = activeNetwork.getPoolAdapter(transaction.poolId);
            if (adapter.poolConfig.address !== submission.recipient) {
              throw new WalletIdentityError(
                "The active pool recipient changed after this transaction was prepared."
              );
            }

            const allowedDestinations = Array.from(
              new Set(
                [
                  submission.recipient,
                  ...transaction.sendAsset.map((asset) => asset.address),
                  ...transaction.receiveAsset.map((asset) => asset.address),
                ].filter(Boolean)
              )
            );
            const identityGuardedClient = createGuardedDAppClient({
              client,
              submission,
              transactionNetwork: transaction.network,
              allowedDestinations,
              getRuntime: () => {
                const currentNetwork = networkRef.current;
                return {
                  address: addressRef.current,
                  accountIdentifier: activeAccountIdentifierRef.current,
                  connectionRevision: connectionRevisionRef.current,
                  network: createConfiguredNetworkIdentity({
                    type: currentNetwork.network,
                    chainId: currentNetwork.info.chainId,
                    primaryRpcUrl: currentNetwork.info.tezosServer,
                    fallbackRpcUrls: currentNetwork.info.rpcFallbacks,
                  }),
                  rpcUrl: currentNetwork.toolkit.rpc.getRpcUrl(),
                  readChainId: () => currentNetwork.toolkit.rpc.getChainId(),
                };
              },
            });
            const guardedClient = createQuoteGuardedDAppClient({
              client: identityGuardedClient,
              transaction,
              getActiveTransaction: () =>
                transactionsRef.current[transaction.component],
              getRuntime: () => {
                const currentNetwork = networkRef.current;
                return {
                  context: { ...quoteContextRef.current },
                  readChainId: () => currentNetwork.toolkit.rpc.getChainId(),
                };
              },
            });

            const success = await processTransaction(
              transaction,
              submission.owner,
              { toolkit: activeNetwork.toolkit, client: guardedClient },
              {
                onSubmitted: (opHash) => {
                  submittedHash = opHash;
                  setTransactions((draft) => {
                    const activeTransaction = draft[transaction.component];
                    if (activeTransaction?.id !== transaction.id) return;

                    activeTransaction.operationHash = opHash;
                    activeTransaction.transactionStatus =
                      TransactionStatus.SUBMITTED;
                    activeTransaction.lastModified = new Date();
                  });
                },
              }
            );

            session.setAlert(completionRecordSuccess(success), true);
            try {
              await updateBalances();
            } catch (balanceError) {
              // Confirmation is authoritative. A secondary balance refresh
              // must never turn a confirmed operation into a retryable failure.
              console.warn(
                "Post-confirmation balance refresh failed:",
                balanceError
              );
            }

            return {
              ...transaction,
              operationHash: success.opHash,
              transactionStatus: TransactionStatus.COMPLETED,
            };
          } catch (error: unknown) {
            if (error instanceof WalletIdentityError) {
              connectionRevisionRef.current += 1;
              addressRef.current = null;
              activeAccountIdentifierRef.current = null;
              clearWalletDerivedState();
              setAddress(null);
              setClient(null);
              void disposeDAppClient(client).catch((cleanupError) =>
                console.warn(
                  "Could not clean up the stale Beacon session:",
                  cleanupError
                )
              );
            }
            const completionRecord = completionRecordFailed(
              error,
              transaction.component,
              transaction.network
            );
            session.setAlert(completionRecord, true);

            const failure =
              completionRecord[0] === CompletionState.FAILED
                ? completionRecord[1]
                : undefined;
            const confirmationUnknown =
              failure?.submitted && failure.safeToRetry === false;

            return {
              ...transaction,
              operationHash: failure?.opHash ?? submittedHash,
              transactionStatus: confirmationUnknown
                ? TransactionStatus.CONFIRMATION_UNKNOWN
                : TransactionStatus.FAILED,
            };
          }
        } else {
          return transaction;
        }
      } else throw Error("wallet not Connected");
    },
    [clearWalletDerivedState, client, session, setTransactions, updateBalances]
  );

  // Effect to monitor transactions and send them for processing
  useEffect(() => {
    processingTransactionIds.forEach((transactionId) => {
      const activeTransaction = Object.values(transactions).find(
        (transaction) => transaction?.id === transactionId
      );

      if (
        !activeTransaction ||
        (activeTransaction.transactionStatus !== TransactionStatus.PENDING &&
          activeTransaction.transactionStatus !== TransactionStatus.SUBMITTED)
      ) {
        processingTransactionIds.delete(transactionId);
      }
    });

    // process a transaction
    const proc = async (component: TransactingComponent) => {
      return transactionMutex.runExclusive(async () => {
        const currentTransaction = transactions[component];
        // if there is a transaction and it is pending and not locked
        if (
          currentTransaction &&
          currentTransaction.transactionStatus === TransactionStatus.PENDING &&
          !currentTransaction.locked &&
          !processingTransactionIds.has(currentTransaction.id)
        ) {
          // React can re-run effects with a stale transaction snapshot. Keep an
          // attempt-level guard so the same transaction cannot be submitted twice.
          processingTransactionIds.add(currentTransaction.id);
          // lock transaction
          setTransactions((draft) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            draft[component]!.locked = true;
          });
          // send transaction for final processing
          const updatedTransaction = await transact(currentTransaction).then(
            (transaction) => {
              // unlock transaction copy
              transaction.locked = false;
              return transaction;
            }
          );
          setTransactions((draft) => {
            if (
              transactionResultMatchesActive(
                draft[component],
                updatedTransaction
              )
            ) {
              draft[component] = updatedTransaction;
            }
          });
        }
      });
    };

    // process all pending transactions
    Promise.all([
      proc(TransactingComponent.SWAP),
      proc(TransactingComponent.ADD_LIQUIDITY),
      proc(TransactingComponent.REMOVE_LIQUIDITY),
    ]).then(() => {
      //
    });
  }, [transact, transactions, setTransactions]);

  // callback to set the active transaction of a component or apply an operation to the transaction
  const setActiveTransaction = useCallback(
    (
      component: TransactingComponent,
      transaction?: Transaction,
      op?: (transaction: Draft<Transaction>) => boolean
    ): boolean => {
      let updated = false;
      // get the active transaction of the component
      const activeTransaction = getActiveTransaction(component);
      setTransactions((draft) => {
        const draftTransaction = draft[component];
        if (op && draftTransaction) {
          // if there is an operation apply it to the transaction
          updated = op(draftTransaction as Draft<Transaction>);
        } else if (
          transaction &&
          !eq(JSON.stringify(activeTransaction), JSON.stringify(transaction))
        ) {
          draft[component] = transaction;
          updated = true;
        }
      });
      return updated;
    },
    [setTransactions]
  );

  // callback to initialise a transaction
  const initialiseTransaction = useCallback(
    async (
      component: TransactingComponent,
      sendAsset: AssetOrAssetPair,
      receiveAsset: AssetOrAssetPair,
      poolId: string,
      sendAmount?: Amount,
      receiveAmount?: Amount,
      slipppage = 0.5
    ): Promise<boolean> => {
      const initializationToken = Symbol("transaction initialization");
      latestQuoteRequests.delete(component);
      latestTransactionInitializations.set(component, initializationToken);
      return await transactionUpdateMutex.runExclusive(async () => {
        const quoteContext = { ...quoteContextRef.current };
        const activeNetwork = networkRef.current;
        const adapter = activeNetwork.getPoolAdapter(poolId);
        const submissionNetwork = createConfiguredNetworkIdentity({
          type: activeNetwork.network,
          chainId: activeNetwork.info.chainId,
          primaryRpcUrl: activeNetwork.info.tezosServer,
          fallbackRpcUrls: activeNetwork.info.rpcFallbacks,
        });
        // initialise zeroBalance
        const initBalance = (asset: AssetOrAssetPair): Amount => {
          switch (asset.length) {
            case 1:
              return [zeroBalance];
            case 2:
              return [zeroBalance, zeroBalance];
          }
        };
        // if no send or recieve amount is provided initialise them to zero balance
        const send: Amount = sendAmount ? sendAmount : initBalance(sendAsset);
        const receive: Amount = receiveAmount
          ? receiveAmount
          : initBalance(receiveAsset);

        const _transaction: Transaction = {
          id: uuidv4(),

          network: activeNetwork.network,
          component,
          poolId,
          sendAsset,
          sendAmount: send,
          sendAssetBalance: initBalance(sendAsset),
          receiveAsset,
          receiveAmount: receive,
          receiveAssetBalance: initBalance(receiveAsset),
          transactionStatus: TransactionStatus.INITIALIZED,
          slippage: slipppage,
          submissionContext: {
            owner: addressRef.current ?? "",
            accountIdentifier: activeAccountIdentifierRef.current ?? "",
            recipient: adapter.poolConfig.address,
            networkType: submissionNetwork.type,
            chainId: submissionNetwork.chainId,
            rpcUrl: submissionNetwork.primaryRpcUrl,
            connectionRevision: connectionRevisionRef.current,
          },
          lastModified: new Date(),
          locked: false,
          quoteRevision: 0,
        };

        let transaction: Transaction = _transaction;

        transaction = await estimateWithAdapter(
          _transaction,
          activeNetwork.toolkit,
          adapter
        );

        const currentQuoteContext = quoteContextRef.current;
        if (
          latestTransactionInitializations.get(component) !==
            initializationToken ||
          quoteContext.account !== currentQuoteContext.account ||
          quoteContext.network !== currentQuoteContext.network ||
          quoteContext.chainId !== currentQuoteContext.chainId
        ) {
          return false;
        }

        const quotedTransaction: Transaction = {
          ...transaction,
          quoteRevision: 1,
        };
        transaction = {
          ...quotedTransaction,
          quote: createTransactionQuote(quotedTransaction, quoteContext, 1),
        };

        latestTransactionInitializations.delete(component);

        return setActiveTransaction(component, transaction);
      });
    },
    [setActiveTransaction, transactionUpdateMutex]
  );

  // function to check if a user has sufficient balance
  const checkSufficientBalance = useCallback(
    (
      userBalance: Amount,
      requiredAmount: Amount,
      requiredAssets: AssetOrAssetPair
    ): TransactionStatus => {
      // Amounts to compare must be of same length( currently : a single asset or an asset pair)
      if (userBalance.length !== requiredAmount.length) {
        throw Error("Error: balance check asset pair mismatch");
      }
      // check if the user has sufficient balance by comparing the two amounts
      const checks: boolean[] = Array.from(
        userBalance,
        (assetBalance, index) => {
          const required = requiredAmount[index];
          if (required) {
            return assetBalance.greaterOrEqualTo(required);
          } else throw Error("Amount indexs don't match / align");
        }
      );
      const xtzAsset = network.info.assets.find(
        (asset) => asset.name === Token.XTZ
      );
      const requiredXtz = requiredAssets.reduce((total, asset, index) => {
        if (asset.name !== Token.XTZ) return total;
        return total.plus(requiredAmount[index]?.decimal ?? 0);
      }, new BigNumber(0));
      const hasFeeReserve = xtzAsset
        ? findAssetBalance(xtzAsset).decimal.isGreaterThanOrEqualTo(
            requiredXtz.plus(XTZ_FEE_RESERVE_TEZ)
          )
        : false;

      // Every operation is paid in tez, including token-only swaps. Require a
      // small fee reserve in addition to the assets sent to the pool.
      const hasSufficientBalance = !checks.includes(false) && hasFeeReserve;
      if (hasSufficientBalance) {
        return TransactionStatus.SUFFICIENT_BALANCE;
      } else {
        return TransactionStatus.INSUFFICIENT_BALANCE;
      }
    },
    [findAssetBalance, network.info.assets]
  );

  // callback to update balances and status of a transaction balance for a given transaction
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
        transaction.sendAmount,
        transaction.sendAsset
      );
      return {
        ...transaction,
        sendAssetBalance,
        receiveAssetBalance,
        transactionStatus: getStatusAfterBalanceCheck(
          transaction.transactionStatus,
          balanceStatus
        ),
      };
    },
    [checkSufficientBalance, getBalancesOfAssets]
  );

  // callback to update balances of all transactions
  const updateBalancesOfAllTransactions = useCallback(async () => {
    await transactionUpdateMutex.runExclusive(() => {
      // iterate over all transactions
      Object.entries(transactions).forEach(([key, transaction]) => {
        // key is the component
        const component = key as TransactingComponent;
        // if the transaction is defined
        if (transaction) {
          // get the new transaction with updated balances
          const updatedTransaction = TranscationWithUpdatedBalance(transaction);

          // old transaction before balance update
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          const t = transactions[component]!;
          // if the new transaction is different from the old one update the state
          if (t && !eq(JSON.stringify(updatedTransaction), JSON.stringify(t))) {
            setTransactions((draft) => {
              updateTransaction(draft[component], (transaction) => {
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
            });
          }
        }
      });
    });
  }, [transactions, TranscationWithUpdatedBalance, setTransactions]);

  // Effect to update balances of all transactions on change of balances
  useEffect(() => {
    updateBalancesOfAllTransactions();
  }, [assetBalances, updateBalancesOfAllTransactions]);

  // exported callback to update transaction balance of a  single component
  const updateTransactionBalance = useCallback(
    async (component: TransactingComponent): Promise<boolean> => {
      const transaction = getActiveTransaction(component);
      const transactionId = transaction?.id;
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
                transaction.id === transactionId
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

  // exported callback to update transaction status of a  single component
  const updateStatus = useCallback(
    async (
      component: TransactingComponent,
      transactionStatus: TransactionStatus
    ) => {
      await transactionUpdateMutex.runExclusive(() => {
        setTransactions((draft) => {
          updateTransaction(
            draft[component],
            // update function
            (transaction) => {
              if (
                !shouldApplyTransactionStatus(
                  transaction.transactionStatus,
                  transactionStatus
                )
              ) {
                return false;
              }

              transaction.transactionStatus = transactionStatus;
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              draft[component]!.lastModified = new Date();
              return true;
            }
          );
        });
      });
    },
    [setTransactions]
  );

  // update transaction status based on balance for a single draft transaction
  // for use with update amount function
  const updateTransactionStatusBasedOnBalance = (
    transaction: WritableDraft<Transaction>,
    amountUpdateSend?: Amount
  ) => {
    const sendAssetBalance: Amount = transaction.sendAssetBalance.map(
      (balance) => ({ ...balance })
    ) as Amount;
    // if the send amount has changed update the transaction status and balance
    if (
      amountUpdateSend &&
      !transaction.sendAmount[0].decimal.eq(amountUpdateSend[0].decimal)
    ) {
      transaction.sendAmount = amountUpdateSend;
      if (isWalletConnected) {
        transaction.transactionStatus = getStatusAfterBalanceCheck(
          transaction.transactionStatus,
          checkSufficientBalance(
            sendAssetBalance,
            amountUpdateSend,
            transaction.sendAsset as AssetOrAssetPair
          )
        );
      }
      return true;
    }
    return false;
  };

  // Allows for safe update of a transaction draft
  const updateTransaction = (
    transaction: WritableDraft<Transaction> | undefined,
    updater: (transaction: WritableDraft<Transaction>) => boolean
  ): boolean => {
    // if the transaction is locked or undefined  return
    if (!transaction) return false;
    if (
      transaction.locked ||
      transaction.transactionStatus === TransactionStatus.PENDING ||
      transaction.transactionStatus === TransactionStatus.SUBMITTED ||
      transaction.transactionStatus ===
        TransactionStatus.CONFIRMATION_UNKNOWN ||
      transaction.transactionStatus === TransactionStatus.COMPLETED
    )
      return false;
    // else safe to update, run the updater

    return updater(transaction);
  };

  const invalidateTransactionQuote = useCallback(
    async (
      component: TransactingComponent,
      transactionStatus: TransactionStatus
    ): Promise<void> => {
      latestQuoteRequests.delete(component);
      await transactionUpdateMutex.runExclusive(() => {
        setTransactions((draft) => {
          updateTransaction(draft[component], (transaction) => {
            transaction.quoteRevision = (transaction.quoteRevision ?? 0) + 1;
            latestQuoteRequests.delete(component);
            delete transaction.quote;
            transaction.receiveAmount = transaction.receiveAsset.map(
              () => zeroBalance
            ) as Amount;
            transaction.transactionStatus = transactionStatus;
            transaction.lastModified = new Date();
            return true;
          });
        });
      });
    },
    [latestQuoteRequests, setTransactions, transactionUpdateMutex]
  );

  const runTransactionQuote = useCallback(
    async (
      component: TransactingComponent,
      amountUpdateSend?: Amount,
      slippageUpdate?: number,
      submitAfterRefresh = false
    ): Promise<boolean> => {
      latestQuoteRequests.delete(component);
      let pending:
        | { request: QuoteRequest; transaction: Transaction }
        | undefined;
      let updated = false;

      await transactionUpdateMutex.runExclusive(() => {
        setTransactions((draft) => {
          updated = updateTransaction(draft[component], (transaction) => {
            latestQuoteRequests.delete(component);
            if (isNumber(slippageUpdate) && !isValidSlippage(slippageUpdate)) {
              transaction.quoteRevision = (transaction.quoteRevision ?? 0) + 1;
              delete transaction.quote;
              transaction.receiveAmount = transaction.receiveAsset.map(
                () => zeroBalance
              ) as Amount;
              transaction.transactionStatus =
                TransactionStatus.INVALID_SLIPPAGE;
              transaction.lastModified = new Date();
              return true;
            }

            if (amountUpdateSend) {
              transaction.sendAmount = amountUpdateSend;
            }
            if (isNumber(slippageUpdate)) {
              transaction.slippage = slippageUpdate;
            }

            const revision = (transaction.quoteRevision ?? 0) + 1;
            transaction.quoteRevision = revision;
            delete transaction.quote;
            transaction.receiveAmount = transaction.receiveAsset.map(
              () => zeroBalance
            ) as Amount;
            transaction.lastModified = new Date();

            if (transaction.sendAmount[0].mantissa.isZero()) {
              transaction.transactionStatus = TransactionStatus.ZERO_AMOUNT;
              return true;
            }

            transaction.transactionStatus = TransactionStatus.MODIFIED;
            const transactionSnapshot = current(
              transaction as Draft<Transaction>
            ) as Transaction;
            pending = {
              request: createQuoteRequest(
                transactionSnapshot,
                quoteContextRef.current,
                revision
              ),
              transaction: transactionSnapshot,
            };
            latestQuoteRequests.set(component, pending.request);
            return true;
          });
        });
      });

      if (!pending) return updated;
      const pendingQuote = pending;

      let estimatedTransaction: Transaction;
      try {
        const adapter = network.getPoolAdapter(pendingQuote.transaction.poolId);
        estimatedTransaction = await estimateWithAdapter(
          pendingQuote.transaction,
          network.toolkit,
          adapter
        );
      } catch (error) {
        await transactionUpdateMutex.runExclusive(() => {
          setTransactions((draft) => {
            const activeTransaction = draft[component];
            if (
              activeTransaction &&
              latestQuoteRequests.get(component) === pendingQuote.request &&
              quoteRequestMatches(
                current(activeTransaction as Draft<Transaction>) as Transaction,
                quoteContextRef.current,
                pendingQuote.request
              )
            ) {
              activeTransaction.transactionStatus = TransactionStatus.FAILED;
              activeTransaction.lastModified = new Date();
            }
          });
        });
        console.error("Error refreshing transaction quote:", error);
        return false;
      }

      const isLatestRequest =
        latestQuoteRequests.get(component) === pendingQuote.request;
      await transactionUpdateMutex.runExclusive(() => {
        setTransactions((draft) => {
          const activeTransaction = draft[component];
          if (!activeTransaction) return;
          if (latestQuoteRequests.get(component) !== pendingQuote.request) {
            return;
          }

          const transactionSnapshot = current(
            activeTransaction as Draft<Transaction>
          ) as Transaction;
          const balanceStatus = isWalletConnected
            ? checkSufficientBalance(
                transactionSnapshot.sendAssetBalance,
                estimatedTransaction.sendAmount,
                transactionSnapshot.sendAsset
              )
            : TransactionStatus.INITIALIZED;
          const nextStatus =
            submitAfterRefresh &&
            balanceStatus === TransactionStatus.SUFFICIENT_BALANCE
              ? TransactionStatus.PENDING
              : balanceStatus;
          const quotedTransaction = applyQuoteResult(
            transactionSnapshot,
            estimatedTransaction,
            quoteContextRef.current,
            pendingQuote.request,
            nextStatus,
            nextStatus === TransactionStatus.PENDING
          );

          if (quotedTransaction) {
            draft[component] = quotedTransaction as WritableDraft<Transaction>;
          }
        });
      });

      return isLatestRequest;
    },
    [
      checkSufficientBalance,
      isWalletConnected,
      latestQuoteRequests,
      network,
      setTransactions,
      transactionUpdateMutex,
    ]
  );

  const refreshTransactionQuote = useCallback(
    async (
      component: TransactingComponent,
      amountUpdateSend?: Amount,
      slippageUpdate?: number
    ): Promise<boolean> =>
      runTransactionQuote(component, amountUpdateSend, slippageUpdate),
    [runTransactionQuote]
  );

  const prepareTransactionForSubmission = useCallback(
    async (component: TransactingComponent): Promise<boolean> =>
      runTransactionQuote(component, undefined, undefined, true),
    [runTransactionQuote]
  );

  const previousQuoteAccountRef = useRef<string | null>(address);
  useEffect(() => {
    if (previousQuoteAccountRef.current === address) return;
    previousQuoteAccountRef.current = address;

    Object.values(TransactingComponent).forEach((component) => {
      const transaction = transactions[component];
      if (!transaction) return;

      if (address) {
        void refreshTransactionQuote(component);
      } else {
        const status = transaction.sendAmount[0].mantissa.isZero()
          ? TransactionStatus.ZERO_AMOUNT
          : TransactionStatus.INITIALIZED;
        void invalidateTransactionQuote(component, status);
      }
    });
  }, [
    address,
    invalidateTransactionQuote,
    refreshTransactionQuote,
    transactions,
  ]);

  // exported callback to update amount of a  single component
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
            // update function
            (transaction) => {
              // if receive amount has changed update the transaction
              if (
                amountUpdateReceive &&
                !transaction.receiveAmount[0].decimal.eq(
                  amountUpdateReceive[0].decimal
                )
              ) {
                transaction.receiveAmount = amountUpdateReceive;
                updated = true;
              }
              // if slippage has changed update the transaction
              if (
                isNumber(slippageUpdate) &&
                shouldApplySlippageUpdate(
                  transaction.slippage,
                  slippageUpdate,
                  transaction.transactionStatus
                )
              ) {
                if (isValidSlippage(slippageUpdate)) {
                  transaction.slippage = slippageUpdate;
                  if (isWalletConnected) {
                    transaction.transactionStatus = checkSufficientBalance(
                      transaction.sendAssetBalance as Amount,
                      transaction.sendAmount as Amount,
                      transaction.sendAsset as AssetOrAssetPair
                    );
                  }
                } else {
                  transaction.transactionStatus =
                    TransactionStatus.INVALID_SLIPPAGE;
                }
                updated = true;
              }
              // update the transaction status based on the new balance
              return (
                updateTransactionStatusBasedOnBalance(
                  transaction,
                  amountUpdateSend
                ) || updated
              );
            }
          );
          // if updated, update the last modified date
          const activeTransaction = draft[component];
          if (wasUpdated && activeTransaction) {
            activeTransaction.lastModified = new Date();
            // Any legacy direct amount update invalidates the quote. Quote
            // results are installed only through the revision-checked path.
            activeTransaction.quoteRevision =
              (activeTransaction.quoteRevision ?? 0) + 1;
            latestQuoteRequests.delete(component);
            delete activeTransaction.quote;
          } else {
            updated = false;
          }
        });
      });
      return updated;
    },
    [checkSufficientBalance, setTransactions, isWalletConnected]
  );

  // update the wallet connection state
  useEffect(() => {
    if (client) {
      setIsWalletConnected(true);
    } else {
      setIsWalletConnected(false);
    }
  }, [client]);

  // disconnect wallet
  const disconnect = async () => {
    connectionRevisionRef.current += 1;
    addressRef.current = null;
    activeAccountIdentifierRef.current = null;
    clearWalletDerivedState();
    if (client) {
      await disposeDAppClient(client);
    }
    setClient(null);
    setAddress(null);
  };

  const walletInfo: WalletInfo = {
    client,
    address,
    syncActiveAccount,
    isWalletConnected,
    initialiseTransaction,
    updateStatus,
    updateTransactionBalance,
    updateAmount,
    refreshTransactionQuote,
    prepareTransactionForSubmission,
    invalidateTransactionQuote,
    getActiveTransaction,
    disconnect,
    clearTransaction,
  };

  return (
    <WalletContext.Provider value={walletInfo}>
      {props.children}
    </WalletContext.Provider>
  );
}
