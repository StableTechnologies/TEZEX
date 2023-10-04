import React, { FC, useState, useEffect, useCallback } from "react";
import plusIcon from "../../assets/plusIcon.svg";

import { Wallet } from "../wallet";
import { NavLiquidity } from "../nav/NavLiquidity";
import { Token, Asset, TransactingComponent } from "../../types/general";

import { BigNumber } from "bignumber.js";
import { UserAmountField, Slippage } from "../../components/ui/elements/inputs";
import {
  SlippageLabel,
  AddliquidityTokens,
} from "../../components/ui/elements/Labels";
import { useWalletConnected } from "../../hooks/wallet";
import { useSession } from "../../hooks/session";
import { useWalletOps, WalletOps } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";

import Grid2 from "@mui/material/Unstable_Grid2";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
import style from "./style";
import useStyles from "../../hooks/styles";
import sirsSmall from "../../assets/sirsSmall.svg";
import Box from "@mui/material/Box";
import { BrowserView, MobileView } from "react-device-detect";
export interface IAddLiquidity {
  children: null;
}
export const AddLiquidity: FC = () => {
  const scalingKey = "addLiquidity";
  const styles = useStyles(style, scalingKey);
  const walletGridSize = styles.isLandScape ? 5 : 12;
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
  const [slippage, setSlippage] = useState<number>(1);

  const send1 = 0;
  const send2 = 1;
  const receive = 2;

  const [balances, setBalances] = useState<[string, string]>(["", ""]);
  const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
    network.getAsset(Token.XTZ),
    network.getAsset(Token.TzBTC),
    network.getAsset(Token.Sirs),
  ]);
  const [swapingFields, setSwapingFields] = useState<boolean>(false);
  const session = useSession();

  const transact = async () => {
    await walletOperations.sendTransaction();
  };
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
    const send = sendAmount2;
    setLoading(true);
    setAssets([assets[1], assets[0], assets[receive]]);

    setSwapingFields(true);
    setSendAmount(send);
  }, [assets, sendAmount2]);
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
      if (!amt.eq(sendAmount) && !amt.isNaN() && !swapingFields) {
        setSendAmount(amt);
      }
    },
    [sendAmount, swapingFields]
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
    if (active && !swapingFields) {
      active.sendAssetBalance[1] &&
        setBalances([
          active.sendAssetBalance[0].decimal.toFixed(),
          active.sendAssetBalance[1].decimal.toFixed(),
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
    if (active && !swapingFields) {
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
      if (active && active.sendAssetBalance[1]) {
        walletOperations.updateTransactionBalance();
      }
    }
  }, [active, walletOperations, isWalletConnected]);

  useEffect(() => {
    active &&
      active.sendAssetBalance[1] &&
      setBalances([
        active.sendAssetBalance[0].decimal.toFixed(),
        active.sendAssetBalance[1].decimal.toFixed(),
      ]);
  }, [active]);

  useEffect(() => {
    if (active && active.sendAmount[1] && active.sendAssetBalance[1]) {
      updateReceive(active.receiveAmount[0].decimal.toFixed());
      updateSend2(active.sendAmount[1].decimal.toFixed());
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
    if (session.activeComponent !== TransactingComponent.ADD_LIQUIDITY)
      session.loadComponent(TransactingComponent.ADD_LIQUIDITY);
  });

  useEffect(() => {
    if (!loading && !active) {
      setLoading(true);
    }
    if (loading && swapingFields) {
      newTransaction();
    } else if (loading && !active) {
      newTransaction();
    } else if (loading) {
      if (active) {
        updateSend(active.sendAmount[0].decimal.toFixed());
        active.sendAsset[1] &&
          setAssets([
            active.sendAsset[0],
            active.sendAsset[1],
            active.receiveAsset[0],
          ]);
        active.sendAmount[1] &&
          updateSend2(active.sendAmount[1].decimal.toFixed());
        updateReceive(active.receiveAmount[0].decimal.toFixed());
        updateSlippage(active.slippage.toString());
        updateBalance();
        setLoading(false);
      }
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
    <>
      <MobileView>
        <Grid2
          container
          sx={!styles.isMobileLandscape ? styles.root.mobile : styles.root}
        >
          <Card
            sx={!styles.isMobileLandscape ? styles.card.mobile : styles.card}
          >
            <CardHeader
              sx={styles.cardHeader}
              title={
                <Box>
                  <NavLiquidity scalingKey={scalingKey} />
                </Box>
              }
            />
            <Grid2 sx={styles.tokens}>
              <AddliquidityTokens scalingKey={scalingKey} />
            </Grid2>
            <CardContent
              sx={
                !styles.isMobileLandscape
                  ? styles.cardContent.mobile
                  : styles.cardContent
              }
            >
              <Grid2
                xs={12}
                sx={
                  !styles.isMobileLandscape
                    ? styles.cardContendGrid.mobile
                    : styles.cardContendGrid
                }
              >
                <Grid2
                  xs={!styles.isMobileLandscape ? 12 : 5}
                  sx={styles.isMobile ? styles.input.mobile : styles.input}
                >
                  <UserAmountField
                    asset={assets[send1]}
                    onChange={updateSend}
                    value={sendAmount.toFixed()}
                    balance={balances[0]}
                    label="Enter Amount"
                    loading={loading}
                    scalingKey={scalingKey}
                  />
                </Grid2>

                <Grid2 xs={1} sx={styles.plusIconGrid}>
                  <img src={plusIcon} style={styles.plusIcon} alt="plusIcon" />
                </Grid2>

                <Grid2
                  xs={!styles.isMobileLandscape ? 12 : 5}
                  sx={styles.isMobile ? styles.input.mobile : styles.input}
                >
                  <UserAmountField
                    asset={assets[send2]}
                    value={sendAmount2.toFixed()}
                    readOnly={true}
                    balance={balances[1]}
                    label="Required Deposit"
                    darker={true}
                    swap={swapFields}
                    scalingKey={scalingKey}
                  />
                </Grid2>
              </Grid2>

              <Grid2 xs={12} sx={styles.infoGrid}>
                <Typography noWrap sx={styles.infoText}>
                  You will recieve about{" "}
                  <img
                    style={styles.infoTextIcon}
                    src={sirsSmall}
                    alt="SirsLogo"
                  />
                  <Typography sx={styles.infoRecieve}>
                    {" "}
                    {receiveAmount.toFixed()} Sirs
                  </Typography>
                  for this deiposit
                </Typography>
              </Grid2>
            </CardContent>
            <CardActions
              sx={
                !styles.isMobileLandscape
                  ? styles.cardAction.mobile
                  : styles.cardAction
              }
            >
              <Box
                sx={
                  !styles.isMobileLandscape
                    ? styles.slippageBox.mobile
                    : styles.slippageBox
                }
              >
                <Grid2
                  sm={1.3}
                  md={1.3}
                  lg={1.3}
                  xl={1.3}
                  sx={styles.slippageComponent}
                >
                  <SlippageLabel scalingKey={scalingKey} />
                </Grid2>
                <Grid2
                  sm={6}
                  md={5.5}
                  lg={5.5}
                  xl={5.5}
                  sx={styles.slippageComponent}
                >
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

              <Grid2
                sx={
                  !styles.isMobileLandscape
                    ? styles.wallet.mobile
                    : styles.wallet
                }
                xs={walletGridSize}
                sm={walletGridSize}
                md={walletGridSize}
                lg={6}
              >
                <Wallet
                  transaction={active}
                  callback={transact}
                  scalingKey={scalingKey}
                >
                  {"Add Liquidity"}
                </Wallet>
              </Grid2>
            </CardActions>
          </Card>
        </Grid2>
      </MobileView>
      <BrowserView>
        <Grid2 container sx={styles.root}>
          <Grid2>
            <Card sx={styles.card}>
              <CardHeader
                sx={styles.cardHeader}
                title={
                  <Box>
                    <NavLiquidity scalingKey={scalingKey} />
                  </Box>
                }
              />
              <Grid2 sx={styles.tokens}>
                <AddliquidityTokens scalingKey={scalingKey} />
              </Grid2>
              <CardContent sx={styles.cardContent}>
                <Grid2 xs={12} sx={styles.cardContendGrid}>
                  <Grid2 xs={5} sx={styles.input}>
                    <UserAmountField
                      asset={assets[send1]}
                      onChange={updateSend}
                      value={sendAmount.toFixed()}
                      balance={balances[0]}
                      label="Enter Amount"
                      loading={loading}
                      scalingKey={scalingKey}
                    />
                  </Grid2>

                  <Grid2 xs={1} sx={styles.plusIconGrid}>
                    <img
                      src={plusIcon}
                      style={styles.plusIcon}
                      alt="plusIcon"
                    />
                  </Grid2>

                  <Grid2 xs={5} sx={styles.input}>
                    <UserAmountField
                      asset={assets[send2]}
                      value={sendAmount2.toFixed()}
                      readOnly={true}
                      balance={balances[1]}
                      label="Required Deposit"
                      darker={true}
                      swap={swapFields}
                      scalingKey={scalingKey}
                    />
                  </Grid2>
                </Grid2>

                <Grid2 xs={12} sx={styles.infoGrid}>
                  <Typography noWrap sx={styles.infoText}>
                    You will recieve about{" "}
                    <img
                      style={styles.infoTextIcon}
                      src={sirsSmall}
                      alt="SirsLogo"
                    />
                    <Typography sx={styles.infoRecieve}>
                      {" "}
                      {receiveAmount.toFixed()} Sirs
                    </Typography>
                    for this deiposit
                  </Typography>
                </Grid2>
              </CardContent>
              <CardActions sx={styles.cardAction}>
                <Grid2 xs={1.3} sx={styles.slippageComponent}>
                  <SlippageLabel scalingKey={scalingKey} />
                </Grid2>
                <Grid2 xs={5.5} sx={styles.slippageComponent}>
                  <Slippage
                    asset={assets[receive].name}
                    value={slippage}
                    onChange={updateSlippage}
                    inverse={true}
                    loading={loading}
                    scalingKey={scalingKey}
                  />
                </Grid2>

                <Grid2 sx={{}} xs={6}>
                  <Wallet
                    transaction={active}
                    callback={transact}
                    scalingKey={scalingKey}
                  >
                    {"Add Liquidity"}
                  </Wallet>
                </Grid2>
              </CardActions>
            </Card>
          </Grid2>
        </Grid2>
      </BrowserView>
    </>
  );
};
