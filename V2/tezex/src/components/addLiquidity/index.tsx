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
	Id,
	TransactingComponent,
} from "../../types/general";

import { BigNumber } from "bignumber.js";
import { TokenInput, Slippage } from "../../components/ui/elements/inputs";

import { useWalletConnected } from "../../hooks/wallet";
import { getAsset } from "../../constants";
import { useSession } from "../../hooks/session";
import {
	useWallet,
	useWalletOps,
	WalletOps,
} from "../../hooks/wallet";

import Box from "@mui/material/Box";
import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
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

	//const [syncing, setSyncing] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	//const [editing, setEditing] = useState<boolean>(false);
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
			console.log('\n','changedSlippage : ', '\n'); 
		},
		[slippage]
	);
	const swapFields = useCallback(() => {
		setAssets([assets[1], assets[0], assets[receive]]);
		console.log('\n','assets : ', assets,'\n'); 
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

	const updateTransaction = useCallback(async () => {
			await walletOperations.updateAmount(
				sendAmount.toString(),
				slippage.toString()
			);

	},[sendAmount, slippage, walletOperations])
	useEffect(() => {

			updateTransaction();
	}, [updateTransaction]);

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
		setTransaction(walletOperations.getActiveTransaction());
	}, [setTransaction, walletOperations]);

	/*
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
	*/
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

	const active = walletOperations.getActiveTransaction();
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
			.initialize(
				[assets[send1], assets[send2]],
				[assets[receive]]
			)
			.then((transaction: Transaction | undefined) => {
				if (transaction) {
					setTransaction(transaction);
					if (swapingFields)
						setSwapingFields(false);
					setLoading(false);
				}
			});
	}, [swapingFields, assets, walletOperations]);


	useEffect(() => {

		const _newTransaction = async () => {
			await newTransaction();
		};

		const active = walletOperations.getActiveTransaction();

		if (!loading && !transaction && !active) {
			_newTransaction();
		}
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
						<CardHeader
							sx={{
								paddingBottom:
									"1vw",
								fontSize: "1vw",
								textAlign: "left",
							}}
							title={
								<Typography
									sx={{
										fontSize: "1.4vw",
									}}
								>
									{"Add Liquidity"}
								</Typography>
							}
						/>
					<Grid2
						xs={8}
						lg={4}
						sx={classes.tokens}
					>
						<Box>
							<img
								style={
									{

												width: "7.1vw",
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

												width: "1.67vw",
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

										width: "6.1vw",
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
							        justifyContent: "space-between",
								alignItems: "center",
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
								xs={1}
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
									darker={true}
									swap={swapFields}
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
};
