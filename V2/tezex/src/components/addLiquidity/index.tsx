import React, { FC, useState, useEffect, useCallback } from "react";
import xtzTzbtcIcon from "../../assets/xtzTzbtcIcon.svg";
import sirsIcon from "../../assets/sirsIcon.svg";
import rightArrow from "../../assets/rightArrow.svg";
import plusIcon from "../../assets/plusIcon.svg";

import { Wallet } from "../wallet";
import {
  Transaction,
  TokenKind,
  Asset,
  TransactingComponent,
} from "../../types/general";

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

export interface IAddLiquidity {
  children: null;
}
export const AddLiquidity: FC = () => {
  const network = useNetwork();
  const walletOperations: WalletOps = useWalletOps(
    TransactingComponent.ADD_LIQUIDITY
  );

  const isWalletConnected = useWalletConnected();

  const active = walletOperations.getActiveTransaction();
  const [loadingBalances, setLoadingBalances] = useState<boolean>(true);

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
    network.getAsset(TokenKind.XTZ),
    network.getAsset(TokenKind.TzBTC),
    network.getAsset(TokenKind.Sirs),
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

    setLoadingBalances(true);
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

  const updateBalance = useCallback(async () => {
    if (isWalletConnected) {
      if (active && active.sendAssetBalance[1]) {
        setLoadingBalances(!(await walletOperations.updateBalance()));
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
    const updateTransactionBalance = async () => {
      await updateBalance();
    };

    const interval = setInterval(
      () => {
        updateTransactionBalance();
      },
      loadingBalances ? 2000 : 5000
    );
    return () => clearInterval(interval);
  });

  const newTransaction = useCallback(async () => {
    await walletOperations
      .initialize([assets[send1], assets[send2]], [assets[receive]])
      .then(async (transaction: Transaction | undefined) => {
        if (transaction) {
          await updateBalance().then(() => {
            if (swapingFields) setSwapingFields(false);
            setLoading(false);
            setLoadingBalances(false);
          });
        }
      });
  }, [swapingFields, assets, updateBalance, walletOperations]);

  useEffect(() => {
    const _newTransaction = async () => {
      await newTransaction();
    };

    if (!loading && !active) {
      _newTransaction();
    }
    if (loading && swapingFields) {
      _newTransaction();
    }
    if (loading && !active) {
      _newTransaction();
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
    <Grid2 container sx={style.root}>
      <Grid2>
        <Card sx={style.card}>
          <CardHeader
            sx={style.cardHeader}
            title={
              <Typography sx={style.cardHeaderTypography}>
                {"Add Liquidity"}
              </Typography>
            }
          />
          <Grid2 xs={8} lg={4} sx={style.tokens}>
            <Box>
              <img
                style={style.sendAssetsIcon}
                src={xtzTzbtcIcon}
                alt="xtzTzbtcIcon"
              />
            </Box>
            <Box>
              <img style={style.rightArrow} src={rightArrow} alt="rightArrow" />
            </Box>
            <Box>
              <img
                style={style.recieveAssetIcon}
                src={sirsIcon}
                alt="sirsIcon"
              />
            </Box>
          </Grid2>
          <CardContent sx={style.cardContent}>
            <Grid2 xs={12} sx={style.cardContendGrid}>
              <Grid2 xs={6} sx={style.input}>
                <UserAmountField
                  asset={assets[send1]}
                  onChange={updateSend}
                  value={sendAmount.toString()}
                  balance={loadingBalances ? "loading.." : balances[0]}
                  label="Enter Amount"
                  loading={loading}
                />
              </Grid2>

              <Grid2 xs={1} sx={style.plusIcon}>
                <img src={plusIcon} alt="plusIcon" />
              </Grid2>

              <Grid2 xs={6} sx={style.input}>
                <UserAmountField
                  asset={assets[send2]}
                  value={sendAmount2.toString()}
                  readOnly={true}
                  balance={loadingBalances ? "loading.." : balances[1]}
                  label="Required Amount"
                  darker={true}
                  swap={swapFields}
                />
              </Grid2>
            </Grid2>

            <Grid2 xs={12} sx={style.infoGrid}>
              <Typography noWrap sx={style.infoText}>
                You will recieve about{" "}
                <Typography sx={style.infoRecieve}>
                  {" "}
                  {receiveAmount.toString()} Sirs
                </Typography>
                for this deiposit
              </Typography>
            </Grid2>
          </CardContent>
          <CardActions sx={style.cardAction}>
            <Grid2 xs={1}>Slippage</Grid2>

            <Grid2 xs={4} sx={style.slippageComponent}>
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
