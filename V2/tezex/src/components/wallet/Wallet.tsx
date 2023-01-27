import { FC } from "react";
import connectWallet from "../../functions/beacon";
import { useWallet } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import { WalletInfo } from "../../contexts/wallet";
import { WalletConnected } from "../session/WalletConnected";
import { WalletDisconnected } from "../session/WalletDisconnected";

import Button from "@mui/material/Button";

const classes = {
	walletDisconnectedHeader: {
		"&.MuiButton-root.Mui-disabled": {
			color: "white",
		},
		background: "#1E1E1E",
		color: "white",
		minHeight: '39px',
                minWidth: '149px',
		padding : '10px, 16px, 10px, 16px',
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
         variant?: "header" | "card"
}

export const Wallet: FC<IWallet> = (props) => {
	const walletInfo: WalletInfo | null = useWallet();
	const networkInfo = useNetwork();
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
	const WalletVariant: FC = (_prop) => {

		if(props.variant && props.variant === "header") {
				return(<Button size="small" sx={classes.walletDisconnectedHeader} onClick={connect}>
					Connect Wallet
				</Button>)
		} else { 

				return(<Button size="large" sx={classes.walletDisconnectedCard} onClick={connect}>
					Connect Wallet
				</Button>)
		}
	}
	return (
		<>
			<WalletDisconnected>
				<WalletVariant />
			</WalletDisconnected>
			<WalletConnected>
				<button onClick={disconnect}>
					{walletInfo ? walletInfo.address : ""}
				</button>
			</WalletConnected>
		</>
	);
};
