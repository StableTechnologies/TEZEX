import React, { FC, useEffect, useState } from "react";
import connectWallet from "../../functions/beacon";
import { useWallet, useWalletOps } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import { WalletInfo } from "../../contexts/wallet";
import { WalletConnected } from "../session/WalletConnected";
import { WalletDisconnected } from "../session/WalletDisconnected";
import { shorten } from "../../functions/util";
import CircularProgress from "@mui/material/CircularProgress";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import tzwalletlogo from "../../assets/tzwalletlogo.svg";
import {
  TransactingComponent,
  Transaction,
  TransactionStatus,
} from "../../types/general";
import Button from "@mui/material/Button";
import style from "./style";
import useStyles from "../../hooks/styles";

interface IWallet {
  component?: TransactingComponent;
  transaction?: Transaction;
  callback?: () => Promise<void>;
  variant?: "header" | "card";
  children?: string;
  scalingKey?: string;
}

export const Wallet: FC<IWallet> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const walletInfo: WalletInfo | undefined = useWallet();
  const networkInfo = useNetwork();
  const walletOps = props.component ? useWalletOps(props.component) : undefined;
  const [spinner, setSpinner] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<TransactionStatus>(
    TransactionStatus.ZERO_AMOUNT
  );
  const [walletText, setWalletText] = useState<string | undefined>("");
  // use effect to update transaction status
  useEffect(() => {
    const status = walletOps?.getTransactionStatus();
    if (status) {
      if (transactionStatus !== status) {
        setTransactionStatus(status);
      }
    }
  }, [walletOps?.getTransactionStatus]);

  // Effect to monitor transaction status and update wallet text
  useEffect(() => {
    switch (transactionStatus) {
      case TransactionStatus.ZERO_AMOUNT:
        setDisabled(true);
        setSpinner(false);
        setWalletText(transactionStatus);
        break;
      case TransactionStatus.INSUFFICIENT_BALANCE:
        setDisabled(true);
        setSpinner(false);
        setWalletText(transactionStatus);
        break;
      case TransactionStatus.MODIFIED:
        setDisabled(true);
        setSpinner(true);
        setWalletText(props.children);
        break;
      case TransactionStatus.SUFFICIENT_BALANCE:
        setDisabled(false);
        setSpinner(false);
        setWalletText(props.children);
        break;
      default:
        setDisabled(true);
        setSpinner(true);
        setWalletText(transactionStatus);
    }
  }, [transactionStatus, props.children]);

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
            <Typography sx={styles.transactionStatus}>{walletText}</Typography>
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
