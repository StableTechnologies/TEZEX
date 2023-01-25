import { FC, useEffect, useState } from "react";
import { useWallet } from "../../../hooks/wallet";
import { WalletInfo } from "../../../contexts/wallet";
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
		width: "100%",
		height: "56px",
		backgroundColor: "#000",
		margin: "0.5rem 0rem",
		color: "white",
		border: "1px solid black",
		borderRadius: "8px",
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
	const walletInfo: WalletInfo | null = useWallet();

	const transact = async () => {
		if (walletInfo) {
			await walletInfo.walletUser(props.callback);
		}
	};

	useEffect(() => {
		if (walletInfo) {
			walletInfo.isReady()
				? setDisabled(false)
				: setDisabled(true);
		}
	}, [walletInfo]);

	return (
		<div>
			<Button
				size="large"
				onClick={transact}
				sx={classes.transact}
				disabled={disabled}
                                fullWidth
			>
				{props.children}
			</Button>
		</div>
	);
};

/*
<Button size="large" className={`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}`} disabled>Swap Tokens</Button>
*/
