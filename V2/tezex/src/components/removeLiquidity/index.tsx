import { FC, useState, useEffect, useCallback } from "react";

import {
	Transaction,
	TokenKind,
	Asset,
	Id,
	TransactingComponent,
} from "../../types/general";

import { BigNumber } from "bignumber.js";
import { TokenInput} from "../../components/ui/elements/inputs";
import { Wallet } from "../wallet";
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
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import Typography from "@mui/material/Typography";
const classes = {
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

	input1: {
		position: "relative",

		"& .MuiFormControl-root": {
			width: "21.45vw",
			height: "3.8vw",
		},
	},
	card: {
		overflow: "hidden",
		position: "relative",
		height: "26.04vw", //"408px",
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

export const RemoveLiquidity: FC = (props) => {
	const walletOperations: WalletOps = useWalletOps(
		TransactingComponent.REMOVE_LIQUIDITY
	);
	const isWalletConnected = useWalletConnected();
	//const [transactionId, setTransactionId] = useState<Id | null>(null);

	const [loadingBalances, setLoadingBalances] = useState<boolean>(true);

	//const [syncing, setSyncing] = useState<boolean>(true);
	const [loading, setLoading] = useState<boolean>(true);
	//const [editing, setEditing] = useState<boolean>(false);
	const [sendAmount, setSendAmount] = useState(new BigNumber(0));

	//	const [receiveAmount, setReceiveAmount] = useState(new BigNumber(0));
	const [balance, setBalance] = useState(new BigNumber(0));

	const [useMax, setUseMax] = useState<boolean>(false);
	const send = 0;
	const receive1 = 1;
	const receive2 = 2;
	
	// eslint-disable-next-line
	const [assets, setAssets] = useState<[Asset, Asset, Asset]>([
		getAsset(TokenKind.Sirius),
		getAsset(TokenKind.XTZ),
		getAsset(TokenKind.TzBTC),
	]);
	const wallet = useWallet();
	const session = useSession();

	const active = walletOperations.getActiveTransaction();
	const transact = async () => {
		await walletOperations.sendTransaction();
	};


	useEffect(() => {
		if (useMax) setSendAmount(balance);
	}, [useMax, balance]);
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


		if (active) {
			if (
				!active.sendAmount[0].decimal.eq(sendAmount)
			) {

				await walletOperations.updateAmount(
					sendAmount.toString()
				);
			}

		}
	}, [sendAmount, active, walletOperations])

	useEffect(() => {

		updateTransaction();
	}, [updateTransaction]);


	const updateBalance = useCallback(async () => {
		if (isWalletConnected) {
			/*
			if (active) {
			}
			
			*/
			if (active) {

				setLoadingBalances(
					!(await walletOperations.updateBalance())
				);
				/*
				setBalances([
					active.sendAssetBalance[0].decimal.toString(),
					active.sendAssetBalance[1].decimal.toString(),
				]);
				*/
			}
		}
	}, [active, walletOperations, isWalletConnected]);

	useEffect(() => {
		if(active){
			setBalance(
					active.sendAssetBalance[0].decimal,
				);



					active.receiveAsset[1] && setAssets([active.sendAsset[0],active.receiveAsset[0],active.receiveAsset[1]]) 
		}
	},[active])
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
				transaction.sendAssetBalance[0].decimal ===
					balance
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
		balance,
		transactionId,
	]);
	*/

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
	} );


	const newTransaction = useCallback(async () => {
		await walletOperations
			.initialize(
				[assets[send]],
				[assets[receive1], assets[receive2]]
			)
			.then(async (transaction: Transaction | undefined) => {
				if (transaction) {
					await updateBalance().then(()=>{
					setLoading(false);
					setLoadingBalances(false);
					})
				}
			});
	}, [assets, updateBalance, walletOperations]);


	useEffect(() => {
		//run always

		const _newTransaction = async () => {
			await newTransaction();
		};


		if (!loading && !active) {
			_newTransaction();
		}
		if (loading && !active) {
			_newTransaction();
		} else if (loading) {
			if (active) {
				updateSend(
					active.sendAmount[0].decimal.toString()
				);
				setLoading(false);
			}
			if (
				session.activeComponent !==
				TransactingComponent.REMOVE_LIQUIDITY
			)
				session.loadComponent(
					TransactingComponent.REMOVE_LIQUIDITY
				);
		}
	}, [
		loading,
		active,
		newTransaction,
		session,
		updateSend,
		walletOperations,
	]);
	return (
		<Grid2 container sx={classes.root}>
			<Grid2>
				<Card sx={classes.card}>
					<CardHeader
						sx={{
							paddingBottom: "0px",
							fontSize: "1vw",
							textAlign: "left",
						}}
						title={
							<Typography
								sx={{
									fontSize: "1.4vw",
								}}
							>
								{
									"Remove Liquidity"
								}
							</Typography>
						}
					/>
					<CardContent sx={classes.cardcontent}>
						<Box
							sx={{
								display: "flex",

									position: "absolute",
			                                       top: "16.87%",
								justifyContent: "center",
									alignItems: "center",
								flexDirection:
									"row",
							}}
						>
							<Box sx={classes.input1}>
							<TokenInput
								assetName={
									assets[
										send
									].name
								}
								readOnly={
									useMax
								}
								onChange={
									updateSend
								}
								value={sendAmount.toString()}
								loading={
									loading
								}
								variant="LeftInput"
							/>
							</Box>
							<Button
								onClick={(
									event: React.MouseEvent<
										HTMLButtonElement,
										MouseEvent
									>
								) => {
									event.preventDefault();
									useMax
										? setUseMax(
												false
										  )
										: setUseMax(
												true
										  );
								}}
							>
								<Typography
									sx={{
									  fontSize: ".97vw",	
									 lineHeight: "1.176vw",
										color: useMax
											? "#00A0E4"
											: "#999999;",
									}}
								>
									{
										"Use Max"
									}
								</Typography>
							</Button>
						</Box>
					</CardContent>
					<CardActions sx={classes.cardAction}>
						<Box
							sx={{
								width: "28.33vw",
								height: "4.16vw",
									position: "absolute",
									top: "79.4%",
								justifyContent:
									"center",
							}}
						>
							<Wallet
								transaction={
									active
								}
								callback={
									transact
								}
							>
								{"Sell Shares"}
							</Wallet>
						</Box>
					</CardActions>
				</Card>
			</Grid2>
		</Grid2>
	);
};
