import React, { FC, useState, useEffect, useCallback } from "react";

import { Token, Asset, TransactingComponent } from "../../types/general";

import { BigNumber } from "bignumber.js";
import { UserAmountField, Slippage } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
import { useWalletConnected } from "../../hooks/wallet";
import { useSession } from "../../hooks/session";
import { useWalletOps, WalletOps } from "../../hooks/wallet";
import { SwapUpDownToggle } from "../../components/ui/elements/Toggles";
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

export interface ISwapToken {
  children: null;
}

export const Swap: FC = () => {
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
  const [swapingFields, setSwapingFields] = useState<boolean>(true);
  const session = useSession();

  const active = walletOperations.getActiveTransaction();
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
      const amt = new BigNumber(value).toNumber();
      if (amt !== slippage) {
        setSlippage(amt);
      }
    },
    [slippage]
  );
  const swapFields = useCallback(() => {
    setAssets([assets[1], assets[0]]);
    setSwapingFields(true);
    setLoading(true);
  }, [assets]);

  const updateSend = useCallback(
    (value: string) => {
      const amt = new BigNumber(value);
      if (amt !== sendAmount) {
        setSendAmount(amt);
      }
    },
    [sendAmount]
  );
  const updateTransaction = useCallback(async () => {
    if (active) {
      if (
        !active.sendAmount[0].decimal.eq(sendAmount) ||
        active.slippage !== slippage
      ) {
        await walletOperations.updateAmount(
          sendAmount.toString(),
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
        active.sendAssetBalance[0].decimal.toString(),
        active.receiveAssetBalance[0].decimal.toString(),
      ]);

      setAssets([active.sendAsset[0], active.receiveAsset[0]]);
    }
  }, [active]);

  useEffect(() => {
    if (active) {
      updateReceive(active.receiveAmount[0].decimal.toString());
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
      if (swapingFields) setSwapingFields(false);
      setLoading(false);
    }
  }, [swapingFields, assets, updateBalance, walletOperations]);

  useEffect(() => {
    if (!loading && !active) {
      newTransaction();
    }
    if (loading && swapingFields) {
      newTransaction();
    }
    if (loading && !active) {
      newTransaction();
    } else if (loading) {
      if (active) {
        updateSend(active.sendAmount[0].decimal.toString());

        updateReceive(active.receiveAmount[0].decimal.toString());
        updateSlippage(active.slippage.toString());
        updateBalance();
        setLoading(false);
      }
      if (session.activeComponent !== TransactingComponent.SWAP)
        session.loadComponent(TransactingComponent.SWAP);
    }
  }, [
    swapingFields,
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
    <Grid2 container sx={style.root}>
      <Grid2>
        <div>
          <Card sx={style.card}>
            <CardHeader
              sx={style.cardHeader}
              title={
                <Typography sx={style.cardHeaderTypography}>
                  {"Swap"}
                </Typography>
              }
            />
            <CardContent sx={style.cardcontent}>
              <Grid2 xs={12} sx={style.input1}>
                <UserAmountField
                  asset={assets[send]}
                  onChange={updateSend}
                  value={sendAmount.toString()}
                  balance={balances[0]}
                  loading={loading}
                />
              </Grid2>

              <Grid2 xs={12} sx={style.swapToggle}>
                <SwapUpDownToggle toggle={swapFields} />
              </Grid2>

              <Grid2 xs={12} sx={style.input2}>
                <UserAmountField
                  asset={assets[receive]}
                  value={receiveAmount.toString()}
                  readOnly={true}
                  balance={balances[1]}
                />
              </Grid2>
            </CardContent>
            <CardActions sx={style.cardAction}>
              <Box sx={style.transact}>
                <Wallet transaction={active} callback={transact}>
                  {"Swap Tokens"}
                </Wallet>
              </Box>
            </CardActions>
          </Card>

          <Paper variant="outlined" sx={style.paper} square>
            <Box sx={style.paperBox}>
              <Typography sx={style.paperTypography}>Slippage</Typography>

              <Slippage
                asset={assets[receive].name}
                value={slippage}
                onChange={updateSlippage}
                inverse={true}
              />
            </Box>
          </Paper>
        </div>
      </Grid2>
    </Grid2>
  );
};
