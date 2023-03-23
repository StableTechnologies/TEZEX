import React, { FC, useState, useEffect, useCallback } from "react";

import {
  Transaction,
  TokenKind,
  Asset,
  TransactingComponent,
} from "../../types/general";

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

export interface ISwapToken {
  children: null;
}

export const RemoveLiquidity: FC = () => {
  const network = useNetwork();
  const walletOperations: WalletOps = useWalletOps(
    TransactingComponent.REMOVE_LIQUIDITY
  );
  const isWalletConnected = useWalletConnected();

  const [loadingBalances, setLoadingBalances] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(true);

  const [sendAmount, setSendAmount] = useState(new BigNumber(0));

  const [balance, setBalance] = useState(new BigNumber(0));

  const [useMax, setUseMax] = useState<boolean>(false);
  const send = 0;
  const receive1 = 1;
  const receive2 = 2;

  const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
    network.getAsset(TokenKind.Sirs),
    network.getAsset(TokenKind.XTZ),
    network.getAsset(TokenKind.TzBTC),
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

  const updateTransaction = useCallback(async () => {
    if (active) {
      if (!active.sendAmount[0].decimal.eq(sendAmount)) {
        await walletOperations.updateAmount(sendAmount.toString());
      }
    }
  }, [sendAmount, active, walletOperations]);

  useEffect(() => {
    updateTransaction();
  }, [updateTransaction]);

  const updateBalance = useCallback(async () => {
    if (isWalletConnected) {
      if (active) {
        setLoadingBalances(!(await walletOperations.updateBalance()));
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
      .initialize([assets[send]], [assets[receive1], assets[receive2]])
      .then(async (transaction: Transaction | undefined) => {
        if (transaction) {
          await updateBalance().then(() => {
            setLoading(false);
            setLoadingBalances(false);
          });
        }
      });
  }, [assets, updateBalance, walletOperations]);

  useEffect(() => {
    const _newTransaction = async () => {
      await newTransaction();
    };

    if (!loading && !active) {
      _newTransaction();
    }
    if (loading && !active) {
      _newTransaction();
    } else if (loading) {
      if (active) {
        updateSend(active.sendAmount[0].decimal.toString());
        setLoading(false);
      }
      if (session.activeComponent !== TransactingComponent.REMOVE_LIQUIDITY)
        session.loadComponent(TransactingComponent.REMOVE_LIQUIDITY);
    }
  }, [loading, active, newTransaction, session, updateSend, walletOperations]);
  return (
    <Grid2 container sx={style.root}>
      <Grid2>
        <Card sx={style.card}>
          <CardHeader
            sx={style.cardHeader}
            title={
              <Typography sx={style.headerTypography}>
                {"Remove Liquidity"}
              </Typography>
            }
          />
          <CardContent sx={style.cardcontent}>
            <Box sx={style.cardContentBox}>
              <Box sx={style.input1}>
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
                      ? style.useMaxTypographyEnabled
                      : style.useMaxTypographyEnabled
                  }
                >
                  {"Use Max"}
                </Typography>
              </Button>
            </Box>
          </CardContent>
          <CardActions sx={style.cardAction}>
            <Box sx={style.wallet}>
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
