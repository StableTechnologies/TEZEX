import {memo, MemoExoticComponent, FC, useCallback, useState, useEffect } from "react";
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
	assetName: TokenKind;
	onChange: (value: string) => void;
	balance: string;
	value?: string;
	label?: string;
	readOnly?: boolean;
}

const style = {
	textAndLogo: {
		display: "flex",
	},
};

const TokenAmountInput: FC<ITokenAmountInput> = (props) => {
	const [inputString, setInputString] = useState("0");
	const net = useNetwork();
	const wallet = useWallet();
	const asset: Asset = getAsset(props.assetName);


	/*
	useEffect(() => {
	      if(props.value && props.value !== inputString) setInputString(props.value);	
	}, [inputString, props]);
	
	useEffect(() => {
		const updateParent = async () => {
			await props.onChange(inputString);
		};
	
		updateParent();
	
	}, [inputString, props]);
	*/

	const updateAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		e.preventDefault();
		setInputString(e.target.value);
props.onChange(inputString);
	},[]);
	/*
	const updateAmount = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const num = tokenDecimalToMantissa(e.target.value, props.asset);
		if (props.mantissa) {
			!props.readOnly
				? setInputString(e.target.value)
				: setInputString(
						tokenDecimalToMantissa(
							props.mantissa.toString(),
							props.asset
						).toString()
				  );
		}
		!props.readOnly && num.isNaN()
			? props.setMantissa(null)
			: props.setMantissa(num);
		props.onChange && (await props.onChange());
	};
	
	const setValue = () => {
		if (inputString === "") return inputString;
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
			return "0.0";
		}
	};
	*/

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
					value={inputString}
					label={props.label ? props.label : ""}
					id="filled-start-adornment"
					sx={{
						paddingLeft: "16px",
						width: "408px",
						height: "75px",
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
												marginLeft: "8px",
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
					balance: {props.balance} {props.assetName}
				</Typography>
			</Grid2>
		</Grid2>
	);
};

export const TokenInput = memo(TokenAmountInput);
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
