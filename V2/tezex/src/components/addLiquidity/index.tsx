import React, { FC, useState, useEffect, useCallback } from "react";

import { Wallet } from "../wallet";
import { NavLiquidity } from "../nav/NavLiquidity";
import {
  Token,
  Asset,
  TransactingComponent,
  TransferType,
  TransactionStatus,
  Id,
} from "../../types/general";

import { UserAmountField, Slippage } from "../../components/ui/elements/inputs";
import { useSession } from "../../hooks/session";
import { useWallet, useWalletOps, WalletOps } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";

import Grid2 from "@mui/material/Unstable_Grid2";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import style from "./style";
import useStyles from "../../hooks/styles";
import Box from "@mui/material/Box";
import { useTransaction } from "../../hooks/transaction";
import { eq } from "lodash";
import { PoolSelector } from "../ui/elements/PoolSelector";
import { SwapUpDownToggle } from "../ui/elements/Toggles";
import { getBalance } from "../../functions/beacon";
import { BigNumber } from "bignumber.js";
import { TradingLoadingState } from "../ui/elements/loading/TezexLoading";
import { PoolConfig } from "../../types/pools";

export interface IAddLiquidity {
  orientation: "portrait" | "landscape";
  routePool?: PoolConfig;
  onPoolRouteChange?: (pool: PoolConfig) => void;
}
export const AddLiquidity: FC<IAddLiquidity> = ({
  routePool,
  onPoolRouteChange,
}) => {
  //return <div> Add Liquidity</div>;
  const scalingKey = "addLiquidity";
  // load styles and apply responsive scaling for component
  const styles = useStyles(style, scalingKey, false);
  const network = useNetwork();
  const wallet = useWallet();

  // load wallet operations for component
  const walletOps: WalletOps = useWalletOps(TransactingComponent.ADD_LIQUIDITY);

  // load transaction operations for component
  const transactionOps = useTransaction(TransactingComponent.ADD_LIQUIDITY);

  // TODO: : remove this and use transactionOps.getActiveTransaction to pass to wallet
  const active = walletOps.getActiveTransaction();

  const [id, setId] = useState<Id | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloading, setReloading] = useState<boolean>(true);
  const previewLoading =
    process.env.NODE_ENV === "development" &&
    new URLSearchParams(window.location.search).has("loading");

  const send1 = 0;
  const send2 = 1;
  const receive = 2;

  const currentPool = routePool || network.selectedPool;

  const [poolBalances, setPoolBalances] = useState<Map<string, string>>(
    new Map()
  );

  const getLPToken = useCallback(
    (pool: typeof currentPool): Asset => {
      if (!pool) return network.getAsset(Token.Sirs);
      return network.getAsset(pool.lpToken);
    },
    [network]
  );

  const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
    network.getAsset(currentPool?.tokenA || Token.XTZ),
    network.getAsset(currentPool?.tokenB || Token.TzBTC),
    getLPToken(currentPool),
  ]);

  const handlePoolChange = useCallback(
    async (newPoolId: string) => {
      const pool = network.getAllPools().find((p) => p.id === newPoolId);
      if (!pool) return;

      network.setSelectedPool(pool);
      const newAssets: [Asset, Asset, Asset] = [
        network.getAsset(pool.tokenA),
        network.getAsset(pool.tokenB),
        getLPToken(pool),
      ];
      setAssets(newAssets);
      onPoolRouteChange?.(pool);

      wallet.clearTransaction(TransactingComponent.SWAP);
      wallet.clearTransaction(TransactingComponent.REMOVE_LIQUIDITY);
      // Re-initialize transaction with new pool
      await transactionOps.initialize(
        [newAssets[0], newAssets[1]],
        [newAssets[2]],
        newPoolId
      );
    },
    [network, getLPToken, onPoolRouteChange, transactionOps]
  );

  useEffect(() => {
    if (!routePool) return;

    const nextAssets: [Asset, Asset, Asset] = [
      network.getAsset(routePool.tokenA),
      network.getAsset(routePool.tokenB),
      getLPToken(routePool),
    ];
    const routeAlreadyLoaded =
      assets[send1].name === nextAssets[send1].name &&
      assets[send2].name === nextAssets[send2].name &&
      assets[receive].name === nextAssets[receive].name;

    if (routeAlreadyLoaded) return;

    network.setSelectedPool(routePool);
    setAssets(nextAssets);
    wallet.clearTransaction(TransactingComponent.ADD_LIQUIDITY);
    setLoading(true);
    setReloading(true);
  }, [routePool?.id, network.network]);

  const session = useSession();

  // used to set input to editable or not
  const [canUpdate, setCanUpdate] = useState<boolean>(false);

  // Callback to process transaction
  const transact = useCallback(async () => {
    await walletOps.sendTransaction();
  }, [walletOps.sendTransaction]);

  const swapDepositOrder = useCallback(async () => {
    if (!canUpdate || loading || reloading) return;

    const previousAssets = assets;
    setAssets([assets[send2], assets[send1], assets[receive]]);
    try {
      await transactionOps.swapFields();
    } catch (error) {
      setAssets(previousAssets);
      throw error;
    }
  }, [assets, canUpdate, loading, reloading, transactionOps.swapFields]);

  // callback to create new transaction
  const newTransaction = useCallback(async () => {
    // initialize transaction
    const transactionInitialized = await transactionOps.initialize(
      [assets[send1], assets[send2]],
      [assets[receive]],
      currentPool?.id || ""
    );

    //if transaction initialized update balance and set loading params to false
    if (transactionInitialized) {
      setCanUpdate(true);
      setLoading(false);
    }
  }, [assets, transactionOps]);

  // Effect to load component
  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.ADD_LIQUIDITY)
      session.loadComponent(TransactingComponent.ADD_LIQUIDITY);
  }, [session]);

  useEffect(() => {
    setLoading(true);
  }, [network.network]);

  // Effect to handle initial loading of transaction
  useEffect(() => {
    // get active transaction
    const transaction = transactionOps.getActiveTransaction();
    // if loading and no transaction, create new transaction
    if (loading && !transaction) {
      newTransaction();
    } else if (loading) {
      // if loading and transaction,
      // update balance, assets and set loading to false
      if (transaction && transaction.sendAsset[1]) {
        //grab assets from transaction
        const _assets: [Asset, Asset, Asset] = [
          transaction.sendAsset[0],
          transaction.sendAsset[1],
          transaction.receiveAsset[0],
        ];
        // Load assets if transaction assets are different from current assets
        !eq(_assets, assets) && setAssets(_assets);
        setLoading(false);
      }
    }
  }, [
    loading,
    newTransaction,
    session,
    transactionOps.getActiveTransaction,
    assets,
  ]);

  // Callback to fetch the estimate of amount of liquidity tokens to recieve
  const getLiquidityTokens = useCallback((): string => {
    const transaction = transactionOps.getActiveTransaction();
    // liquidity tokens
    const lqt = transaction?.receiveAmount[0].string || "0";
    const bn = new BigNumber(lqt);
    return bn.toFixed(6).replace(/\.?0+$/, "");
  }, [transactionOps.getActiveTransaction]);

  // Fetch balances for all pools
  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet.address || !network.toolkit) return;

      const balances = new Map<string, string>();
      const pools = network.getAllPools();

      for (const pool of pools) {
        try {
          const lpToken = network.getAsset(pool.lpToken);
          const balance = await getBalance(
            network.toolkit,
            network.network,
            wallet.address,
            lpToken
          );
          balances.set(pool.id, balance.string || "0");
        } catch (error) {
          balances.set(pool.id, "0");
        }
      }

      setPoolBalances(balances);
    };

    fetchBalances();
  }, [wallet.address, network.toolkit, network.network]);

  const getPoolBalance = (poolId: string): string => {
    return poolBalances.get(poolId) || "0";
  };

  //callback to handle transaction status changes
  const monitorStatus = useCallback(() => {
    // get active transaction
    const transaction = transactionOps.getActiveTransaction();
    // map transaction status to a boolean value to determine if transaction can be updated
    const _canUpdate: boolean = (() => {
      if (transaction) {
        switch (transaction.transactionStatus) {
          case TransactionStatus.PENDING:
          case TransactionStatus.SUBMITTED:
          case TransactionStatus.CONFIRMATION_UNKNOWN:
            return false;
          case TransactionStatus.UNINITIALIZED:
            return false;
          case TransactionStatus.COMPLETED:
            return false;
          default:
            return true;
        }
      } else {
        return false;
      }
    })();

    // update can update if different from above _canUpdate
    setCanUpdate((canUpdate) => {
      if (canUpdate === _canUpdate) return canUpdate;
      return _canUpdate;
    });

    // current transaction id in wallet context
    const transactionId = transaction?.id;
    // if no id and transaction id, set id and set reloading to true
    if (!id && transactionId) {
      setId(transactionId);
      setReloading(true);
    }
    // if id and transaction id and different, set id and set reloading to true
    if (id && transactionId && id !== transactionId) {
      setId(transactionId);
      setReloading(true);
    }
  }, [transactionOps.getActiveTransaction, id]);

  // effect to monitor transaction status by calling monitorStatus
  useEffect(() => {
    monitorStatus();
  }, [monitorStatus]);

  // Effect to reload new transactions
  useEffect(() => {
    const timer = setTimeout(() => {
      // get active transaction
      const t = transactionOps.getActiveTransaction();
      // if loading and no transaction, create new transaction
      if (reloading && t) {
        // if loading and transaction,
        // update balance, assets and set loading to false
        if (t.sendAsset[1]) {
          //grab assets from transaction
          const _assets: [Asset, Asset, Asset] = [
            t.sendAsset[0],
            t.sendAsset[1],
            t.receiveAsset[0],
          ];
          // reload assets
          setAssets(_assets);
          setReloading(false);
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [transactionOps.getActiveTransaction, assets, reloading]);

  // get loading status for child compoenents
  const isLoaded = useCallback(() => {
    return !loading && !reloading;
  }, [loading, reloading]);

  // Keep the workspace dimensions stable while the transaction model initializes.
  if (loading || previewLoading) {
    return <TradingLoadingState variant="liquidity" />;
  } else {
    return (
      <Grid2 container sx={styles.root}>
        <Card sx={styles.card}>
          <CardHeader
            sx={styles.cardHeader}
            title={
              <Box sx={styles.headerContent}>
                <Box sx={styles.titleGroup}>
                  <Typography sx={styles.eyebrow}>LIQUIDITY</Typography>
                  <NavLiquidity scalingKey={scalingKey} />
                </Box>

                <PoolSelector
                  onChange={handlePoolChange}
                  disabled={!canUpdate}
                  sx={styles.poolSelector}
                  showBalance={true}
                  getPoolBalance={getPoolBalance}
                  variant="dark"
                />
              </Box>
            }
          />

          <CardContent sx={styles.cardContent}>
            <Box sx={styles.fieldsRow}>
              <Box sx={styles.input}>
                <UserAmountField
                  component={TransactingComponent.ADD_LIQUIDITY}
                  transferType={TransferType.SEND}
                  asset={assets[send1]}
                  label="You deposit"
                  readOnly={!canUpdate}
                  scalingKey={scalingKey}
                  loading={!isLoaded()}
                  visualVariant="tezex"
                />
              </Box>

              <Box sx={styles.depositOrderToggle}>
                <SwapUpDownToggle
                  toggle={swapDepositOrder}
                  scalingKey={scalingKey}
                  disabled={!canUpdate || !isLoaded()}
                  ariaLabel="Switch deposit token order"
                />
              </Box>

              <Box sx={styles.input}>
                <UserAmountField
                  component={TransactingComponent.ADD_LIQUIDITY}
                  transferType={TransferType.SEND}
                  asset={assets[send2]}
                  readOnly={true}
                  label="Required deposit"
                  scalingKey={scalingKey}
                  loading={!isLoaded()}
                  visualVariant="tezex"
                />
              </Box>
            </Box>

            <Box sx={styles.infoGrid}>
              <Typography component="span" sx={styles.infoText}>
                Estimated pool shares
              </Typography>
              <Box
                component="img"
                sx={styles.infoTextIcon}
                src={process.env.PUBLIC_URL + getLPToken(currentPool).logo}
                alt=""
              />
              <Typography component="span" sx={styles.infoReceive}>
                {getLiquidityTokens()} {getLPToken(currentPool).label}
              </Typography>
            </Box>
          </CardContent>

          <CardActions sx={styles.cardAction}>
            <Box sx={styles.wallet}>
              <Wallet
                component={TransactingComponent.ADD_LIQUIDITY}
                transaction={active}
                callback={transact}
                scalingKey={scalingKey}
                visualVariant="dark"
              >
                Add Liquidity
              </Wallet>
            </Box>

            <Box sx={styles.slippageBox}>
              <Box sx={styles.slippageCopy}>
                <Typography sx={styles.slippageLabel}>
                  Slippage tolerance
                </Typography>
                <Typography sx={styles.slippageHelp}>
                  Maximum accepted price movement
                </Typography>
              </Box>
              <Slippage
                transferType={TransferType.RECEIVE}
                component={TransactingComponent.ADD_LIQUIDITY}
                scalingKey={scalingKey}
                visualVariant="dark"
              />
            </Box>
          </CardActions>
        </Card>
      </Grid2>
    );
  }
};
