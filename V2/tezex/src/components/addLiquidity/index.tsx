import React, { FC, useState, useEffect, useCallback } from "react";
import plusIcon from "../../assets/plusIcon.svg";

import { Wallet } from "../wallet";
import { NavLiquidity } from "../nav/NavLiquidity";
import {
  Token,
  Asset,
  TransactingComponent,
  TransferType,
  TransactionStatus,
} from "../../types/general";

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
import { useTransaction } from "../../hooks/transaction";
import { eq, get } from "lodash";
export interface IAddLiquidity {
  children: null;
}
// TODO: track id change and set loading to true
export const AddLiquidity: FC = () => {
  //return <div> Add Liquidity</div>;
  const scalingKey = "addLiquidity";
  // load styles and apply responsive scaling for component
  const styles = useStyles(style, scalingKey);
  const walletGridSize = styles.isLandScape ? 5 : 12;
  const network = useNetwork();

  // load wallet operations for component
  const walletOps: WalletOps = useWalletOps(TransactingComponent.ADD_LIQUIDITY);

  // load transaction operations for component
  const transactionOps = useTransaction(
    TransactingComponent.ADD_LIQUIDITY
    //  undefined,
    //  true
  );

  // load wallet connection status hook
  const isWalletConnected = useWalletConnected();

  const active = walletOps.getActiveTransaction();

  const [loading, setLoading] = useState<boolean>(true);

  const slippage = 1;

  const send1 = 0;
  const send2 = 1;
  const receive = 2;

  const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
    network.getAsset(Token.XTZ),
    network.getAsset(Token.TzBTC),
    network.getAsset(Token.Sirs),
  ]);
  const [swapingFields, setSwapingFields] = useState<boolean>(false);
  const session = useSession();

  // used to set input to editable or not
  const [canUpdate, setCanUpdate] = useState<boolean>(false);

  // Callback to process transaction
  const transact = useCallback(async () => {
    await walletOps.sendTransaction();
  }, [walletOps.sendTransaction]);

  const swapFields = useCallback(() => {
    setSwapingFields(true);
  }, []);

  // callback to internally call swap fields
  const _swapFields = useCallback(async () => {
    await transactionOps.swapFields().then(() => {
      setLoading(true);
    });
  }, [assets, transactionOps.swapFields]);

  //monitor swappingFields state and trigger swap
  useEffect(() => {
    const timer = setTimeout(() => {
      if (swapingFields) {
        _swapFields();
        setSwapingFields(false);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [swapingFields, _swapFields]);

  // callback to create new transaction
  const newTransaction = useCallback(async () => {
    const transaction = await transactionOps.initialize(
      [assets[send1], assets[send2]],
      [assets[receive]]
    );

    //if transaction initialized update balance and set loading params to false
    if (transaction) {
      if (swapingFields) setSwapingFields(false);
      setLoading(false);
    }
  }, [swapingFields, assets, transactionOps]);

  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.ADD_LIQUIDITY)
      session.loadComponent(TransactingComponent.ADD_LIQUIDITY);
  }, [session]);

  // Effect to handle loading of transaction
  useEffect(() => {
    const timer = setTimeout(() => {
      // get active transaction
      const t = transactionOps.getActiveTransaction();
      // if loading and no transaction, create new transaction
      if (loading && !t) {
        newTransaction();
      } else if (loading && t) {
        // if loading and transaction,
        // update balance, assets and set loading to false
        if (t && t.sendAsset[1]) {
          //grab assets from transaction
          const _assets: [Asset, Asset, Asset] = [
            t.sendAsset[0],
            t.sendAsset[1],
            t.receiveAsset[0],
          ];
          // Load assets if transaction assets are different from current assets
          if (!eq(JSON.stringify(_assets), JSON.stringify(assets))) {
            setAssets(_assets);
          }
          setLoading(false);
        }
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [
    loading,
    assets,
    transactionOps.getActiveTransaction,
    newTransaction,
    session,
  ]);

  // Callback to fetch the estimate of amount of liquidity tokens to recieve
  const getLiquidityTokens = useCallback((): string => {
    const transaction = transactionOps.getActiveTransaction();
    // liquidity tokens
    const lqt = transaction?.receiveAmount[0].string;
    return lqt || "0";
  }, [transactionOps.getActiveTransaction]);

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
  if (loading || swapingFields) {
    return <div> </div>;
  } else {
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
                      component={TransactingComponent.ADD_LIQUIDITY}
                      transferType={TransferType.SEND}
                      label="Enter Amount"
                      readOnly={!canUpdate}
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

                  <Grid2
                    xs={!styles.isMobileLandscape ? 12 : 5}
                    sx={styles.isMobile ? styles.input.mobile : styles.input}
                  >
                    <UserAmountField
                      asset={assets[send2]}
                      component={TransactingComponent.ADD_LIQUIDITY}
                      transferType={TransferType.SEND}
                      readOnly={true}
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
                      {getLiquidityTokens()} Sirs
                    </Typography>
                    for this deposit
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
                      transferType={TransferType.RECEIVE}
                      component={TransactingComponent.ADD_LIQUIDITY}
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
                        component={TransactingComponent.ADD_LIQUIDITY}
                        transferType={TransferType.SEND}
                        asset={assets[send1]}
                        label="Enter Amount"
                        readOnly={!canUpdate}
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
                        component={TransactingComponent.ADD_LIQUIDITY}
                        transferType={TransferType.SEND}
                        asset={assets[send2]}
                        readOnly={true}
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
                        {getLiquidityTokens()} Sirs
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
                      transferType={TransferType.RECEIVE}
                      component={TransactingComponent.ADD_LIQUIDITY}
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
  }
};
