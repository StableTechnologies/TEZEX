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

import { getAsset } from "../../constants";
import { TokenAmountOutput } from "../../components/ui/elements/Labels";
import { useSession } from "../../hooks/session";
import {
	useWallet,
	useWalletSwapOps,
	SwapOps,
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
		minHeight: "408px",
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

export interface ISwapToken {
	children: null;
}

export const Swap: FC = (props) => {
	const walletOperations: SwapOps = useWalletSwapOps();
	const [transactionId, setTransactionId] = useState<Id | null>(null);
	const [transaction, setTransaction] = useState<Transaction | null | undefined>(null);

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

	const [receiveAsset, setReceiveAsset] = useState(TokenKind.TzBTC);
	const [sendAsset, setSendAsset] = useState(TokenKind.XTZ);
	const [swapFields, setSwapFields] = useState<boolean>(true);
	const walletInfo = useWallet();
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

	useCallback(() => {
		//update transaction on edit change
	}, [inputAmountMantissa, slippage, inputAmountMantissa]);

	const newT = useCallback(async () => {
		if (!transactionId) {
			setTransactionId(null);

			await walletOperations.initializeSwap(
				sendAsset,
				receiveAsset
			);
		}
	}, []);
	useEffect(() => {
		const newTransaction = async () => {
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
			session.activeComponent === TransactingComponent.SWAP
		) {
			newTransaction();
			setLoading(false);
		}
	}, [loading]);

	useEffect(() => {}, [editing]);
	useEffect(() => { console.log('\n','transactionId : ', transactionId,'\n'); 
	}, [transactionId]);


	useEffect(() => { console.log('\n','transaction : ', transaction,'\n'); }, [transaction]);

	useEffect(() => {
		//run always
		if (session.activeComponent !== TransactingComponent.SWAP) {
			setLoading(true);
			session.loadComponent(TransactingComponent.SWAP);
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
									sendAsset
								}
								onChange={
									updateSend
								}
								value={sendAmount.toString()}
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
									receiveAsset
								}
								onChange={
									updateReceive
								}
								value={receiveAmount.toString()}
								readOnly={true}
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
										receiveAsset
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
