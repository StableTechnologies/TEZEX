import React, { FC, useState, useEffect, useCallback } from "react";

import {
  Token,
  Asset,
  TransactingComponent,
  TransferType,
  TransactionStatus,
  Id,
} from "../../types/general";

import { UserAmountField, Slippage } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
import { useSession } from "../../hooks/session";
import { useWalletOps, WalletOps } from "../../hooks/wallet";
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
export interface ISwapToken {
  children: null;
}

// TODO: track id change and set loading to true
export const Swap: FC = () => {
  const scalingKey = "swap";
  // load styles and apply responsive scaling for component
  const styles = useStyles(style, scalingKey);
  const network = useNetwork();
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

  const [assets, setAssets] = useState<[Asset, Asset]>([
    network.getAsset(Token.XTZ),
    network.getAsset(Token.TzBTC),
  ]);

  const [swappingFileds, setSwappingFileds] = useState<boolean>(false);
  const session = useSession();

  const [canUpdate, setCanUpdate] = useState<boolean>(false);

  const active = walletOps.getActiveTransaction();

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
      [assets[receive]]
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
  }, [
    swappingFileds,
    loading,
    newTransaction,
    session,
    transactionOps.getActiveTransaction,
    assets,
  ]);

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
    // current transaction status in wallet context
    const transactionStatus = transaction?.transactionStatus;

    // if no id and transaction id, set id and set reloading to true
    if (!id && transactionId) {
      console.log("!id, transactionId", id, transactionId);
      setId(transactionId);
      setReloading(true);
    }
    if (transactionStatus) {
      console.log(
        "transaction?.transactionStatus",
        transaction?.transactionStatus
      );
    }
    // if id and transaction id and different, set id and set reloading to true
    if (id && transactionId && id !== transactionId) {
      setId(transactionId);
      setReloading(true);
      console.log("id, transactionId", id, transactionId);
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
    // console.log("loading, reloading", loading, reloading);
    // console.log("!loading && !reloading", !loading && !reloading);
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
                <Typography sx={styles.cardHeaderTypography}>
                  {"Swap"}
                </Typography>
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
