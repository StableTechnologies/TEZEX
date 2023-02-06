import { FC, useState, useEffect, useCallback } from "react";

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
import { useWallet, useWalletSwapOps, SwapOps } from "../../hooks/wallet";
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
		justifyContent: "center",
	},
	slippageContainer: {
		flexDirection: "row",
		position: "absolute",
		zIndex: 5,
		display: "flex",
		alignItems: "center",
		minWidth: 408,
		bottom: "17%",
		"& .MuiGrid2-root": {},
	},

	slippageComponent: {
		"& .MuiGrid2-root": {},
	},
	slippage: {
		text: {},
	},
	card: {

		minHeight: "30vw",//"408px",
		minWidth: "440px",
		borderRadius: "20px",
		zIndex: 5,
		background: "#FFFFFF",
		border: "1px solid #E1E1E1",
		"& .MuiCardContent-root": {
			padding: "8px",
		},
	},
	paper: {
		background: "blck",//F9F9F9",

		border: "1px solid #E1E1E1",
		minHeight: "146px",
		position: "relative",
		bottom: "10%",
		borderRadius: "20px",
		zIndex: -1,
		marginBottom: "20px",
	},
	root: {
		display: "flex",
		position: "relative",
		justifyContent: "center",
	},
};

export interface ISwapToken {
	children: null;
}

export const Swap: FC = (props) => {
	const walletOperations: SwapOps = useWalletSwapOps();
	const isWalletConnected = useWalletConnected();
	const [transactionId, setTransactionId] = useState<Id | null>(null);
	const [transaction, setTransaction] = useState<Transaction | undefined>(
		undefined
	);

	const [loadingBalances, setLoadingBalances] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	const [editing, setEditing] = useState<boolean>(false);
	const [sendAmount, setSendAmount] = useState(new BigNumber(0));
	const [receiveAmount, setReceiveAmount] = useState(new BigNumber(0));
	const [slippage, setSlippage] = useState<number>(-0.5);

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
	const updateSend = useCallback(
		(value: string) => {

		console.log('\n',':sssend uppdate '); 
			const amt = new BigNumber(value);
			if (amt !== sendAmount) setSendAmount(amt);
		},
		[sendAmount]
	);

	useEffect(() => {
		const updateTransaction = async (transaction: Transaction) => {
			await walletOperations.updateAmount(
				transaction,
				sendAmount.toString()
			);
		};

		const timer = setTimeout(() => {
			if (
				transaction &&
			///slow update because of issue here 
				transaction.sendAmount[0].decimal !== sendAmount
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
		}, 5000);

		return () => clearTimeout(timer);
	}, [sendAmount, transaction, walletOperations]);
	const updateReceive = useCallback((value: string) => {
		setReceiveAmount(new BigNumber(value));
	}, []);

	const [balances, setBalances] = useState<[string, string]>(["", ""]);

	const updateBalance = useCallback(async () => {
		if (wallet && isWalletConnected) {
			if (transaction) {
				setLoadingBalances(
					!(await walletOperations.updateBalance(
						transaction
					))
				);
			}

			if (transaction) {
				setBalances([
					transaction.sendAssetBalance[0].decimal.toString(),
					transaction.receiveAssetBalance[0].decimal.toString(),
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
		if (wallet) {
			setTransaction((t) => wallet.swapTransaction);
		}
	}, [wallet, setTransaction]);
	useEffect(() => {
		if (transaction) setTransactionId(transaction.id);
		if (transactionId && transaction) {
			setReceiveAmount(transaction.receiveAmount[0].decimal);
			setBalances([
				transaction.sendAssetBalance[0].decimal.toString(),
				transaction.receiveAssetBalance[0].decimal.toString(),
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
		? wallet.getActiveTransaction(TransactingComponent.SWAP)
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
		if (!transaction && loading && wallet) {
			const active = walletOperations.getActiveTransaction();
			console.log("\n", "active : ", active, "\n");
			if (active) setTransaction(active);
			await walletOperations
				.initializeSwap(assets[send], assets[receive])
				.then((transaction) => {
					console.log(
						"\n",
						"transaction : ",
						transaction,
						"\n"
					);
					setTransaction(transaction);
					setLoading(false);
				});
		}
	}, [assets, transaction, loading, wallet, walletOperations]);

	useEffect(() => {}, [loading, transaction, newTransaction]);

	useEffect(() => {
		//run always

		const _newTransaction = async () => {
			await newTransaction();
		};

		const active = walletOperations.getActiveTransaction();
		if (loading && !transaction && !active) _newTransaction();
		if (loading) {
			if (active) {
				setTransaction(active);
				setLoading(false);
			}
			if (
				session.activeComponent !==
				TransactingComponent.SWAP
			)
				session.loadComponent(
					TransactingComponent.SWAP
				);
		}
	}, []);

	return (
		<Grid2 container sx={classes.root}>
			<Grid2>
				<Card sx={classes.card}>
					<CardHeader
						title={
							<Typography variant="h6">
								{"Swap Tokens"}
							</Typography>
						}
					/>
					<CardContent>
						<Grid2
							xs={12}
							sx={{
								position: "relative",
								top: "10px",
							}}
						>
							<TokenInput
								assetName={
									assets[
										send
									]
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
							/>
						</Grid2>

						<Grid2
							xs={12}
							sx={{
								position: "relative",
								zIndex: 5,
							}}
						>
							<SwapUpDownToggle
								toggle={
									swapFields
								}
								setToggle={
									setSwapFields
								}
							>
								{"swap fields"}
							</SwapUpDownToggle>
						</Grid2>

						<Grid2
							xs={12}
							sx={{
								position: "relative",
								bottom: "10px",
							}}
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
									loadingBalances
										? "loading.."
										: balances[0]
								}
							/>
						</Grid2>

						<Box
							sx={
								classes.slippageContainer
							}
						>
							<Grid2
								xs={2}
								sm={2}
								md={2}
								lg={2}
							>
								Slippage
							</Grid2>

							<Grid2
								xs={10}
								sm={10}
								md={10}
								lg={10}
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
									value={
										slippage
									}
									onChange={
										updateSlippage
									}
									inverse={
										true
									}
								/>
							</Grid2>
						</Box>
					</CardContent>
					<CardActions sx={classes.cardAction}>
						<Grid2
							sx={{
								justifyContent:
									"center",
							}}
							xs={12}
						>
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

				<Paper
					variant="outlined"
					sx={classes.paper}
					square
				>
					<Grid2
						container
						sx={classes.slippageContainer}
					></Grid2>
				</Paper>
			</Grid2>
		</Grid2>
	);
};
