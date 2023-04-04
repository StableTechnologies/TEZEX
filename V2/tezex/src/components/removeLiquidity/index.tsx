import React, { FC, useState, useEffect, useCallback } from "react";

import { Token, Asset, TransactingComponent } from "../../types/general";

import { BigNumber } from "bignumber.js";
import { UserAmountField } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
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

export interface ISwapToken {
  children: null;
}

export const RemoveLiquidity: FC = () => {
  const styles = useStyles(style);
  const network = useNetwork();
  const walletOperations: WalletOps = useWalletOps(
    TransactingComponent.REMOVE_LIQUIDITY
  );
  const isWalletConnected = useWalletConnected();

  const [loading, setLoading] = useState<boolean>(true);

  const [sendAmount, setSendAmount] = useState(new BigNumber(0));

  const [balance, setBalance] = useState(new BigNumber(0));

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

  const active = walletOperations.getActiveTransaction();
  const transact = async () => {
    await walletOperations.sendTransaction();
  };

  useEffect(() => {
    if (useMax) setSendAmount(balance);
  }, [useMax, balance]);
  const updateSend = useCallback(
    (value: string) => {
      const amt = new BigNumber(value);
      if (amt !== sendAmount) {
        setSendAmount(amt);
      }
    },
    [sendAmount]
  );

  const updateTransaction = useCallback(() => {
    if (active) {
      if (!active.sendAmount[0].decimal.eq(sendAmount)) {
        walletOperations.updateAmount(sendAmount.toString());
      }
    }
  }, [sendAmount, active, walletOperations]);

  useEffect(() => {
    updateTransaction();
  }, [updateTransaction]);

  const updateBalance = useCallback(() => {
    if (isWalletConnected) {
      if (active) {
        walletOperations.updateTransactionBalance();
      }
    }
  }, [active, walletOperations, isWalletConnected]);

  useEffect(() => {
    if (active) {
      setBalance(active.sendAssetBalance[0].decimal);

      active.receiveAsset[1] &&
        setAssets([
          active.sendAsset[0],
          active.receiveAsset[0],
          active.receiveAsset[1],
        ]);
    }
  }, [active]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateBalance();
    }, 2000);
    return () => clearInterval(interval);
  });

  const newTransaction = useCallback(async () => {
    const transaction = walletOperations.initialize(
      [assets[send]],
      [assets[receive1], assets[receive2]]
    );
    if (transaction) {
      updateBalance();
      setLoading(false);
    }
  }, [assets, updateBalance, walletOperations]);

  useEffect(() => {
    if (!loading && !active) {
      newTransaction();
    }
    if (loading && !active) {
      newTransaction();
    } else if (loading) {
      if (active) {
        updateSend(active.sendAmount[0].decimal.toString());
        updateBalance();
        setLoading(false);
      }
      if (session.activeComponent !== TransactingComponent.REMOVE_LIQUIDITY)
        session.loadComponent(TransactingComponent.REMOVE_LIQUIDITY);
    }
  }, [loading, active, newTransaction, session, updateSend, walletOperations]);
  return (
    <Grid2 container sx={styles.root}>
      <Grid2>
        <Card sx={styles.card}>
          <CardHeader
            sx={styles.cardHeader}
            title={
              <Typography sx={styles.headerTypography}>
                {"Remove Liquidity"}
              </Typography>
            }
          />
          <CardContent sx={styles.cardcontent}>
            <Box sx={styles.cardContentBox}>
              <Box sx={styles.input1}>
                <UserAmountField
                  asset={assets[send]}
                  readOnly={useMax}
                  onChange={updateSend}
                  value={sendAmount.toString()}
                  loading={loading}
                  variant="LeftInput"
                />
              </Box>
              <Button
                onClick={(
                  event: React.MouseEvent<HTMLButtonElement, MouseEvent>
                ) => {
                  event.preventDefault();
                  useMax ? setUseMax(false) : setUseMax(true);
                }}
              >
                <Typography
                  sx={
                    useMax
                      ? styles.useMaxTypographyEnabled
                      : styles.useMaxTypographyEnabled
                  }
                >
                  {"Use Max"}
                </Typography>
              </Button>
            </Box>
          </CardContent>
          <CardActions sx={styles.cardAction}>
            <Box sx={styles.wallet}>
              <Wallet transaction={active} callback={transact}>
                {"Sell Shares"}
              </Wallet>
            </Box>
          </CardActions>
        </Card>
      </Grid2>
    </Grid2>
  );
};
