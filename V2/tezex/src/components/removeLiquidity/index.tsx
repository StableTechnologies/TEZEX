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
import {Wallet} from "../wallet"
import { useWalletConnected } from "../../hooks/wallet";
import { getAsset } from "../../constants";
import { TokenAmountOutput } from "../../components/ui/elements/Labels";
import { useSession } from "../../hooks/session";
import { useWallet, useWalletOps, WalletOps, useWalletSwapOps, SwapOps } from "../../hooks/wallet";
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
	cardcontent :{

		"&.MuiCardContent-root": {
		paddingTop:"0px",
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
		background:"black",
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
		position:"relative",
		height: "28.49vw",//"408px",
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
	const walletOperations: WalletOps = useWalletOps(TransactingComponent.REMOVE_LIQUIDITY);
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
	const [receiveAmount, setReceiveAmount] = useState(new BigNumber(0));
	const [slippage, setSlippage] = useState<number>(-0.5);
	const [balance, setBalance] = useState(new BigNumber(0));
        
	const [useMax, setUseMax] = useState<boolean>(false);
	const send = 0;
	const receive1 = 1;
	const receive2 = 2;

	const [assets, setAssets] = useState<[Asset, Asset,Asset]>([
		getAsset(TokenKind.Sirius),
		getAsset(TokenKind.XTZ),
		getAsset(TokenKind.TzBTC),
	]);
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

	useEffect(() => {

		if (useMax) setSendAmount(balance);
	},[useMax, balance])
	const updateSend = useCallback(
		(value: string) => {

		console.log('\n',':sssend uppdate '); 
			const amt = new BigNumber(value);
			if (amt !== sendAmount){ 
	console.log('\n','sendAmount old value : ', sendAmount,'\n'); 
				console.log('\n','sendAMount new value : ', amt,'\n'); 
				setSendAmount(amt)};
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
	}, [sendAmount, transaction, walletOperations]);


	//const [balances, setBalances] = useState<[string, string]>(["", ""]);

	const updateBalance = useCallback(async () => {
		if (wallet && isWalletConnected) {
			if (transaction) {
				setLoadingBalances(
					!(await walletOperations.updateBalance(
					))
				);
			}

			/*
			if (transaction) {
				setBalances([
					transaction.sendAssetBalance[0].decimal.toString(),
					transaction.receiveAssetBalance[0].decimal.toString(),
				]);
			}
			*/
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
			setTransaction((t) => wallet.removeLiquidityTransaction);
		}
	}, [wallet, setTransaction]);

	useEffect(() => {
		if (
			transactionId &&
			transaction
		) {
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
	useEffect(() => {
		if (transaction) setTransactionId(transaction.id);
		if (transactionId && transaction) {
			setReceiveAmount(transaction.receiveAmount[0].decimal);
			setBalance(
				transaction.sendAssetBalance[0].decimal,
			);
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
		console.log('\n',' :new ','\n'); 
			await walletOperations
				.initialize([assets[send]], [assets[receive1], assets[receive2]])
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

		},
	[assets, walletOperations]);

	useEffect(() => {}, [loading, transaction, newTransaction]);

	useEffect(() => {
		//run always

		const _newTransaction = async () => {
			await newTransaction();
		};

		const active = walletOperations.getActiveTransaction();

		console.log('\n',' :swappuin ','\n'); 
		if (loading && !transaction && !active ){ 
			console.log('\n',' :call new ','\n'); 
			_newTransaction();
		} else if (loading) {
			if (active) {
				setTransaction(active);
				updateSend(active.sendAmount[0].decimal.toString());
				//updateSlippage(active.slippage.toString());
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
	}, [loading,transaction, active, newTransaction, session, updateSend, updateSlippage, walletOperations]);

	return (
		<Grid2 container sx={classes.root}>
			<Grid2>
					<Card sx={classes.card}>
						<CardHeader
							sx={{
							    paddingBottom:"0px",
                                                                    fontSize:"1vw",
textAlign: 'left'
							}}
							title={
								<Typography sx={{
									fontSize:"1.4vw"
								}}>
									{"Remove Liquidity"}
								</Typography>
							}
						/>
						<CardContent sx={classes.cardcontent}>
							<Box sx={{

								display:"flex",
								flexDirection:"row",
							}}>
							<TokenInput
								assetName={
									assets[
										send
									].name
								}
								readOnly={useMax}
								onChange={
									updateSend
								}
								value={sendAmount.toString()}
								loading={loading}
								variant="LeftInput"
							/>
							<Button

			onClick={(
				event: React.MouseEvent<
					HTMLButtonElement,
					MouseEvent
				>
			) => {
				event.preventDefault();
				(useMax)?  setUseMax(false) : setUseMax(true);
			}}
							
							>

							<Typography
								sx={{
									color:(useMax)? "blue" : "black",
								}}
							>
							{"Use Max"}
							</Typography>
							</Button>
							</Box>
					
					

						</CardContent>
						<CardActions sx={classes.cardAction}>
							<Box
								sx={{
									width:"28.33vw",
									height:"4.16vw",
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
									{"Sell Shares"}
								</Wallet>
							</Box>
						</CardActions>
					</Card>
			</Grid2>
		</Grid2>
	);
};