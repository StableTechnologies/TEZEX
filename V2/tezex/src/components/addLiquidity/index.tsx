import React, { FC, useState, useEffect, useCallback } from "react";
import xtzTzbtcIcon from "../../assets/xtzTzbtcIcon.svg";
import sirsIcon from "../../assets/sirsIcon.svg";
import rightArrow from "../../assets/rightArrow.svg";
import plusIcon from "../../assets/plusIcon.svg";

import { Wallet } from "../wallet";
import { Token, Asset, TransactingComponent } from "../../types/general";

import { BigNumber } from "bignumber.js";
import { UserAmountField, Slippage } from "../../components/ui/elements/inputs";

import { useWalletConnected } from "../../hooks/wallet";
import { useSession } from "../../hooks/session";
import { useWalletOps, WalletOps } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";

import Box from "@mui/material/Box";
import Grid2 from "@mui/material/Unstable_Grid2";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import style from "./style";
import useStyles from "../../hooks/styles";

export interface IAddLiquidity {
  children: null;
}
export const AddLiquidity: FC = () => {
  const styles = useStyles(style);
  const network = useNetwork();
  const walletOperations: WalletOps = useWalletOps(
    TransactingComponent.ADD_LIQUIDITY
  );

  const isWalletConnected = useWalletConnected();

  const active = walletOperations.getActiveTransaction();

  const [loading, setLoading] = useState<boolean>(true);

  const [sendAmount, setSendAmount] = useState(new BigNumber(0));
  const [sendAmount2, setSendAmount2] = useState(new BigNumber(0));
  const [receiveAmount, setReceiveAmount] = useState(new BigNumber(0));
  const [slippage, setSlippage] = useState<number>(-0.5);

  const send1 = 0;
  const send2 = 1;
  const receive = 2;

  const [balances, setBalances] = useState<[string, string]>(["", ""]);
  const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
    network.getAsset(Token.XTZ),
    network.getAsset(Token.TzBTC),
    network.getAsset(Token.Sirs),
  ]);
  const [swapingFields, setSwapingFields] = useState<boolean>(true);
  const session = useSession();

  const transact = async () => {
    await walletOperations.sendTransaction();
  };

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
    setAssets([assets[1], assets[0], assets[receive]]);

    setSwapingFields(true);
    setLoading(true);
  }, [assets]);
  const updateSend2 = useCallback(
    (value: string) => {
      const amt = new BigNumber(value);
      if (!amt.eq(sendAmount2)) {
        setSendAmount2(amt);
      }
    },
    [sendAmount2]
  );
  const updateSend = useCallback(
    (value: string) => {
      const amt = new BigNumber(value);
      if (!amt.eq(sendAmount) && !amt.isNaN()) {
        setSendAmount(amt);
      }
    },
    [sendAmount]
  );
  const updateReceive = useCallback(
    (value: string) => {
      const amt = new BigNumber(value);
      if (!amt.eq(receiveAmount)) {
        setReceiveAmount(amt);
      }
    },
    [receiveAmount]
  );

  useEffect(() => {
    if (active) {
      active.sendAssetBalance[1] &&
        setBalances([
          active.sendAssetBalance[0].decimal.toString(),
          active.sendAssetBalance[1].decimal.toString(),
        ]);

      active.sendAsset[1] &&
        setAssets([
          active.sendAsset[0],
          active.sendAsset[1],
          active.receiveAsset[0],
        ]);
    }
  }, [active]);

  const updateTransaction = useCallback(() => {
    if (active) {
      if (
        !active.sendAmount[0].decimal.eq(sendAmount) ||
        active.slippage !== slippage
      ) {
        walletOperations.updateAmount(
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
      if (active && active.sendAssetBalance[1]) {
        walletOperations.updateTransactionBalance();
      }
    }
  }, [active, walletOperations, isWalletConnected]);

  useEffect(() => {
    active &&
      active.sendAssetBalance[1] &&
      setBalances([
        active.sendAssetBalance[0].decimal.toString(),
        active.sendAssetBalance[1].decimal.toString(),
      ]);
  }, [active]);

  useEffect(() => {
    if (active && active.sendAmount[1] && active.sendAssetBalance[1]) {
      updateReceive(active.receiveAmount[0].decimal.toString());
      updateSend2(active.sendAmount[1].decimal.toString());
    }
  }, [active, updateSend2, updateReceive]);

  useEffect(() => {
    const interval = setInterval(() => {
      updateBalance();
    }, 2000);
    return () => clearInterval(interval);
  });

  const newTransaction = useCallback(async () => {
    const transaction = walletOperations.initialize(
      [assets[send1], assets[send2]],
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
        active.sendAsset[1] &&
          setAssets([
            active.sendAsset[0],
            active.sendAsset[1],
            active.receiveAsset[0],
          ]);
        active.sendAmount[1] &&
          updateSend2(active.sendAmount[1].decimal.toString());
        updateReceive(active.receiveAmount[0].decimal.toString());
        updateSlippage(active.slippage.toString());
        updateBalance();
        setLoading(false);
      }
      if (session.activeComponent !== TransactingComponent.ADD_LIQUIDITY)
        session.loadComponent(TransactingComponent.ADD_LIQUIDITY);
    }
  }, [
    swapingFields,
    loading,
    active,
    newTransaction,
    session,
    updateSend,
    updateSend2,
    updateSlippage,
    updateReceive,
    walletOperations,
  ]);

  return (
    <Grid2 container sx={styles.root}>
      <Grid2>
        <Card sx={styles.card}>
          <CardHeader
            sx={styles.cardHeader}
            title={
              <Typography sx={styles.cardHeaderTypography}>
                {"Add Liquidity"}
              </Typography>
            }
          />
          <Grid2 xs={8} lg={4} sx={styles.tokens}>
            <Box>
              <img
                style={styles.sendAssetsIcon}
                src={xtzTzbtcIcon}
                alt="xtzTzbtcIcon"
              />
            </Box>
            <Box>
              <img
                style={styles.rightArrow}
                src={rightArrow}
                alt="rightArrow"
              />
            </Box>
            <Box>
              <img
                style={styles.recieveAssetIcon}
                src={sirsIcon}
                alt="sirsIcon"
              />
            </Box>
          </Grid2>
          <CardContent sx={styles.cardContent}>
            <Grid2 xs={12} sx={styles.cardContendGrid}>
              <Grid2 xs={6} sx={styles.input}>
                <UserAmountField
                  asset={assets[send1]}
                  onChange={updateSend}
                  value={sendAmount.toString()}
                  balance={balances[0]}
                  label="Enter Amount"
                  loading={loading}
                />
              </Grid2>

              <Grid2 xs={1} sx={styles.plusIcon}>
                <img src={plusIcon} alt="plusIcon" />
              </Grid2>

              <Grid2 xs={6} sx={styles.input}>
                <UserAmountField
                  asset={assets[send2]}
                  value={sendAmount2.toString()}
                  readOnly={true}
                  balance={balances[1]}
                  label="Required Amount"
                  darker={true}
                  swap={swapFields}
                />
              </Grid2>
            </Grid2>

            <Grid2 xs={12} sx={styles.infoGrid}>
              <Typography noWrap sx={styles.infoText}>
                You will recieve about{" "}
                <Typography sx={styles.infoRecieve}>
                  {" "}
                  {receiveAmount.toString()} Sirs
                </Typography>
                for this deiposit
              </Typography>
            </Grid2>
          </CardContent>
          <CardActions sx={styles.cardAction}>
            <Grid2 xs={1}>Slippage</Grid2>

            <Grid2 xs={4} sx={styles.slippageComponent}>
              <Slippage
                asset={assets[receive].name}
                value={slippage}
                onChange={updateSlippage}
                inverse={true}
              />
            </Grid2>

            <Grid2 sx={{}} xs={6}>
              <Wallet transaction={active} callback={transact}>
                {"Add Liquidity"}
              </Wallet>
            </Grid2>
          </CardActions>
        </Card>
      </Grid2>
    </Grid2>
  );
};
