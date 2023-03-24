import React, { FC, useState, useEffect, useCallback } from "react";

import {
  Transaction,
  Token,
  Asset,
  TransactingComponent,
} from "../../types/general";

import { BigNumber } from "bignumber.js";
import { TokenInput, Slippage } from "../../components/ui/elements/inputs";
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
const classes = {
  input1: {
    position: "absolute",
    top: "16.87%",
    "& .MuiFormControl-root": {
      width: "28.34vw",
      height: "6.94vw",
    },
  },
  input2: {
    position: "absolute",
    top: "43.27%",
    "& .MuiFormControl-root": {
      width: "28.34vw",
      height: "6.94vw",
    },
  },
  cardcontent: {
    "&.MuiCardContent-root": {
      paddingTop: "0px",
    },
    "& .MuiFormControl-root": {
      width: "28.34vw",
      height: "6.94vw",
    },
  },
  cardAction: {
    justifyContent: "center",
  },
  slippageContainer: {
    background: "black",
    flexDirection: "row",
    position: "absolute",
    zIndex: 5,
    display: "flex",
    alignItems: "center",
    minWidth: 408,
    bottom: "17%",
    "& .MuiGrid2-root": {},
  },

  slippageComponent: {
    "& .MuiGrid2-root": {},
  },
  slippage: {
    text: {},
  },
  card: {
    overflow: "hidden",
    position: "relative",
    height: "28.49vw",
    width: "30.56vw",
    borderRadius: "1.38vw",
    zIndex: 999,
    background: "#FFFFFF",
    border: "1px solid #E1E1E1",
    "& .MuiCardContent-root": {
      padding: "8px",
    },
  },
  paper: {
    background: "#F9F9F9",
    borderRadius: "20px",
    border: "1px solid #E1E1E1",
    minHeight: "146px",
    position: "relative",
    bottom: "10%",
    zIndex: -1,
    marginBottom: "20px",
  },
  root: {
    display: "flex",
    position: "relative",
    justifyContent: "center",
  },
};

export interface ISwapToken {
  children: null;
}

export const Swap: FC = () => {
  const network = useNetwork();
  const walletOperations: WalletOps = useWalletOps(TransactingComponent.SWAP);
  const isWalletConnected = useWalletConnected();

  const [loadingBalances, setLoadingBalances] = useState<boolean>(true);

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
    setLoadingBalances(true);
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
        setLoadingBalances(!walletOperations.updateTransactionBalance());
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
      setLoadingBalances(false);
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
        updateBalance;
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
    updateReceive,
    walletOperations,
  ]);

  useEffect(() => {
    if (session.activeComponent !== TransactingComponent.SWAP)
      session.loadComponent(TransactingComponent.SWAP);
  });
  return (
    <Grid2 container sx={classes.root}>
      <Grid2>
        <div>
          <Card sx={classes.card}>
            <CardHeader
              sx={{
                paddingBottom: "0px",
                fontSize: "1vw",
                textAlign: "left",
              }}
              title={
                <Typography
                  sx={{
                    fontSize: "1.4vw",
                  }}
                >
                  {"Swap"}
                </Typography>
              }
            />
            <CardContent sx={classes.cardcontent}>
              <Grid2 xs={12} sx={classes.input1}>
                <TokenInput
                  asset={assets[send]}
                  onChange={updateSend}
                  value={sendAmount.toString()}
                  balance={loadingBalances ? "loading.." : balances[0]}
                  loading={loading}
                />
              </Grid2>

              <Grid2
                xs={12}
                sx={{
                  position: "absolute",
                  top: "37.4%",
                  zIndex: 5,
                  height: "1vw",
                }}
              >
                <SwapUpDownToggle toggle={swapFields} />
              </Grid2>

              <Grid2 xs={12} sx={classes.input2}>
                <TokenInput
                  asset={assets[receive]}
                  value={receiveAmount.toString()}
                  readOnly={true}
                  balance={loadingBalances ? "loading.." : balances[1]}
                />
              </Grid2>
            </CardContent>
            <CardActions sx={classes.cardAction}>
              <Box
                sx={{
                  position: "absolute",
                  top: "77.5%",
                  width: "28.33vw",
                  height: "4.16vw",
                  justifyContent: "center",
                }}
              >
                <Wallet transaction={active} callback={transact}>
                  {"Swap Tokens"}
                </Wallet>
              </Box>
            </CardActions>
          </Card>

          <Paper
            variant="outlined"
            sx={{
              position: "absolute",
              top: "89.4%",
              zindex: "-999",

              borderRadius: "1.38vw",
              background: "#F9F9F9",

              width: "30.6vw",
              height: "10.14vw",
            }}
            square
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingTop: "6vw",
              }}
            >
              <Typography
                sx={{
                  marginLeft: "1vw",
                  fontSize: ".972vw",
                  lineHeighr: "1.176vw",
                }}
              >
                Slippage
              </Typography>

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
