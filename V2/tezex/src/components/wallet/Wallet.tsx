import React, { FC, useEffect, useCallback, useState } from "react";
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

import style from "./style";
import useStyles from "../../hooks/styles";

interface IWallet {
  transaction?: Transaction;
  callback?: () => Promise<void>;
  variant?: "header" | "card";
  children?: string;
  scale?: number;
}

export const Wallet: FC<IWallet> = (props) => {
  const styles = useStyles(style, props.scale || 1);
  const walletInfo: WalletInfo | undefined = useWallet();
  const networkInfo = useNetwork();

  const [spinner, setSpinner] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<
    string | undefined
  >(undefined);
  const walletText = useCallback((): string | undefined => {
    if (props.transaction && props.transaction.sendAmount[0].decimal.eq(0)) {
      setDisabled(true);
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
        case TransactionStatus.MODIFIED:
          setDisabled(true);
          setSpinner(true);
          return props.children;
        case TransactionStatus.SUFFICIENT_BALANCE:
          setDisabled(false);
          setSpinner(false);
          return props.children;
        default:
          setDisabled(true);
          setSpinner(true);
          return transactionStatus as string;
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

  const WalletVariantDisconnected: FC = () => {
    if (props.variant && props.variant === "header") {
      return (
        <Button
          size="small"
          sx={styles.walletDisconnectedHeader}
          onClick={connect}
        >
          Connect Wallet
        </Button>
      );
    } else {
      return (
        <Button size="large" sx={styles.transactDisabled} onClick={connect}>
          Connect Wallet
        </Button>
      );
    }
  };
  const WalletVariantConnected: FC = () => {
    if (props.variant && props.variant === "header") {
      return (
        <Button onClick={disconnect}>
          <Box sx={styles.walletConnectedHeader}>
            <img
              src={tzwalletlogo}
              style={styles.walletConnectedHeader.logo}
              alt="tz "
            />
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
          sx={disabled ? styles.transactDisabled : styles.transact}
          disabled={disabled}
        >
          <Box sx={styles.walletBox}>
            <Box
              sx={styles.spinnerBox}
              visibility={spinner ? "visible" : "hidden"}
            >
              <CircularProgress sx={styles.spinner} />
            </Box>
            <Typography sx={styles.transactionStatus}>
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
