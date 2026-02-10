import React, { FC, useState, useEffect, useCallback } from "react";

import {
  Asset,
  TransactingComponent,
  TransferType,
  TransactionStatus,
  Id,
} from "../../types/general";

import { UserAmountField, Slippage } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
import { useSession } from "../../hooks/session";
import { useWallet, useWalletOps, WalletOps } from "../../hooks/wallet";
import { SwapUpDownToggle } from "../../components/ui/elements/Toggles";
import { SlippageLabel } from "../../components/ui/elements/Labels";
import { useNetwork } from "../../hooks/network";

import Box from "@mui/material/Box";
import Grid2 from "@mui/material/Unstable_Grid2";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";

import style from "./style";
import useStyles from "../../hooks/styles";

import { useTransaction } from "../../hooks/transaction";
import { eq } from "lodash";
import { PoolSelector } from "../ui/elements/PoolSelector";

export interface ISwapToken {
  orientation: "portrait" | "landscape";
}

// TODO: track id change and set loading to true
export const Swap: FC<ISwapToken> = (props) => {
  const scalingKey = "swap";
  // load styles and apply responsive scaling for component
  const styles = useStyles(style, scalingKey);
  const network = useNetwork();
  const wallet = useWallet();
  // load wallet operations for component
  const walletOps: WalletOps = useWalletOps(TransactingComponent.SWAP, true);
  // load transaction operations for component
  const transactionOps = useTransaction(
    TransactingComponent.SWAP
    //  undefined,
    //  true
  );

  const [id, setId] = useState<Id | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [reloading, setReloading] = useState<boolean>(true);

  const send = 0;
  const receive = 1;

  const availablePools = network.getAllPools();
  const currentPool = network.selectedPool;

  const [assets, setAssets] = useState<[Asset, Asset]>(() => {
    if (currentPool) {
      return [
        network.getAsset(currentPool.tokenA),
        network.getAsset(currentPool.tokenB),
      ];
    }
    return [
      network.getAsset(availablePools[0]?.tokenA),
      network.getAsset(availablePools[0]?.tokenB),
    ];
  });

  const [swappingFileds, setSwappingFileds] = useState<boolean>(false);
  const session = useSession();

  const [canUpdate, setCanUpdate] = useState<boolean>(false);

  const active = walletOps.getActiveTransaction();

  useEffect(() => {
    const pools = network.getAllPools();
    if (pools.length > 0) {
      setAssets([
        network.getAsset(pools[0].tokenA),
        network.getAsset(pools[0].tokenB),
      ]);

      setLoading(true);
    }
  }, [network.network]);

  const handlePoolChange = useCallback(
    async (newPoolId: string) => {
      const pool = network.getAllPools().find((p) => p.id === newPoolId);
      if (!pool) return;
      network.setSelectedPool(pool);
      setAssets([network.getAsset(pool.tokenA), network.getAsset(pool.tokenB)]);

      wallet.clearTransaction(TransactingComponent.ADD_LIQUIDITY);
      wallet.clearTransaction(TransactingComponent.REMOVE_LIQUIDITY);
      // Re-initialize transaction with new pool
      await transactionOps.initialize(
        [network.getAsset(pool.tokenA)],
        [network.getAsset(pool.tokenB)],
        newPoolId
      );
    },
    [network, transactionOps]
  );

  // Callback to process transaction
  const transact = useCallback(async () => {
    await walletOps.sendTransaction();
  }, [walletOps.sendTransaction]);

  // Callback to swap fields
  const swapFields = useCallback(async () => {
    // swap assets
    setAssets([assets[1], assets[0]]);
    // swap transaction fields
    await transactionOps.swapFields();
  }, [assets, transactionOps]);

  // callback to create new transaction
  const newTransaction = useCallback(async () => {
    const transaction = await transactionOps.initialize(
      [assets[send]],
      [assets[receive]],
      currentPool?.id || ""
    );

    //if transaction initialized update balance and set loading params to false
    if (transaction) {
      if (swappingFileds) setSwappingFileds(false);
      setLoading(false);
    }
  }, [swappingFileds, assets, transactionOps]);

  // Effect to handle loading of transaction
  useEffect(() => {
    // get active transaction
    const transaction = transactionOps.getActiveTransaction();
    // if loading and no transaction, create new transaction
    if (loading && !transaction) {
      newTransaction();
    } else if (loading) {
      // if loading and transaction,
      // update balance  , assets and set loading to false
      if (transaction) {
        //grab assets from transaction
        const _assets: [Asset, Asset] = [
          transaction.sendAsset[0],
          transaction.receiveAsset[0],
        ];
        // Load assets if transaction assets are different from current assets
        !eq(_assets, assets) && setAssets(_assets);
        setLoading(false);
      }
    }
  }, [loading]);

  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.SWAP)
      session.loadComponent(TransactingComponent.SWAP);
  }, [session]);

  //callback to handle transaction status changes
  const monitorStatus = useCallback(() => {
    const transaction = transactionOps.getActiveTransaction();
    const _canUpdate: boolean = (() => {
      if (transaction) {
        switch (transaction.transactionStatus) {
          case TransactionStatus.PENDING:
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
        //grab assets from transaction
        const _assets: [Asset, Asset] = [t.sendAsset[0], t.receiveAsset[0]];
        // reload assets
        setAssets(_assets);
        setReloading(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [transactionOps.getActiveTransaction, assets, reloading]);

  // get loading status for child compoenents
  const isLoaded = useCallback(() => {
    return !loading && !reloading;
  }, [loading, reloading]);

  // if loading return empty div else render component
  if (loading) {
    return <div> </div>;
  } else {
    return (
      <Box sx={styles.boxRoot}>
        <Grid2 container sx={styles.root}>
          <Card sx={styles.card}>
            <CardHeader
              sx={styles.cardHeader}
              title={
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography sx={styles.cardHeaderTypography}>
                    {"Swap"}
                  </Typography>

                  <PoolSelector
                    onChange={handlePoolChange}
                    disabled={!canUpdate}
                    sx={styles.poolSelector}
                  />
                </Box>
              }
            />
            <CardContent sx={styles.cardcontent}>
              <Grid2 xs={11.2} sx={styles.input1}>
                <UserAmountField
                  component={TransactingComponent.SWAP}
                  transferType={TransferType.SEND}
                  asset={assets[send]}
                  readOnly={!canUpdate}
                  scalingKey={scalingKey}
                  loading={!isLoaded()}
                />
              </Grid2>

              <Box sx={styles.swapToggle}>
                <SwapUpDownToggle toggle={swapFields} scalingKey={scalingKey} />
              </Box>

              <Grid2 xs={11.2} sx={styles.input2}>
                <UserAmountField
                  component={TransactingComponent.SWAP}
                  transferType={TransferType.RECEIVE}
                  asset={assets[receive]}
                  readOnly={true}
                  scalingKey={scalingKey}
                  loading={!isLoaded()}
                />
              </Grid2>
            </CardContent>
            <CardActions sx={styles.cardAction}>
              <Box sx={styles.transact}>
                <Wallet
                  component={TransactingComponent.SWAP}
                  transaction={active}
                  callback={transact}
                  scalingKey={scalingKey}
                >
                  {"Swap Tokens"}
                </Wallet>
              </Box>
            </CardActions>
          </Card>

          <Paper variant="outlined" sx={styles.paper} square>
            <Box sx={styles.paperBox}>
              <Grid2 xs={4}>
                <SlippageLabel scalingKey={scalingKey} />
              </Grid2>

              <Grid2 xs={7}>
                <Slippage
                  component={TransactingComponent.SWAP}
                  transferType={TransferType.RECEIVE}
                  scalingKey={scalingKey}
                />
              </Grid2>
            </Box>
          </Paper>
        </Grid2>
      </Box>
    );
  }
};
