import { FC, useState, useEffect, useCallback } from "react";
import xtzTzbtcIcon from "../../assets/xtzTzbtcIcon.svg";
import sirsIcon from "../../assets/sirsIcon.svg";
import rightArrow from "../../assets/rightArrow.svg";
import plusIcon from "../../assets/plusIcon.svg";

import { Wallet } from "../wallet";
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
	useWalletOps,
	WalletOps,
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
		flexDirection: "column",
		paddingTop: "10vw",
		alignItems: "center",
		display: "flex",
	},
	card: {
		minHeight: "32.57vw",
		minWidth: "63.88vw",
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
	const walletOperations: WalletOps = useWalletOps(
		TransactingComponent.ADD_LIQUIDITY
	);
	const isWalletConnected = useWalletConnected();
	const [transactionId, setTransactionId] = useState<Id | null>(null);
	const [transaction, setTransaction] = useState<Transaction | undefined>(
		undefined
	);

	const [loadingBalances, setLoadingBalances] = useState<boolean>(true);

	const [syncing, setSyncing] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	const [editing, setEditing] = useState<boolean>(false);
	const [sendAmount, setSendAmount] = useState(new BigNumber(0));
	const [sendAmount2, setSendAmount2] = useState(new BigNumber(0));
	const [receiveAmount, setReceiveAmount] = useState(new BigNumber(0));
	const [slippage, setSlippage] = useState<number>(-0.5);

	const send1 = 0;
	const send2 = 1;
	const receive = 2;

	const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
		getAsset(TokenKind.XTZ),
		getAsset(TokenKind.TzBTC),
		getAsset(TokenKind.Sirius),
	]);
	const [swapingFields, setSwapingFields] = useState<boolean>(true);
	const wallet = useWallet();
	const session = useSession();

	const transact = async () => {
		await walletOperations.sendTransaction();
	};

	const updateSlippage = useCallback(
		(value: string) => {
			const amt = new BigNumber(value).toNumber();
			if (amt !== slippage) {
				setSlippage(amt);
			}
		},
		[slippage]
	);
	const swapFields = useCallback(() => {
		setAssets([assets[send2], assets[send1], assets[receive]]);
		setSwapingFields(true);
		setLoading(true);
	}, [assets]);
	const updateSend = useCallback(
		(value: string) => {
			/*
			console.log("\n", ":sssend uppdate ");
			*/
			const amt = new BigNumber(value);
			if (amt !== sendAmount) {
				/*
				console.log(
					"\n",
					"sendAmount old value : ",
					sendAmount,
					"\n"
				);
				console.log(
					"\n",
					"sendAMount new value : ",
					amt,
					"\n"
				);
				*/
				setSendAmount(amt);
			}
		},
		[sendAmount]
	);

	useEffect(() => {
		const updateTransaction = async (transaction: Transaction) => {
			await walletOperations.updateAmount(
				sendAmount.toString(),
				slippage.toString()
			);
		};

		if (
			transaction &&
			///slow update because of issue here
			!transaction.sendAmount[0].decimal.eq(sendAmount)
		) {
			console.log(
				"\n",
				"transaction.sendAmount[0].decimal : ",
				transaction.sendAmount[0].decimal.toString(),
				"\n"
			);
			console.log(
				"",
				"sendAmount : ",
				sendAmount.toString(),
				"\n"
			);
			updateTransaction(transaction);
		}
		///slow update because of issue here ^^^
	}, [sendAmount, transaction, walletOperations]);
	const updateReceive = useCallback((value: string) => {
		setReceiveAmount(new BigNumber(value));
	}, []);

	const [balances, setBalances] = useState<[string, string]>(["", ""]);

	const updateBalance = useCallback(async () => {
		if (wallet && isWalletConnected) {
			if (transaction) {
				setLoadingBalances(
					!(await walletOperations.updateBalance())
				);
			}

			if (transaction && transaction.sendAssetBalance[1]) {
				setBalances([
					transaction.sendAssetBalance[0].decimal.toString(),
					transaction.sendAssetBalance[1].decimal.toString(),
				]);
			}
		}
	}, [transaction, wallet, walletOperations, isWalletConnected]);

	useEffect(() => {
		const update = async () => {
			await updateBalance();
		};
		//	if(isWalletConnected) update()
	}, [isWalletConnected, updateBalance]);
	useEffect(() => {
		setTransaction((t) => walletOperations.getActiveTransaction());
	}, [setTransaction, walletOperations]);

	useEffect(() => {
		if (
			transactionId &&
			transaction &&
			transaction.sendAmount[1] &&
			transaction.sendAssetBalance[1]
		) {
			if (
				transaction.sendAmount[0].decimal.eq(
					sendAmount
				) &&
				transaction.sendAmount[1].decimal.eq(
					sendAmount2
				) &&
				transaction.receiveAmount[0].decimal.eq(
					receiveAmount
				) &&
				transaction.slippage === slippage &&
				transaction.sendAssetBalance[0].decimal.toString() ===
					balances[0] &&
				transaction.sendAssetBalance[1].decimal.toString() ===
					balances[1] &&
				transaction.receiveAmount[0].decimal.eq(
					receiveAmount
				)
			) {
				setSyncing(false);
			} else {
				setSyncing(true);
			}
		}
	}, [
		transaction,
		sendAmount2,
		receiveAmount,
		sendAmount,
		slippage,
		balances,
		transactionId,
	]);
	useEffect(() => {
		if (transaction) setTransactionId(transaction.id);
		if (
			transactionId &&
			transaction &&
			transaction.sendAmount[1] &&
			transaction.sendAssetBalance[1]
		) {
			setReceiveAmount(transaction.receiveAmount[0].decimal);
			setSendAmount2(transaction.sendAmount[1].decimal);
			setBalances([
				transaction.sendAssetBalance[0].decimal.toString(),
				transaction.sendAssetBalance[1].decimal.toString(),
			]);
		}
	}, [transaction, transactionId]);
	/*
	useEffect(() => {
		const newTransaction = async () => {
			        console.log('\n','newTransaction '); 
				const transaction = await walletOperations.initializeSwap(
					sendAsset,
					receiveAsset
				).then((id) => {
					if (id) {
					setTransactionId(id)
					return walletOperations.viewTransaction(id)
					} else return null
				})
	
			setTransaction(transaction);
		};
		if (
			loading &&
			!transactionId && 
			!editing &&
			session.activeComponent === TransactingComponent.SWAP
		) {
			setEditing(true);
			newTransaction();
			setEditing(false);
			setLoading(false);
		}
	}, [loading, editing, receiveAsset,sendAsset, session.activeComponent, transactionId, walletOperations ]);
	*/

	const activeWallet = wallet
		? wallet.getActiveTransaction(
				TransactingComponent.ADD_LIQUIDITY
		  )
		: undefined;
	const active = walletOperations.getActiveTransaction();
	useEffect(() => {}, [editing]);
	useEffect(() => {
		const updateTransactionBalance = async () => {
			await updateBalance();
		};

		const interval = setInterval(
			() => {
				updateTransactionBalance();

				/*
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
			*/
				/*
			wallet &&
				console.log(
					"\n",
					"wallet.getActiveTransaction(TransactingComponent.SWAP) : ",
					wallet.getActiveTransaction(
						TransactingComponent.SWAP
					),
					"\n"
				);
			active &&
				console.log(
					"\n",
					"active.sendAssetBalance[0].decimal : ",
					active.sendAssetBalance[0].decimal.toString(),
					"\n"
				);
			transaction &&
				console.log(
					"\n",
					"transaction.sendAssetBalance[0].decimal : ",
					transaction.sendAssetBalance[0].decimal.toString(),
					"\n"
				);
			*/
			},
			loadingBalances ? 500 : 5000
		);
		return () => clearInterval(interval);
		//if (isWalletConnected) updateTransactionBalance();
	}, [
		isWalletConnected,
		loadingBalances,
		updateBalance,
		active,
		transaction,
		walletOperations,
	]);

	useEffect(() => {}, []);
	useEffect(() => {
		/*
		console.log("\n", "transaction : ", transaction, "\n");
		transaction &&
			console.log(
				"\n",
				"transaction.sendAssetBalance[0].decimal : ",
				transaction.sendAssetBalance[0].decimal.toString(),
				"\n"
			);
		*/
	}, [transaction]);

	const newTransaction = useCallback(async () => {
		/*
		console.log("\n", " :new ", "\n");
		*/
		await walletOperations
			.initialize(
				[assets[send1], assets[send2]],
				[assets[receive]]
			)
			.then((transaction: Transaction | undefined) => {
				/*
				console.log(
					"\n",
					"transaction : ",
					transaction,
					"\n"
				);
				*/
				if (transaction) {
					setTransaction(transaction);
					if (swapingFields)
						setSwapingFields(false);
					setLoading(false);
				}
			});
	}, [swapingFields, assets, walletOperations]);

	useEffect(() => {}, [loading, transaction, newTransaction]);

	useEffect(() => {
		//run always

		const _newTransaction = async () => {
			await newTransaction();
		};

		const active = walletOperations.getActiveTransaction();

		if (!loading && !transaction && !active) {
			_newTransaction();
		}
		if (loading && swapingFields) {
			/*
			console.log("\n", " :swappuin ", "\n");
			*/
			_newTransaction();
		}
		if (loading && !transaction && !active) {
			/*
			console.log("\n", " :call new ", "\n");
			*/
			_newTransaction();
		} else if (loading) {
			if (active) {
				setTransaction(active);
				updateSend(
					active.sendAmount[0].decimal.toString()
				);
				updateSlippage(active.slippage.toString());
				setLoading(false);
			}
			if (
				session.activeComponent !==
				TransactingComponent.ADD_LIQUIDITY
			)
				session.loadComponent(
					TransactingComponent.ADD_LIQUIDITY
				);
		}
	}, [
		swapingFields,
		loading,
		transaction,
		active,
		newTransaction,
		session,
		updateSend,
		updateSlippage,
		walletOperations,
	]);

	useEffect(() => {
		if (
			session.activeComponent !==
			TransactingComponent.ADD_LIQUIDITY
		)
			session.loadComponent(
				TransactingComponent.ADD_LIQUIDITY
			);
	});
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
							xs={12}
							sx={{
								display: "flex",
								flexDirection:
									"row",
							}}
						>
							<Grid2
								xs={6}
								sx={
									classes.input
								}
							>
								<TokenInput
									assetName={
										assets[
											send1
										]
											.name
									}
									onChange={
										updateSend
									}
									value={sendAmount.toString()}
									balance={
										loadingBalances
											? "loading.."
											: balances[0]
									}
									label="Enter Amount"
									loading={
										loading
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
									src={
										plusIcon
									}
									alt="plusIcon"
								/>
							</Grid2>

							<Grid2
								xs={6}
								sx={
									classes.input
								}
							>
								<TokenInput
									assetName={
										assets[
											send2
										]
											.name
									}
									value={sendAmount2.toString()}
									readOnly={
										true
									}
									balance={
										loadingBalances
											? "loading.."
											: balances[1]
									}
									label="Required Amount"
								/>
							</Grid2>
						</Grid2>

						<Grid2
							xs={12}
							sx={{
								flexDirection:
									"row",
								display: "inline-flex",
								alignItems: "flex-start",
							}}
						>
							<Typography noWrap
								sx={{
									display: "inline-flex",
									fontSize: ".97vw",
									fontWeight: "400",
									lineHeight: "1.18vw",
								}}
							>
								You will recieve
								about {" "}
								<Typography
									sx={{
										marginLeft: ".37vw",
										marginRight: ".37vw",
										fontSize: ".97vw",
										fontWeight: "700",
										lineHeight: "1.18vw",
									}}
								>
									{" "}{receiveAmount.toString()}{" "}
									Sirs
								</Typography>
								for this
								deiposit
							</Typography>
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
									].name
								}
								value={slippage}
								onChange={
									updateSlippage
								}
								inverse={true}
							/>
						</Grid2>

						<Grid2 sx={{}} xs={6}>
							<Wallet
								transaction={
									transaction
								}
								callback={
									transact
								}
							>
								{
									"Add Liquidity"
								}
							</Wallet>
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
