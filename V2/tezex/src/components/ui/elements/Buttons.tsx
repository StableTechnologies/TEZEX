import { FC, useEffect, useState } from "react";
import { useWallet } from "../../../hooks/wallet";
import { WalletInfo } from "../../../contexts/wallet";
import { WalletConnected, WalletDisconnected } from "../../session";
import { Wallet } from "../../wallet";
import Button from "@mui/material/Button";

export interface ITransact {
	callback: () => Promise<void>;
	children: string;
}
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
};
export const Transact: FC<ITransact> = (props) => {
	const [disabled, setDisabled] = useState(true);
	const walletInfo: WalletInfo | undefined = useWallet();

	const transact = async () => {
		if (walletInfo) {
			await walletInfo.walletUser(props.callback);
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

	useEffect(() => {
		if (walletInfo) {
			walletInfo.isReady()
				? setDisabled(false)
				: setDisabled(true);
		}
	}, [walletInfo]);

	return (
		<div>
			<div>
				<WalletConnected>
					<Button
						size="large"
						onClick={transact}
						sx={classes.transact}
						disabled={disabled}
					>
						{info}
					</Button>
				</WalletConnected>
			</div>

			<WalletDisconnected>
				<Wallet />
			</WalletDisconnected>
		</div>
	);
};

/*
<Button size="large" className={`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}`} disabled>Swap Tokens</Button>
*/
