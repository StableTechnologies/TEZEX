import React, { FC, useState, useEffect, useCallback } from "react";

import { Token, Asset, TransactingComponent } from "../../types/general";

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
export interface ISwapToken {
  children: null;
}

export const Swap: FC = () => {
  const scalingKey = "swap";
  const width = window.innerWidth;
  const styles = useStyles(style, scalingKey);
  const network = useNetwork();
  const walletOperations: WalletOps = useWalletOps(TransactingComponent.SWAP);
  const isWalletConnected = useWalletConnected();

  const [loading, setLoading] = useState<boolean>(true);

  const [sendAmount, setSendAmount] = useState(new BigNumber(0));
  const [receiveAmount, setReceiveAmount] = useState(new BigNumber(0));
  const [slippage, setSlippage] = useState<number>(0.5);

  const send = 0;
  const receive = 1;

  const [assets, setAssets] = useState<[Asset, Asset]>([
    network.getAsset(Token.XTZ),
    network.getAsset(Token.TzBTC),
  ]);

  const [balances, setBalances] = useState<[string, string]>(["", ""]);
  const [swappingFileds, setSwappingFileds] = useState<boolean>(false);
  const session = useSession();

  const active = walletOperations.getActiveTransaction();
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isLg = useMediaQuery(theme.breakpoints.only("lg"));

  const transact = async () => {
    await walletOperations.sendTransaction();
  };

  const updateReceive = useCallback(
    (value: string) => {
      const amt = new BigNumber(value);
      if (!amt.eq(receiveAmount)) {
        setReceiveAmount(amt);
      }
    },
    [receiveAmount]
  );

  const updateSlippage = useCallback(
    (value: string) => {
      const amt = new BigNumber(value).dp(1).toNumber();
      if (amt !== slippage) {
        setSlippage(amt);
      }
    },
    [slippage]
  );
  const swapFields = useCallback(() => {
    setLoading(true);
    setAssets([assets[1], assets[0]]);
    setSwappingFileds(true);
    setSendAmount(receiveAmount);
  }, [assets]);

  const updateSend = useCallback(
    (value: string) => {
      const amt = new BigNumber(value);
      if (amt !== sendAmount && !swappingFileds) {
        setSendAmount(amt);
      }
    },
    [sendAmount, swappingFileds]
  );
  const updateTransaction = useCallback(() => {
    if (active) {
      if (
        !active.sendAmount[0].decimal.eq(sendAmount) ||
        active.slippage !== slippage
      ) {
        walletOperations.updateAmount(
          sendAmount.toFixed(),
          slippage.toString()
        );
      }
    }
  }, [sendAmount, active, slippage, walletOperations]);

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
      setBalances([
        active.sendAssetBalance[0].decimal.toFixed(),
        active.receiveAssetBalance[0].decimal.toFixed(),
      ]);

      setAssets([active.sendAsset[0], active.receiveAsset[0]]);
    }
  }, [active]);

  useEffect(() => {
    if (active) {
      updateReceive(active.receiveAmount[0].decimal.toFixed());
    }
  }, [active, updateReceive]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateBalance();
    }, 2000);
    return () => clearInterval(interval);
  });

  const newTransaction = useCallback(async () => {
    const transaction = walletOperations.initialize(
      [assets[send]],
      [assets[receive]]
    );

    if (transaction) {
      updateBalance();
      if (swappingFileds) setSwappingFileds(false);
      setLoading(false);
    }
  }, [swappingFileds, assets, updateBalance, walletOperations]);

  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.SWAP)
      session.loadComponent(TransactingComponent.SWAP);
  });
  useEffect(() => {
    if (!loading && !active) {
      setLoading(true); // newTransaction();
    }
    if (loading && swappingFileds) {
      newTransaction();
    }
    if (loading && !active) {
      newTransaction();
    } else if (loading) {
      if (active) {
        updateSend(active.sendAmount[0].decimal.toFixed());

        updateReceive(active.receiveAmount[0].decimal.toFixed());
        updateSlippage(active.slippage.toString());
        updateBalance();
        setLoading(false);
      }
    }
  }, [
    swappingFileds,
    loading,
    active,
    newTransaction,
    session,
    updateSend,
    updateSlippage,
    updateBalance,
    updateReceive,
    walletOperations,
  ]);

  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.SWAP)
      session.loadComponent(TransactingComponent.SWAP);
  });
  return (
    <Box sx={styles.boxRoot}>
      <Grid2 container sx={styles.root}>
        <Card sx={styles.card}>
          <CardHeader
            sx={styles.cardHeader}
            title={
              <Typography sx={styles.cardHeaderTypography}>{"Swap"}</Typography>
            }
          />
          <CardContent sx={styles.cardcontent}>
            <Grid2 xs={11.2} sx={styles.input1}>
              <UserAmountField
                asset={assets[send]}
                onChange={updateSend}
                value={sendAmount.toFixed()}
                balance={balances[0]}
                loading={loading}
                scalingKey={scalingKey}
              />
            </Grid2>

            <Box sx={styles.swapToggle}>
              <SwapUpDownToggle toggle={swapFields} scalingKey={scalingKey} />
            </Box>

            <Grid2 xs={11.2} sx={styles.input2}>
              <UserAmountField
                asset={assets[receive]}
                value={receiveAmount.toFixed()}
                readOnly={true}
                balance={balances[1]}
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
                asset={assets[receive].name}
                value={slippage}
                onChange={updateSlippage}
                inverse={true}
                loading={loading}
                scalingKey={scalingKey}
              />
            </Grid2>
          </Box>
        </Paper>
      </Grid2>
    </Box>
  );
};
