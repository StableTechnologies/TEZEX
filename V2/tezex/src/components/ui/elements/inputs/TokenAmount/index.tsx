import { FC, useState } from "react";
import { BigNumber } from "bignumber.js";

import { WalletInfo } from "../../../../../contexts/wallet";

import { useNetwork } from "../../../../../hooks/network";
import { TokenKind, Asset } from "../../../../../types/general";
import { getAsset } from "../../../../../constants";
import { hasSufficientBalance } from "../../../../../functions/beacon";
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
}

const style = {
	textAndLogo: {
		display: "flex",
	},
};
export const TokenAmountInput: FC<ITokenAmountInput> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);
	const [inputString, setInputString] = useState("0");
	const net = useNetwork();
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
		m: 1,
		width: "25ch",
	});

	return (
		<Grid2 container>
			<FormControl fullWidth sx={{ m: 1 }}>
				<Grid2
					container
					sx={{ flexDirection: "column" ,
							backgroundColor:
								"#F9F9F9",
					}}

				>
					<TextField
						onChange={updateAmount}
						value={setValue()}
						label={
							props.label
								? props.label
								: ""
						}
						id="filled-start-adornment"
						sx={styles}
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
													marginRight:
														"8px",
													maxWidth: "24px",
													width: "24px",
													height: "24px",
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
								textAlign: "right",
							}}
						>
							balance: TODO
						</Typography>
				</Grid2>
			</FormControl>
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
