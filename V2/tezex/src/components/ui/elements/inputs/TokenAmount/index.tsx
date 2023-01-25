import { FC, useState, useEffect } from "react";
import { BigNumber } from "bignumber.js";

import { WalletInfo } from "../../../../../contexts/wallet";

import { useWallet } from "../../../../../hooks/wallet";
import { useNetwork } from "../../../../../hooks/network";
import { TokenKind, Asset } from "../../../../../types/general";
import { getAsset } from "../../../../../constants";
import {
	hasSufficientBalance,
	getBalance,
} from "../../../../../functions/beacon";
import {
	tokenDecimalToMantissa,
	tokenMantissaToDecimal,
} from "../../../../../functions/scaling";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
//import KeyboardArrowDownIcon from '@mui/material/icons/KeyboardArrowDown';
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Input from "@mui/material/Input";
import FilledInput from "@mui/material/FilledInput";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { SvgIcon } from "@mui/material";
export interface ITokenAmountInput {
	asset: TokenKind;
	walletInfo: WalletInfo | null;
	setMantissa: React.Dispatch<
		React.SetStateAction<BigNumber | number | null>
	>;
	label?: string;
	mantissa?: BigNumber | number | null;
	readOnly?: boolean;
}

const style = {
	textAndLogo: {
		display: "flex",
	},
};
export const TokenAmountInput: FC<ITokenAmountInput> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);
	const [inputString, setInputString] = useState("0");
	const [balance, setBalance] = useState("0.0");
	const net = useNetwork();
	const wallet = useWallet();
	const asset: Asset = getAsset(props.asset);

	const updateAmount = async (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputString(e.target.value);
		const num = tokenDecimalToMantissa(e.target.value, props.asset);

		num.isNaN() ? props.setMantissa(null) : props.setMantissa(num);
		if (props.walletInfo && num.gt(0) && !num.isNaN()) {
			setSufficientBalance(
				await hasSufficientBalance(
					new BigNumber(e.target.value),
					props.walletInfo,
					net,
					props.asset
				)
			);
		} else {
			setSufficientBalance(true);
		}
	};

	useEffect(() => {
		if (wallet) {
			const check = async () => {
				if (wallet) {
					setBalance(
						await wallet.viewBalance(
							props.asset,
							wallet,
							net
						)
					);
				}
			};
			check();
		}
	}, [wallet, net, props.asset, inputString]);

	const setValue = () => {
		if (props.mantissa) {
			if (
				new BigNumber(props.mantissa).isEqualTo(
					tokenDecimalToMantissa(
						new BigNumber(inputString),
						props.asset
					)
				)
			) {
				return inputString;
			} else {
				console.log(
					"\n",
					"props.mantissa, inputString : ",
					props.mantissa.toString(),
					inputString,
					"\n"
				);
				return tokenMantissaToDecimal(
					props.mantissa,
					props.asset
				).toString();
			}
		} else {
			return "";
		}
	};

	const styles = () => ({
		justifyContent: "center",
		width: "418px",
		height: "100px",
	});

	return (
		<Grid2 container>
			<Grid2
				container
				sx={{
					flexDirection: "column",

					borderRadius: "16px",
					backgroundColor: "background.default",
				}}
			>
				<TextField
					onChange={updateAmount}
					value={setValue()}
					label={props.label ? props.label : ""}
					id="filled-start-adornment"
					sx={{
						width: "418px",
						height: "71px",
					}}
					InputProps={{
						disableUnderline: true,
						startAdornment: (
							<InputAdornment position="start">
								<div
									style={
										style.textAndLogo
									}
									flex-direction="row"
								>
									<div>
										<img
											style={{
												marginLeft:
													"8px",
												marginRight:
													"8px",
												maxWidth: "30px",
												width: "30px",
												height: "30px",
											}}
											src={
												asset.logo
											}
											alt="logo"
										/>
									</div>
									<div>
										{
											asset.label
										}
									</div>
								</div>
							</InputAdornment>
						),
					}}
					inputProps={{
						readOnly: props.readOnly,
						style: {
							textAlign: "right",
						},
					}}
					variant="standard"
				/>
				<Typography
					color="textSecondary"
					variant="subtitle2"
					sx={{
						padding: "0px 16px",
						textAlign: "right",
					}}
				>
					balance: {balance} {props.asset}
				</Typography>
			</Grid2>
		</Grid2>
	);
};

/*
<div>
	<input
		type="number"
		id="amountOfCurrency"
		name="amountOfCurrency"
		className="input-currency"
		onChange={updateAmount}
		value={setValue()}
	></input>

	<label
		htmlFor="amountOfCurrency"
		className="input-currency"
	>
		{props.asset as string}
	</label>

	<label
		style={{ color: "red" }}
		className="balance-warning"
		hidden={sufficientBalance}
	>
		{"  Insufficient Balance"}
	</label>
</div>
*/
