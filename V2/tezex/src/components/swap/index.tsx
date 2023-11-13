import React, { FC, useState, useEffect, useCallback, useRef } from "react";

import {
  Token,
  Asset,
  TransactingComponent,
  TransferType,
  TransactionStatus,
} from "../../types/general";

import { BigNumber } from "bignumber.js";
import { UserAmountField, Slippage } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
import { useWalletConnected } from "../../hooks/wallet";
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

import useMediaQuery from "@mui/material/useMediaQuery";
import { theme } from "../../theme";
import { useTransaction } from "../../hooks/transaction";
import { debounce, eq } from "lodash";
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

  // load wallet connection status hook
  const isWalletConnected = useWalletConnected();

  const [loading, setLoading] = useState<boolean>(true);

  const [slippage, setSlippage] = useState<number>(0.5);

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

  // call back to update balance of active transaction
  const updateBalance = useCallback(async () => {
    if (isWalletConnected) {
      if (walletOps.transaction) {
        // await walletOps.updateBalance();
      }
    }
  }, [walletOps, walletOps.updateBalance, isWalletConnected]);

  //  useEffect(() => {
  //    if (walletOps.transaction) {
  //      //      setAssets([
  //      //        walletOps.transaction.sendAsset[0],
  //      //        walletOps.transaction.receiveAsset[0],
  //      //      ]);
  //    } else transactionOps.initialize([assets[send]], [assets[receive]]);
  //  }, [walletOps.transaction, assets, transactionOps]);

  // effect to keep  updating balance of active transaction
  // at a 2 second intervals
  useEffect(() => {
    const interval = setInterval(() => {
      // !loading && updateBalance();
    }, 2000);
    return () => clearInterval(interval);
  });

  const debouncedNewTransaction = debounce(
    async () => {
      const transaction = await transactionOps.initialize(
        [assets[send]],
        [assets[receive]]
      );

      if (transaction) {
        await updateBalance();
        if (swappingFileds) setSwappingFileds(false);
        setLoading(false);
      }
    },
    300,
    {
      leading: false,
      trailing: true,
    }
  );

  // callback to create new transaction
  const newTransaction = useCallback(async () => {
    const transaction = await transactionOps.initialize(
      [assets[send]],
      [assets[receive]]
    );

    //if transaction initialized update balance and set loading params to false
    if (transaction) {
      console.log("newTransaction");
      await updateBalance();
      if (swappingFileds) setSwappingFileds(false);
      setLoading(false);
    }
  }, [swappingFileds, assets, updateBalance, transactionOps]);

  // useEffect(() => {
  //   if (session.activeComponent !== TransactingComponent.SWAP)
  //     session.loadComponent(TransactingComponent.SWAP);
  // });

  // Effect to handle loading of transaction
  useEffect(() => {
    // if (!loading && !walletOps.transaction) {
    //   setLoading(true); // newTransaction();
    // }

    // if loading and no transaction, create new transaction
    if (loading && !walletOps.transaction) {
      newTransaction();
    } else if (loading) {
      // if loading and transaction,
      // update balance  , assets and set loading to false
      if (walletOps.transaction) {
        updateBalance();

        //grab assets from transaction
        const _assets: [Asset, Asset] = [
          walletOps.transaction.sendAsset[0],
          walletOps.transaction.receiveAsset[0],
        ];
        // Load assets if transaction assets are different from current assets
        !eq(_assets, assets) && setAssets(_assets);
        setLoading(false);
      }
    }
  }, [
    swappingFileds,
    loading,
    walletOps.transaction,
    newTransaction,
    session,
    updateBalance,
  ]);

  useEffect(() => {
    console.log("transaction in walletOps ", walletOps.transaction);
  }, [loading, walletOps.transaction]);

  useEffect(() => {
    console.log(
      "setting session session.activeComponent",
      session.activeComponent
    );
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
  }, [transactionOps.getActiveTransaction]);

  // effect to monitor transaction status by calling monitorStatus
  useEffect(() => {
    monitorStatus();
  }, [monitorStatus]);

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
                />
              </Grid2>
            </CardContent>
            <CardActions sx={styles.cardAction}>
              <Box sx={styles.transact}>
                <Wallet
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
