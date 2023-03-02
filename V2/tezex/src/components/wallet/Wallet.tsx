import { FC, useEffect, useCallback, useState } from "react";
import connectWallet from "../../functions/beacon";
import { useWallet } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import { WalletInfo } from "../../contexts/wallet";
import { WalletConnected } from "../session/WalletConnected";
import { WalletDisconnected } from "../session/WalletDisconnected";
import { shorten } from "../../functions/util";
import CircularProgress from "@mui/material/CircularProgress";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import tzwalletlogo from "../../assets/tzwalletlogo.svg";
import { Transaction, TransactionStatus } from "../../types/general";
import Button from "@mui/material/Button";

const classes = {
  transactDisabled: {
    "&.MuiButtonBase-root": {
      display: "flex",
    },

    "&.MuiButton-root.Mui-disabled": {
      color: "white",
    },

    display: "flex",
    fontFamily: "Inter",
    width: "100%",

    background: "rgba(45, 45, 45, 0.5)",
    color: "white",
    borderRadius: "16px",
    fontWeight: "500",
    fontSize: "1.66vw",
    lineHeight: "2.01vw",
    letterSpacing: "0.01em",
    textTransform: "none",
    "&:hover": {
      background: "rgba(45, 45, 45, 0.5)",
    },
  },
  transact: {
    "&.MuiButton-root.Mui-disabled": {
      color: "white",
    },

    fontFamily: "Inter",
    width: "100%",

    backgroundColor: "#000",
    color: "white",
    border: "1px solid black",
    borderRadius: "16px",
    fontWeight: "500",
    fontSize: "1.66vw",
    lineHeight: "2.01vw",
    letterSpacing: "0.01em",
    textTransform: "none",
    "&:hover": {
      background: "#000",
    },
  },
  walletDisconnectedHeader: {
    "&.MuiButton-root.Mui-disabled": {
      color: "white",
    },
    background: "#1E1E1E",
    color: "white",
    minHeight: "2.7vw",
    minWidth: "10.24vw",

    border: "1px solid black",
    borderRadius: ".55vw",
    fontWeight: "500",
    fontSize: "1.11vw",
    lineHeight: "1.34vw",

    textTransform: "none",
    "&:hover": {
      background: "#000",
    },
  },
  walletDisconnectedCard: {
    "&.MuiButton-root.Mui-disabled": {
      color: "white",
    },

    opacity: "0.5",
    height: "56px",
    width: "100%",
    backgroundColor: "#000",
    color: "white",
    border: "1px solid black",
    borderRadius: "16px",
    fontWeight: "500",
    fontSize: "24px",
    lineHeight: "29px",
    letterSpacing: "0.01em",
    textTransform: "none",
    "&:hover": {
      background: "#000",
    },
  },
};

interface IWallet {
  transaction?: Transaction;
  callback?: () => Promise<void>;
  variant?: "header" | "card";
  children?: string;
}

export const Wallet: FC<IWallet> = (props) => {
  const walletInfo: WalletInfo | undefined = useWallet();
  const networkInfo = useNetwork();

  const [spinner, setSpinner] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    string | undefined
  >(undefined);
  const walletText = useCallback((): string | undefined => {
    if (props.transaction && props.transaction.sendAmount[0].decimal.eq(0)) {
      setSpinner(false);
      return "Enter Amount";
    } else if (props.transaction) {
      const transactionStatus: TransactionStatus =
        props.transaction.transactionStatus;
      switch (transactionStatus) {
        case TransactionStatus.INSUFFICIENT_BALANCE:
          setDisabled(true);
          setSpinner(false);
          return transactionStatus as string;
        case TransactionStatus.SUFFICIENT_BALANCE:
          setDisabled(false);
          setSpinner(false);
          return props.children;
        default:
          setDisabled(true);
          setSpinner(true);
          return props.children;
      }
    }
  }, [props.transaction, props.children]);
  useEffect(() => {
    if (props.transaction) {
      setTransactionStatus(walletText());
    }
  }, [props.transaction, walletText]);
  const transact = async () => {
    if (props.callback) {
      await props.callback();
    }
  };

  const connect = async () => {
    if (walletInfo) {
      await connectWallet(walletInfo, networkInfo);
    }
  };
  const disconnect = async () => {
    if (walletInfo) {
      walletInfo.disconnect();
    }
  };

  const WalletVariantDisconnected: FC = (_prop) => {
    if (props.variant && props.variant === "header") {
      return (
        <Button
          size="small"
          sx={classes.walletDisconnectedHeader}
          onClick={connect}
        >
          Connect Wallet
        </Button>
      );
    } else {
      return (
        <Button size="large" sx={classes.transactDisabled} onClick={connect}>
          Connect Wallet
        </Button>
      );
    }
  };
  const WalletVariantConnected: FC = (_prop) => {
    if (props.variant && props.variant === "header") {
      return (
        <Button onClick={disconnect}>
          <Box
            sx={{
              background:
                "linear-gradient(92.04deg, rgba(171, 240, 255, 0.2) 4.41%, #F9FEFF 84.62%)",

              border: "0.5px solid #C4C4C4",
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            <img src={tzwalletlogo} alt="tz " />
            {walletInfo &&
              walletInfo.address &&
              shorten(5, 5, walletInfo.address)}
          </Box>
        </Button>
      );
    } else {
      return (
        <Button
          size="large"
          onClick={transact}
          sx={disabled ? classes.transactDisabled : classes.transact}
          disabled={disabled}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <Box visibility={spinner ? "visible" : "hidden"}>
              <CircularProgress
                sx={{
                  maxWidth: "1.85vw",
                  maxHeight: "1.85vw",
                  color: "#A1E3FF",
                }}
              />
            </Box>
            <Typography
              sx={{
                fontWeight: "500",
                fontSize: "1.66vw",
                lineHeight: "2.01vw",
              }}
            >
              {transactionStatus}
            </Typography>
          </Box>
        </Button>
      );
    }
  };
  return (
    <>
      <WalletDisconnected>
        <WalletVariantDisconnected />
      </WalletDisconnected>
      <WalletConnected>
        <WalletVariantConnected />
      </WalletConnected>
    </>
  );
};
