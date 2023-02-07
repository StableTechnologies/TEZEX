import { FC, useState, useEffect, useCallback } from "react";
import xtzTzbtcIcon from "../../assets/xtzTzbtcIcon.svg";
import sirsIcon from "../../assets/sirsIcon.svg";
import rightArrow from "../../assets/rightArrow.svg";
import plusIcon from "../../assets/plusIcon.svg";

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

import { BigNumber } from "bignumber.js";
import { TokenInput, Slippage } from "../../components/ui/elements/inputs";

import { useWalletConnected } from "../../hooks/wallet";
import { getAsset } from "../../constants";
import { TokenAmountOutput } from "../../components/ui/elements/Labels";
import { useSession } from "../../hooks/session";
import {
	useWallet,
	useWalletAddLiquidityOps,
	AddLiquidityOps,
} from "../../hooks/wallet";
import { useNetwork } from "../../hooks/network";
import {
	estimateTokensFromXtz,
	estimateXtzFromToken,
	xtzToToken,
	tokenToXtz,
} from "../../functions/liquidityBaking";
import { Transact } from "../../components/ui/elements/Buttons";
import { SwapUpDownToggle } from "../../components/ui/elements/Toggles";

import Box from "@mui/material/Box";
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
	cardAction: {
		justifyContent: "space-between",
	},
	input: {
		"& .MuiFormControl-root": {
			width: "28.34vw",
			height: "8.61vw",
		},
	},
	slippageContainer: {
		display: "flex",
		width: "100%",
		alignItems: "center",
		flexDirection: "row",
		/*
		flexDirection: "row",
		position: "absolute",
		zIndex: 5,
		display: "flex",
		alignItems: "center",
		//minWidth: 408,
		//bottom: "17%",
		*/
		"& .MuiGrid2-root": {},
	},

	slippageComponent: {
		"& .MuiGrid2-root": {},
	},
	slippage: {
		text: {},
	},
	tokens: {
		display: "flex",
	},
	cardContent: {
		"&.MuiCardContent-root": {
			paddingTop: "4vw",
		},
		paddingTop: "10vw",
		alignItems: "center",
		display: "flex",
	},
	card: {
		minHeight: "46vh",
		minWidth: "64vw",
		borderRadius: "20px",
		zIndex: 5,
		background: "#FFFFFF",
		border: "1px solid #E1E1E1",
		"& .MuiCardContent-root": {
			padding: "8px",
		},
	},
	paper: {
		background: "#F9F9F9",
		minHeight: "146px",
		position: "relative",
		bottom: "10%",
		borderRadius: "20px",
		zIndex: -1,
		marginBottom: "20px",
	},
	root: {
		position: "relative",
		justifyContent: "center",
	},
};

export interface IAddLiquidity {
	children: null;
}
export const AddLiquidity: FC = (props) => {
	const walletOperations: AddLiquidityOps = useWalletAddLiquidityOps();
	const isWalletConnected = useWalletConnected();
	const [transactionId, setTransactionId] = useState<Id | null>(null);
	const [transaction, setTransaction] = useState<Transaction | undefined>(
		undefined
	);

	const [loading, setLoading] = useState<boolean>(true);
	const [editing, setEditing] = useState<boolean>(false);
	const [inputAmountMantissa, setInputAmountMantissa] = useState<
		BigNumber | number | null
	>(null);

	const [sendAmount, setSendAmount] = useState(new BigNumber(0));
	const [receiveAmount, setReceiveAmount] = useState(new BigNumber(0));
	const [slippage, setSlippage] = useState<number>(-0.5);
	const [outputAmountMantissa, setOutputAmountMantissa] = useState<
		BigNumber | number | null
	>(0);

	const send = 0;
	const receive = 1;

	const [assets, setAssets] = useState<[TokenKind, TokenKind]>([
		TokenKind.XTZ,
		TokenKind.TzBTC,
	]);
	const [swapFields, setSwapFields] = useState<boolean>(true);
	const wallet = useWallet();
	const session = useSession();
	const transact = async () => {};

	const updateSlippage = useCallback((value: number) => {
		setSlippage(value);
	}, []);
	const updateSend = useCallback((value: string) => {
		setSendAmount(new BigNumber(value));
	}, []);
	const updateReceive = useCallback((value: string) => {
		setReceiveAmount(new BigNumber(value));
	}, []);

	const [balances, setBalances] = useState<[string, string, string]>([
		"0.0",
		"0.0",
		"0.0",
	]);
	useEffect(() => {
		if (wallet) {
			setTransaction((t) => wallet.swapTransaction);
		}
		if (transaction) setTransactionId(transaction.id);
	}, [wallet, transaction]);

	const activeWallet = wallet
		? wallet.getActiveTransaction(
				TransactingComponent.ADD_LIQUIDITY
		  )
		: undefined;
	const active = walletOperations.getActiveTransaction();
	useEffect(() => {}, [editing]);
	useEffect(() => {
		const updateTransactionBalance = async () => {
			transaction &&
				(await walletOperations.updateBalance(
					transaction
				));
		};

		const interval = setInterval(() => {
			updateTransactionBalance();

			transaction &&
				console.log(
					"\n",
					"...........transaction.sendAssetBalance[0].mantissa : ",
					transaction.sendAssetBalance[0].mantissa.toString(),
					"\n"
				);
			transaction &&
				console.log(
					"\n",
					"...........transaction.sendAssetBalance[0].decimal : ",
					transaction.sendAssetBalance[0].decimal.toNumber(),
					"\n"
				);
		}, 5000);
		return () => clearInterval(interval);
		//if (isWalletConnected) updateTransactionBalance();
	}, [isWalletConnected, active, transaction, walletOperations]);

	useEffect(() => {}, []);
	useEffect(() => {
		console.log("\n", "transaction : ", transaction, "\n");
		transaction &&
			console.log(
				"\n",
				"transaction.sendAssetBalance[0].decimal : ",
				transaction.sendAssetBalance[0].decimal.toString(),
				"\n"
			);
	}, [transaction]);

	const newTransaction = useCallback(async () => {
		if (!transaction && loading) {
			await walletOperations
				.initializeSwap(assets[send], assets[receive])
				.then((transaction) => {
					setLoading(false);
				});
		}
	}, [assets, transaction, loading, walletOperations]);

	useEffect(() => {}, [loading, transaction, newTransaction]);

	useEffect(() => {
		//run always

		const _newTransaction = async () => {
			await newTransaction();
		};

		if (loading && !transaction) _newTransaction();
		if (loading) {
			if (
				session.activeComponent !==
				TransactingComponent.ADD_LIQUIDITY
			)
				session.loadComponent(
					TransactingComponent.ADD_LIQUIDITY
				);
		}
	}, []);

	return (
		<Grid2 container sx={classes.root}>
			<Grid2>
				<Card sx={classes.card}>
					<Grid2 xs={12}>
						<CardHeader
							title={
								<Typography variant="h6">
									{
										"Add Liquidty"
									}
								</Typography>
							}
						/>
					</Grid2>
					<Grid2
						xs={8}
						lg={4}
						sx={classes.tokens}
					>
						<Box>
							<img
								style={
									{
										/*
												marginLeft: "8px",
												marginRight:
													"8px",
												maxWidth: "30px",
												width: "30px",
												height: "30px",
												*/
									}
								}
								src={
									xtzTzbtcIcon
								}
								alt="xtzTzbtcIcon"
							/>
						</Box>
						<Box>
							<img
								style={
									{
										/*
												marginLeft: "8px",
												marginRight:
													"8px",
												maxWidth: "30px",
												width: "30px",
												height: "30px",
												*/
									}
								}
								src={rightArrow}
								alt="rightArrow"
							/>
						</Box>
						<Box>
							<img
								style={
									{
										/*
												marginLeft: "8px",
												marginRight:
													"8px",
												maxWidth: "30px",
												width: "30px",
												height: "30px",
												*/
									}
								}
								src={sirsIcon}
								alt="sirsIcon"
							/>
						</Box>
					</Grid2>
					<CardContent sx={classes.cardContent}>
						<Grid2
							xs={6}
							sx={classes.input}
						>
							<TokenInput
								assetName={
									assets[
										send
									]
								}
								value={sendAmount.toString()}
								balance={
									balances[0]
								}
							/>
						</Grid2>

						<Grid2
							xs={0.5}
							sx={{
								position: "relative",
							}}
						>
							<img
								src={plusIcon}
								alt="plusIcon"
							/>
						</Grid2>

						<Grid2
							xs={6}
							sx={classes.input}
						>
							<TokenInput
								assetName={
									assets[
										receive
									]
								}
								value={receiveAmount.toString()}
								readOnly={true}
								balance={
									balances[1]
								}
							/>
						</Grid2>
					</CardContent>
					<CardActions sx={classes.cardAction}>
						<Grid2 xs={1}>Slippage</Grid2>

						<Grid2
							xs={4}
							sx={
								classes.slippageComponent
							}
						>
							<Slippage
								asset={
									assets[
										receive
									]
								}
								value={slippage}
								onChange={
									updateSlippage
								}
								inverse={true}
							/>
						</Grid2>

						<Grid2 sx={{}} xs={6}>
							<Transact
								callback={
									transact
								}
							>
								{"Swap Tokens"}
							</Transact>
						</Grid2>
					</CardActions>
				</Card>
			</Grid2>
		</Grid2>
	);
	/*
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
	*/
};
