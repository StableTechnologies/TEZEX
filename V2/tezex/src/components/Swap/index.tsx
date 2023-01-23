import { FC, useState, useEffect } from "react";

import { BigNumber } from "bignumber.js";
import {
	TokenAmountInput,
	Slippage,
} from "../../components/ui/elements/inputs";
import { TokenAmountOutput } from "../../components/ui/elements/Labels";
import { useWallet } from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import {
	estimateTokensFromXtz,
	estimateXtzFromToken,
	xtzToToken,
	tokenToXtz,
} from "../../functions/liquidityBaking";
import { Transact } from "../../components/ui/elements/Buttons";
import { Toggle } from "../../components/ui/elements/Toggles";

import { TokenKind } from "../../types/general";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Grid from "@mui/material/Grid";
//import KeyboardArrowDownIcon from '@mui/material/icons/KeyboardArrowDown';
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
const classes = {
	slippageContainer: {
		flexDirection: "row",
		"& .MuiGrid2-root": {
		},
	},

	slippageComponent: {
		"& .MuiGrid2-root": {
		},
	},
	slippage: {
		text: {},
	},
	root: {
		justifyContent: "center",
	},
	};

export interface ISwapToken {
	children: null;
}

export const Swap: FC = (props) => {
	const [inputAmountMantissa, setInputAmountMantissa] = useState<
		BigNumber | number | null
	>(null);
	const [slippage, setSlippage] = useState<BigNumber | number >(-0.5);
	const [outputAmountMantissa, setOutputAmountMantissa] =
		useState<number>(0);
	const [outToken, setOutToken] = useState(TokenKind.TzBTC);
	const [inToken, setInToken] = useState(TokenKind.XTZ);
	const [swapFields, setSwapFields] = useState<boolean>(true);
	const walletInfo = useWallet();
	const networkInfo = useNetwork();

	const transact = async () => {
		if (inputAmountMantissa && walletInfo) {
			switch (inToken) {
				case TokenKind.XTZ:
					await xtzToToken(
						new BigNumber(
							inputAmountMantissa
						),
						networkInfo.addresses.tzbtc.dex
							.sirius,
						walletInfo
					);
					break;
				case TokenKind.TzBTC:
					await tokenToXtz(
						new BigNumber(
							inputAmountMantissa
						),
						new BigNumber(
							outputAmountMantissa
						),
						networkInfo.addresses.tzbtc.dex
							.sirius,
						networkInfo.addresses.tzbtc
							.address,
						walletInfo,
						slippage ? slippage : 0
					);
			}
		}
	};

	useEffect(() => {
		if (swapFields) {
			if (inToken === TokenKind.XTZ) {
				setInputAmountMantissa(outputAmountMantissa);
			}
			setInToken(TokenKind.TzBTC);
			setOutToken(TokenKind.XTZ);
		} else {
			if (inToken === TokenKind.TzBTC) {
				setInputAmountMantissa(outputAmountMantissa);
			}
			setInToken(TokenKind.XTZ);
			setOutToken(TokenKind.TzBTC);
		}
	}, [inToken, outToken, swapFields, outputAmountMantissa]);

	useEffect(() => {
		const estimateTokens = async () => {
			if (inputAmountMantissa) {
				console.log(
					"\n",
					"inputAmountMantissa : ",
					inputAmountMantissa.toString(),
					"\n"
				);
			}
			if (inputAmountMantissa && walletInfo) {
				switch (inToken) {
					case TokenKind.XTZ:
						setOutputAmountMantissa(
							await estimateTokensFromXtz(
								new BigNumber(
									inputAmountMantissa
								),
								networkInfo
									.addresses
									.tzbtc
									.dex
									.sirius,
								walletInfo
							)
						);
						break;
					case TokenKind.TzBTC:
						setOutputAmountMantissa(
							await estimateXtzFromToken(
								new BigNumber(
									inputAmountMantissa
								),
								networkInfo
									.addresses
									.tzbtc
									.dex
									.sirius,
								walletInfo
							)
						);
						break;
				}
			}
		};

		estimateTokens();
		return () => {
			//unmount code
		};
	}, [inputAmountMantissa, inToken, walletInfo, networkInfo]);
	return (
		<Grid2
			container
			sx={classes.root}
			rowSpacing={1}
			columnSpacing={1}
		>
			<Grid2>
				<Card>
					<CardHeader
						title={
							<Typography variant="h6">
								Swap Tokens
							</Typography>
						}
					/>
					<CardContent>
						<Grid2 xs={12}>
							<TokenAmountInput
								asset={inToken}
								walletInfo={
									walletInfo
								}
								setMantissa={
									setInputAmountMantissa
								}
								mantissa={
									inputAmountMantissa
								}
							/>
						</Grid2>

						<Grid2 xs={12}>
							<Toggle
								toggle={
									swapFields
								}
								setToggle={
									setSwapFields
								}
							>
								{"swap fields"}
							</Toggle>
						</Grid2>

						<Grid2 xs={12}>
							<TokenAmountOutput
								asset={outToken}
							>
								{
									outputAmountMantissa
								}
							</TokenAmountOutput>
						</Grid2>
					</CardContent>
					<CardActions>
						<Transact callback={transact}>
							{
								("Buy " +
									outToken) as string
							}
						</Transact>
					</CardActions>
				</Card>

				<Paper variant="outlined" square>

		<Grid2 container sx={classes.slippageContainer}>
			<Grid2 
					xs={2}
					sm={2}
					md={2}
					lg={2}
			>Slippage</Grid2>

		<Grid2

					xs={10}
					sm={10}
					md={10}
					lg={10}
			sx={classes.slippageComponent}>
					<Slippage
					asset={outToken}
						walletInfo={walletInfo}
						setslippage={setSlippage}
						slippage={slippage}
						amountMantissa={
							new BigNumber(
								outputAmountMantissa
							)
						}
						inverse={true}
					/>
			</Grid2>
		</Grid2>

				</Paper>
			</Grid2>
		</Grid2>
	);
};
