import { FC, useEffect,useCallback, useState } from "react";
import connectWallet from "../../functions/beacon";
import { useWallet } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import { WalletInfo } from "../../contexts/wallet";
import { WalletConnected } from "../session/WalletConnected";
import { WalletDisconnected } from "../session/WalletDisconnected";

import {
	Transaction,
	TokenKind,
	Asset,
	Balance,
	Id,
	TransactionStatus,
	TransactingComponent,
	Amount,
	AssetOrAssetPair,
	SendOrRecieve,
} from "../../types/general";
import Button from "@mui/material/Button";

const classes = {
	transact: {
		"&.MuiButton-root.Mui-disabled": {
			color: "white",
		},

		fontFamily: "Inter",
		width: "100%",
		height: "56px",
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
		"@media (max-width: 600px)": {
			fontSize: "24px",
		},
	},
	walletDisconnectedHeader: {
		"&.MuiButton-root.Mui-disabled": {
			color: "white",
		},
		background: "#1E1E1E",
		color: "white",
		minHeight: "39px",
		minWidth: "149px",
		padding: "10px, 16px, 10px, 16px",
		border: "1px solid black",
		borderRadius: "8px",
		fontWeight: "500",
		fontSize: "16px",
		lineHeight: "19.36px",
		letterSpacing: "0.01em",
		textTransform: "none",
		"&:hover": {
			background: "#000",
		},
		"@media (max-width: 600px)": {
			fontSize: "19px",
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
		"@media (max-width: 600px)": {
			fontSize: "24px",
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
	//const transaction
	//todo start with true
	const [disabled, setDisabled] = useState(false);
        const [transactionStatus, setTransactionStatus] = useState<string | undefined>(undefined)
	const walletText = useCallback((): string | undefined => {
		if(props.transaction && props.transaction.sendAmount[0].decimal.eq(0)){
		return "Enter Amount"}else if (props.transaction){
			const transactionStatus: TransactionStatus =  props.transaction.transactionStatus;
			switch(transactionStatus){
				case TransactionStatus.SUFFICIENT_BALANCE :
				    setDisabled(false);
				    return  props.children
                                  default: 
					setDisabled(true);
					return transactionStatus as string
			}

		}
	},[props.transaction, props.children])
	useEffect(() => {
		if(props.transaction){

			setTransactionStatus(walletText());
		}
	},[props.transaction, walletText])
	const transact = async () => {
		if (props.callback) {
			await props.callback();
			//await walletInfo.walletUser(props.callback);
		}
	};

	const info = (() => {
		if (walletInfo) {
			return walletInfo.isReady()
				? props.children
				: walletInfo.walletStatus;
		} else {
			return "";
		}
	})();

	/*
	useEffect(() => {
		if (walletInfo) {
			walletInfo.isReady()
				? setDisabled(false)
				: setDisabled(true);
		}
	}, [walletInfo]);
	*/
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
				<Button
					size="large"
					sx={classes.walletDisconnectedCard}
					onClick={connect}
				>
					Connect Wallet
				</Button>
			);
		}
	};
	const WalletVariantConnected: FC = (_prop) => {
		if (props.variant && props.variant === "header") {
			return (
				<button onClick={disconnect}>
					{walletInfo ? walletInfo.address : ""}
				</button>
			);
		} else {
			return (
				<Button
					size="large"
					onClick={transact}
					sx={classes.transact}
					disabled={disabled}
				>
					{transactionStatus}
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
