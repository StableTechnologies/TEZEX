import {
	memo,
	MemoExoticComponent,
	FC,
	useCallback,
	useState,
	useEffect,
} from "react";
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

import Button from "@mui/material/Button";
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

import liquiditySwapIcon from "../../../../../assets/liquiditySwapIcon.svg";

import { WalletConnected } from "../../../../session/WalletConnected";
export interface ITokenAmountInput {
	assetName: TokenKind;
	onChange?: (value: string) => void;
	balance?: string;
	value: string;
	label?: string;
	readOnly?: boolean;
	loading?: boolean;
	variant?: "LeftInput" | "RightInput";
	darker?: boolean;
	swap?: () => void;
}

const style = {
	textAndLogo: {
		display: "flex",
	},
};

const TokenAmountInput: FC<ITokenAmountInput> = (props) => {
	const [inputString, setInputString] = useState<string>(props.value);
	const net = useNetwork();
	const wallet = useWallet();
	const asset: Asset = getAsset(props.assetName);
	const onChange = props.onChange;
	const value = props.value;
	const loading = props.loading;
	useEffect(() => {
		setInputString(value);
	}, [loading, value]);
	const callBack = useCallback(
		async (value: string) => {
			console.log("\n", " callback ", "\n");
			if (onChange) onChange(value);
		},
		[onChange]
	);
	const toggle = useCallback(() => {
		if (props.swap) props.swap();
	}, [props]);
	useEffect(() => {
		const timer = setTimeout(() => {
			if (props.value !== inputString && !props.readOnly) {
				console.log(
					"\n",
					"props.value : ",
					props.value,
					"\n"
				);
				callBack(inputString);
			}
		}, 3000);
		return () => clearTimeout(timer);
		//if (isWa
	}, [inputString, callBack, props]);
	useEffect(() => {
		if (props.value !== inputString && props.readOnly) {
			setInputString(props.value);
		}
	}, [props, inputString]);

	const updateAmount = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			e.preventDefault();
			setInputString(e.target.value);
			//if(props.onChange) await props.onChange(inputString);
		},
		[]
	);
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
	/

	const updateAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		   
		e.preventDefault();
		setInputString(e.target.value);
		//if(props.onChange) await props.onChange(inputString);
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

	const Variant = () => {
		switch (props.variant) {
			case "LeftInput":
				return (
					<Grid2 container>
						<Grid2
							container
							sx={{
								flexDirection:
									"row",

								borderRadius:
									"16px",
								backgroundColor:
									"background.default",
							}}
						>
							<TextField
								autoFocus
								onChange={
									updateAmount
								}
								value={
									inputString
								}
								//label={props.label ? props.label : ""}
								id="filled-start-adornment"
								sx={{
									justifyContent:
										"center",
									width: "100%",
									height: "75px",
								}}
								InputProps={{
									disableUnderline:
										true,
									endAdornment:
										(
											<InputAdornment position="end">
												<Box
													sx={{
														display: "block",
													}}
												>
													<Box
														sx={{
															fontSize: "1.2vw",
														}}
													>
														{
															props.label
														}
													</Box>
													<Box
														sx={{
															display: "flex",
															flexDirection:
																"row",
														}}
													>
														<div>
															<img
																style={{
																	marginLeft: "8px",
																	marginRight:
																		"8px",
																	height: "23px",
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
													</Box>
												</Box>
											</InputAdornment>
										),
								}}
								inputProps={{
									readOnly: props.readOnly,
									style: {
										textAlign: "left",

										fontSize: "2.2vw",
										//		lineHeight: "38.7px",
									},
								}}
								variant="standard"
							/>
							<WalletConnected>
								<Typography
									color="textSecondary"
									variant="subtitle2"
									hidden={
										props.balance
											? false
											: true
									}
									sx={{
										padding: "0px 16px",
										textAlign: "right",
									}}
								>
									balance:{" "}
									{
										props.balance
									}{" "}
									{
										props.assetName
									}
								</Typography>
							</WalletConnected>
						</Grid2>
					</Grid2>
				);
			default:
				return (
					<Grid2 container>
						<Grid2
							container
							sx={{
								flexDirection:
									"column",

								borderRadius:
									"16px",
								backgroundColor:
									props.darker
										? "#F4F4F4"
										: "#F9F9F9",
							}}
						>
							<TextField
								autoFocus
								onChange={
									updateAmount
								}
								value={
									inputString
								}
								//label={props.label ? props.label : ""}
								id="filled-start-adornment"
								sx={{
									//  .css-1x51dt5-MuiInputBase-input-MuiInput-input
									"& .MuiInputBase-input":
										{
											position: "absolute",

											zIndex: 5,
											width: "100%",
										},
									justifyContent:
										"center",
									width: "100%",
									//height: "75px",
								}}
								InputProps={{
									disableUnderline:
										true,
									startAdornment:
										(
											<InputAdornment position="start">
												<Box
													sx={{
														display: "flex",
														flexDirection:
															"column",
													}}
												>
													<Box
														sx={{
															fontSize: "1.2vw",

															marginLeft: "1vw",
															marginRight:
																"1vw",
															position: "relative",
															bottom: "1vw",
														}}
													>
														{
															props.label
														}
													</Box>
													<Box
														sx={{
															display: "flex",
															flexDirection:
																"row",
														}}
													>
														<div>
															<img
																style={{
																	marginLeft: "1vw",
																	marginRight:
																		"1vw",
																	height: "1.61vw",
																}}
																src={
																	asset.logo
																}
																alt="logo"
															/>
														</div>
														<Typography
															sx={{
																color: "#1E1E1E",
																fontWeight: "500",
																fontSize: "1.25vw",
															}}
														>
															{
																asset.label
															}
														</Typography>
													</Box>
												</Box>
											</InputAdornment>
										),

									endAdornment:
										(
											<InputAdornment
												position="end"
												sx={{
													display: "flex",
													flexDirection:
														"row",
													justifyContent:
														"flex-end",
													width: "100%",
													padding:0,
													zIndex: 0,

													position: "relative",
													bottom: "3vw",
												}}
											>
												<Box
													visibility={
														props.swap
															? "visible"
															: "hidden"
													}
												>
													<Button
														sx={{

													justifyContent:
														"flex-end",
													width: "100%",
														}}
													>
														<img
															onClick={
																toggle
															}
															style={{
																width: ".66vw",
															}}
															src={
																liquiditySwapIcon
															}
															alt="logo"
														/>
													</Button>
												</Box>
											</InputAdornment>
										),
								}}
								inputProps={{
									readOnly: props.readOnly,
									style: {
										textAlign: "right",

										fontSize: "2.2vw",
										//		lineHeight: "38.7px",
									},
								}}
								variant="standard"
							/>
							<WalletConnected>
								<Grid2
									sx={{
										position: "relative",
										bottom: "2vw",
									}}
								>
									<Typography
										color="textSecondary"
										variant="subtitle2"
										hidden={
											props.balance
												? false
												: true
										}
										sx={{
											color: "#999999",
											fontWeight: "400",
											fontSize: ".97vw",
											textAlign: "right",
										}}
									>
										Balance:{" "}
										{
											props.balance
										}{" "}
										{
											props.assetName
										}
									</Typography>
								</Grid2>
							</WalletConnected>
						</Grid2>
					</Grid2>
				);
		}
	};
	return <Variant />;
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
