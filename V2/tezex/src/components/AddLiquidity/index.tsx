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
	estimateShares,
	buyLiquidityShares,
} from "../../functions/liquidityBaking";
import { Transact } from "../../components/ui/elements/Buttons";
import { Toggle } from "../../components/ui/elements/Toggles";

import { TokenKind } from "../../types/general";

import Grid2 from '@mui/material/Unstable_Grid2'; // Grid version 2
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from '@mui/material/CardHeader';
import Grid from "@mui/material/Grid";
//import KeyboardArrowDownIcon from '@mui/material/icons/KeyboardArrowDown';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from "@mui/material/Typography";
export interface IAddLiquidity {
	children: null;
}
export const AddLiquidity: FC = (props) => {
	const [inputAmountMantissa, setInputAmountMantissa] = useState<
		BigNumber | number | null
	>(null);
	const [shares, setShares] = useState<BigNumber | number>(0);
	const [slippage, setSlippage] = useState<BigNumber | number >(
		0.5
	);
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
					await buyLiquidityShares(
						new BigNumber(
							outputAmountMantissa
						),
						new BigNumber(
							inputAmountMantissa
						),
						new BigNumber(
							slippage ? slippage : 0
						),
						networkInfo.addresses.tzbtc.dex
							.sirius,
						networkInfo.addresses.tzbtc
							.address,
						walletInfo
					);
					break;
				case TokenKind.TzBTC:
					await buyLiquidityShares(
						new BigNumber(
							inputAmountMantissa
						),
						new BigNumber(
							outputAmountMantissa
						),
						new BigNumber(
							slippage ? slippage : 0
						),
						networkInfo.addresses.tzbtc.dex
							.sirius,
						networkInfo.addresses.tzbtc
							.address,
						walletInfo
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

	useEffect(() => {
		const shares = async () => {
			if (inputAmountMantissa && walletInfo) {
				switch (inToken) {
					case TokenKind.XTZ:
						setShares(
							await estimateShares(
								new BigNumber(
									inputAmountMantissa
								),
								new BigNumber(
									outputAmountMantissa
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
						setShares(
							await estimateShares(
								new BigNumber(
									outputAmountMantissa
								),
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
				}
			}
		};
		shares()
	}, [
		outputAmountMantissa,
		inputAmountMantissa,
		inToken,
		walletInfo,
		networkInfo,
	]);

	return (

		<Grid2  container >
			<div>
						<Card>
			
			                <CardHeader
			                  title={
			                    <Typography variant="h6" >
						Add Liquidity
			                    </Typography>
			                  }
			                />
					<CardContent>
				<Grid2 xs={12}>
			
			<TokenAmountInput
				asset={inToken}
				walletInfo={walletInfo}
				setMantissa={setInputAmountMantissa}
				mantissa={inputAmountMantissa}
			/>
				</Grid2>	
			
				<Grid2 xs={12}>
			
			<Toggle toggle={swapFields} setToggle={setSwapFields}>
				{"swap fields"}
			</Toggle>
				</Grid2>	
			
			<TokenAmountOutput asset={outToken} checkBalance={true}>
				{outputAmountMantissa}
			</TokenAmountOutput>
				<Grid2 xs={12}>
			
				</Grid2>	
					</CardContent>
					<CardActions>

			<Slippage
				asset={TokenKind.TzBTC}
				walletInfo={walletInfo}
				setslippage={setSlippage}
				slippage={slippage}
				amountMantissa={
					new BigNumber(outputAmountMantissa)
				}
			/>
			<Transact callback={transact}>
				{"Buy " + shares.toString() + " Shares"}
			</Transact>
					</CardActions>
						</Card>
			
			
			
			</div>
		</Grid2>
	);
};
