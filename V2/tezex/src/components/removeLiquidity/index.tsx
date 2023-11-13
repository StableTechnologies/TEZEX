import React, { FC, useState, useEffect, useCallback } from "react";

import {
  Token,
  Asset,
  TransactingComponent,
  TransferType,
  TransactionStatus,
} from "../../types/general";

import { BigNumber } from "bignumber.js";
import { UserAmountField } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
import { NavLiquidity } from "../nav/NavLiquidity";
import { useWalletConnected } from "../../hooks/wallet";
import { useSession } from "../../hooks/session";
import { useNetwork } from "../../hooks/network";
import { useWalletOps, WalletOps } from "../../hooks/wallet";

import Box from "@mui/material/Box";
import Grid2 from "@mui/material/Unstable_Grid2";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";

import style from "./style";
import useStyles from "../../hooks/styles";
import { eq } from "lodash";
import { useTransaction } from "../../hooks/transaction";

export interface ISwapToken {
  children: null;
}

export const RemoveLiquidity: FC = () => {
  //return <div>Remove Liquidity</div>;
  const scalingKey = "removeLiquidity";
  // load styles and apply responsive scaling for component
  const styles = useStyles(style, scalingKey);
  const network = useNetwork();
  // load wallet operations for component
  const walletOps: WalletOps = useWalletOps(
    TransactingComponent.REMOVE_LIQUIDITY
  );
  // load transaction operations for component
  const transactionOps = useTransaction(TransactingComponent.REMOVE_LIQUIDITY);
  const isWalletConnected = useWalletConnected();

  const [loading, setLoading] = useState<boolean>(true);

  // used to set input to editable or not
  const [canUpdate, setCanUpdate] = useState<boolean>(false);

  const [useMax, setUseMax] = useState<boolean>(false);
  const send = 0;
  const receive1 = 1;
  const receive2 = 2;

  const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
    network.getAsset(Token.Sirs),
    network.getAsset(Token.XTZ),
    network.getAsset(Token.TzBTC),
  ]);
  const session = useSession();

  const active = walletOps.getActiveTransaction();

  // Callback to process transaction
  const transact = useCallback(async () => {
    await walletOps.sendTransaction();
  }, [walletOps.sendTransaction]);

  useEffect(() => {
    if (useMax) transactionOps.useMax();
  }, [useMax, transactionOps.useMax]);

  // call back to update balance of active transaction
  const updateBalance = useCallback(async () => {
    if (isWalletConnected) {
      if (walletOps.transaction) {
        //await walletOps.updateBalance();
      }
    }
  }, [walletOps, walletOps.updateBalance, isWalletConnected]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateBalance();
    }, 2000);
    return () => clearInterval(interval);
  });

  const newTransaction = useCallback(async () => {
    const transaction = await transactionOps.initialize(
      [assets[send]],
      [assets[receive1], assets[receive2]]
    );
    if (transaction) {
      updateBalance();
      setLoading(false);
    }
  }, [assets, updateBalance, transactionOps.initialize]);

  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.REMOVE_LIQUIDITY)
      session.loadComponent(TransactingComponent.REMOVE_LIQUIDITY);
  });
  useEffect(() => {
    // if loading and no transaction, create new transaction
    if (loading && !walletOps.transaction) {
      newTransaction();
    } else if (loading) {
      // if loading and transaction,
      // update balance, assets and set loading to false
      if (walletOps.transaction && walletOps.transaction.receiveAsset[1]) {
        updateBalance();
        //grab assets from transaction
        const _assets: [Asset, Asset, Asset] = [
          walletOps.transaction.sendAsset[0],
          walletOps.transaction.receiveAsset[0],
          walletOps.transaction.receiveAsset[1],
        ];
        // Load assets if transaction assets are different from current assets
        !eq(_assets, assets) && setAssets(_assets);
        setLoading(false);
      }
    }
  }, [loading, active, newTransaction, session, walletOps]);

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
  return (
    <Grid2 container sx={styles.root}>
      <Grid2>
        <Card sx={styles.card}>
          <CardHeader
            sx={styles.cardHeader}
            title={<NavLiquidity scalingKey={scalingKey} />}
          />
          <CardContent sx={styles.cardcontent}>
            <Box sx={styles.cardContentBox}>
              <Box sx={styles.input1}>
                <UserAmountField
                  asset={assets[send]}
                  transferType={TransferType.SEND}
                  component={TransactingComponent.REMOVE_LIQUIDITY}
                  readOnly={useMax || !canUpdate}
                  variant="LeftInput"
                  scalingKey={scalingKey}
                />
              </Box>
              <Button
                sx={styles.useMax}
                onClick={(
                  event: React.MouseEvent<HTMLButtonElement, MouseEvent>
                ) => {
                  event.preventDefault();
                  setUseMax((prev: boolean) => !prev);
                }}
              >
                <Typography
                  sx={
                    useMax
                      ? styles.useMaxTypographyEnabled
                      : styles.useMaxTypographyDisabled
                  }
                >
                  {"Use Max"}
                </Typography>
              </Button>
            </Box>
          </CardContent>
          <CardActions sx={styles.cardAction}>
            <Box sx={styles.wallet}>
              <Wallet
                transaction={active}
                callback={transact}
                scalingKey={scalingKey}
              >
                {"Sell Shares"}
              </Wallet>
            </Box>
          </CardActions>
        </Card>
      </Grid2>
    </Grid2>
  );
};
