import { FC, useState, useEffect, useCallback } from "react";

import {
	Transaction,
	TokenKind,
	Asset,
	Id,
	TransactingComponent,
} from "../../types/general";

import { BigNumber } from "bignumber.js";
import { TokenInput, Slippage } from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
import { useWalletConnected } from "../../hooks/wallet";
import { getAsset } from "../../constants";
import { useSession } from "../../hooks/session";
import {
	useWallet,
	useWalletOps,
	WalletOps,
} from "../../hooks/wallet";
import { SwapUpDownToggle } from "../../components/ui/elements/Toggles";

import Box from "@mui/material/Box";
import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
const classes = {
	input1: {
		position: "absolute",
		top: "16.87%",
		"& .MuiFormControl-root": {
			width: "28.34vw",
			height: "6.94vw",
		},
	},
	input2: {
		position: "absolute",
		top: "43.27%",
		"& .MuiFormControl-root": {
			width: "28.34vw",
			height: "6.94vw",
		},
	},
	cardcontent: {
		"&.MuiCardContent-root": {
			paddingTop: "0px",
		},
		"& .MuiFormControl-root": {
			width: "28.34vw",
			height: "6.94vw",
		},
	},
	cardAction: {
		justifyContent: "center",
	},
	slippageContainer: {
		background: "black",
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
		overflow: "hidden",
		position: "relative",
		height: "28.49vw", //"408px",
		width: "30.56vw",
		borderRadius: "1.38vw",
		zIndex: 999,
		background: "#FFFFFF",
		border: "1px solid #E1E1E1",
		"& .MuiCardContent-root": {
			padding: "8px",
		},
	},
	paper: {
		background: "#F9F9F9",
		borderRadius: "20px",
		border: "1px solid #E1E1E1",
		minHeight: "146px",
		position: "relative",
		bottom: "10%",
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
	const walletOperations: WalletOps = useWalletOps(
		TransactingComponent.SWAP
	);
	const isWalletConnected = useWalletConnected();
	const [transactionId, setTransactionId] = useState<Id | null>(null);
	const [transaction, setTransaction] = useState<Transaction | undefined>(
		undefined
	);

	const [loadingBalances, setLoadingBalances] = useState<boolean>(true);
	//const [syncing, setSyncing] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	//	const [editing, setEditing] = useState<boolean>(false);
	const [sendAmount, setSendAmount] = useState(new BigNumber(0));
	const [receiveAmount, setReceiveAmount] = useState(new BigNumber(0));
	const [slippage, setSlippage] = useState<number>(0.5);

	const send = 0;
	const receive = 1;

	const [assets, setAssets] = useState<[Asset, Asset]>([
		getAsset(TokenKind.XTZ),
		getAsset(TokenKind.TzBTC),
	]);
	const [swapingFields, setSwapingFields] = useState<boolean>(true);
	const wallet = useWallet();
	const session = useSession();

	const active = walletOperations.getActiveTransaction();
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
		setAssets([assets[1], assets[0]]);
		setSwapingFields(true);
		setLoading(true);
	}, [assets]);


	const updateSend = useCallback(
		(value: string) => {
			const amt = new BigNumber(value);
			if (amt !== sendAmount) {
				setSendAmount(amt);
			}
		},
		[sendAmount]
	);

	useEffect(() => {
		const updateTransaction = async () => {
			await walletOperations.updateAmount(
				sendAmount.toString(), slippage.toString()
			);
		};

		if (
			transaction &&
			!transaction.sendAmount[0].decimal.eq(sendAmount)
		) {
			updateTransaction();
		}
		///slow update because of issue here ^^^
	}, [sendAmount, slippage,transaction, walletOperations]);

	const [balances, setBalances] = useState<[string, string]>(["", ""]);

	const updateBalance = useCallback(async () => {
		if (wallet && isWalletConnected) {
			if (transaction) {
				setLoadingBalances(
					!(await walletOperations.updateBalance())
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
		setTransaction(walletOperations.getActiveTransaction());
	}, [setTransaction, walletOperations]);


	/*
	useEffect(() => {
		if (transactionId && transaction) {
			if (
				transaction.sendAmount[0].decimal.eq(
					sendAmount
				) &&
				transaction.receiveAmount[0].decimal.eq(
					receiveAmount
				) &&
				transaction.slippage === slippage &&
				transaction.sendAssetBalance[0].decimal.toString() ===
					balances[0] &&
				transaction.receiveAssetBalance[0].decimal.toString() ===
					balances[1]
			) {
				setSyncing(false);
			} else {
				setSyncing(true);
			}
		}
	}, [
		transaction,
		receiveAmount,
		sendAmount,
		slippage,
		balances,
		transactionId,
	]);
	*/

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


	useEffect(() => {
		const updateTransactionBalance = async () => {
			await updateBalance();
		};

		const interval = setInterval(
			() => {
				updateTransactionBalance();

			},
			loadingBalances ? 2000 : 5000
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


	const newTransaction = useCallback(async () => {
		await walletOperations
			.initialize([assets[send]], [assets[receive]])
			.then((transaction) => {
				setTransaction(transaction);
				if (swapingFields) setSwapingFields(false);
				setLoading(false);
			});
	}, [swapingFields, assets, walletOperations]);

	useEffect(() => {}, [loading, transaction, newTransaction]);

	useEffect(() => {
		//run always

		const _newTransaction = async () => {
			await newTransaction();
		};

		const active = walletOperations.getActiveTransaction();

		if (loading && swapingFields) {
			_newTransaction();
		}
		if (loading && !transaction && !active) {
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
				TransactingComponent.SWAP
			)
				session.loadComponent(
					TransactingComponent.SWAP
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
				TransactingComponent.SWAP
			)
				session.loadComponent(
					TransactingComponent.SWAP
				);
	})
	return (
		<Grid2 container sx={classes.root}>
			<Grid2>
				<div>
					<Card sx={classes.card}>
						<CardHeader
							sx={{
								paddingBottom:
									"0px",
								fontSize: "1vw",
								textAlign: "left",
							}}
							title={
								<Typography
									sx={{
										fontSize: "1.4vw",
									}}
								>
									{"Swap"}
								</Typography>
							}
						/>
						<CardContent
							sx={classes.cardcontent}
						>
							<Grid2
								xs={12}
								sx={
									classes.input1
								}
							>
								<TokenInput
									assetName={
										assets[
											send
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
									loading={
										loading
									}
								/>
							</Grid2>

							<Grid2
								xs={12}
								sx={{
									position: "absolute",
								        top: "37.4%",
									zIndex: 5,
									height: "1vw",
								}}
							>
								<SwapUpDownToggle
									toggle={
										swapFields
									}
								/>
							</Grid2>

							<Grid2
								xs={12}
								sx={
									classes.input2
								}
							>
								<TokenInput
									assetName={
										assets[
											receive
										]
											.name
									}
									value={receiveAmount.toString()}
									readOnly={
										true
									}
									balance={
										loadingBalances
											? "loading.."
											: balances[1]
									}
								/>
							</Grid2>
						</CardContent>
						<CardActions
							sx={classes.cardAction}
						>
							<Box
								sx={{

									position: "absolute",
									top: "77.5%",
									width: "28.33vw",
									height: "4.16vw",
									justifyContent:
										"center",
								}}
							>
								<Wallet
									transaction={
										transaction
									}
									callback={
										transact
									}
								>
									{
										"Swap Tokens"
									}
								</Wallet>
							</Box>
						</CardActions>
					</Card>

					<Paper
						variant="outlined"
						sx={{
							position: "absolute",
							top: "89.4%",
							zindex: "-999",

							borderRadius: "1.38vw",
							background: "#F9F9F9",


			                                width: "30.6vw",
							height: "10.14vw",
						}}
						square
					>
						<Box
							sx={{
								display: "flex",
								justifyContent:
									"space-between",
								alignItems: "center",
								paddingTop: "6vw",
							}}
						>
							<Typography sx={{

								marginLeft: "1vw",
								fontSize: ".972vw",
								lineHeighr: "1.176vw",
							}}>
							Slippage
							</Typography>

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
						</Box>
					</Paper>
				</div>
			</Grid2>
		</Grid2>
	);
};
