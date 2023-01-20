import { FC, useState } from "react";
import { BigNumber } from "bignumber.js";

import { WalletInfo } from "../../../../contexts/wallet";

import { useNetwork } from "../../../../hooks/network";
import { TokenKind } from "../../../../types/general";
import { hasSufficientBalance } from "../../../../functions/beacon";
import { addSlippage } from "../../../../functions/liquidityBaking";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
//import KeyboardArrowDownIcon from '@mui/material/icons/KeyboardArrowDown';
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Input from "@mui/material/Input";
import FilledInput from "@mui/material/FilledInput";
import OutlinedInput from "@mui/material/OutlinedInput";
import InputLabel from "@mui/material/InputLabel";
import InputAdornment from "@mui/material/InputAdornment";
import FormHelperText from "@mui/material/FormHelperText";
import FormControl from "@mui/material/FormControl";
import TextField from "@mui/material/TextField";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
const tabClasses = {
	"&.MuiButtonBase-root": {
		minHeight: 44,
		minWidth: 96,
		zIndex: 2,
		// marginTop: spacing(0.5),
		color: "palette.text.primary",
		textTransform: "initial",
	},
	wrapper: {
		// zIndex: 2,
		// marginTop: spacing(0.5),
		color: "palette.text.primary",
		textTransform: "initial",
	},
};

const classes = {
	".MuiTabs-flexContainer": {
		border: "1px solid #EDEDED",
		borderRadius: 4,
		display: "inline-flex",
		position: "relative",
	},
	".MuiTabs-indicator": {
		top: 0,
		bottom: "12%",
		right: 3,
		height: "auto",
		background: "none",
		"&:after": {
			content: '""',
			display: "block",
			position: "absolute",
			top: "10%",
			left: 4,
			right: 4,
			bottom: "10%",
			borderRadius: 3,
			backgroundColor: "selectedHomeTab.main", //'#E3F7FF',//'palette.action.selected' ,
		},
	},
};

interface NavTabProps {
	label: string;
	href: string;
}

function NavTab(props: NavTabProps) {
	return (
		<Tab
			sx={tabClasses}
			onClick={(
				event: React.MouseEvent<
					HTMLAnchorElement,
					MouseEvent
				>
			) => {
				event.preventDefault();
			}}
			{...props}
		/>
	);
}

export interface ISlippage {
	asset: TokenKind;
	walletInfo: WalletInfo | null;
	setSlippage: React.Dispatch<
		React.SetStateAction<BigNumber | number | null>
	>;
	slippage: BigNumber | number | null;
	amountMantissa: BigNumber;
	inverse?: boolean;
	balanceCheck?: boolean;
}

export const Slippage: FC<ISlippage> = (props) => {
	const [sufficientBalance, setSufficientBalance] = useState(true);
	const net = useNetwork();
	const updateAmount = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const num = props.inverse
			? new BigNumber(e.target.value).multipliedBy(-1)
			: new BigNumber(e.target.value);

		num.isNaN() ? props.setSlippage(null) : props.setSlippage(num);
		if (props.balanceCheck) {
			if (props.walletInfo && num.gt(0) && !num.isNaN()) {
				setSufficientBalance(
					await hasSufficientBalance(
						addSlippage(
							new BigNumber(
								e.target.value
							),
							props.amountMantissa
						),
						props.walletInfo,
						net,
						props.asset,
						true
					)
				);
			} else {
				setSufficientBalance(true);
			}
		}
	};

	const [value, setValue] = useState(0);

	const handleChange = (
		event: React.SyntheticEvent,
		newValue: number
	) => {
		setValue(newValue);
	};
	const view = (): string => {
		if (props.slippage) {
			return props.inverse
				? new BigNumber(props.slippage)
						.multipliedBy(-1)
						.toString()
				: new BigNumber(props.slippage).toString();
		} else return "0";
	};

	const SlippageInput = () => {
		return (
			<Grid2
				sx={{
					zIndex: 3,
				}}
				xs={3}
				sm={3}
				md={3}
				lg={3}
			>
				<TextField
					onChange={updateAmount}
					value={view()}
					id="filled-start-adornment"
					sx={{

						"& .MuiInputBase-root": {
							minHeight: 44,
							minWidth: 50,
							maxWidth: 50,
							// marginTop: spacing(0.5),
							textTransform:
								"initial",
						},
						"&.MuiButtonBase-root": {
							minHeight: 44,
							minWidth: 100,
							maxWidth: 100,
							// marginTop: spacing(0.5),
							textTransform:
								"initial",
						},
					}}
					InputProps={{
						disableUnderline: true,
						endAdornment: (
							<InputAdornment position="start">
								%
							</InputAdornment>
						),
					}}
					inputProps={{
						style: {
							textAlign: "right",
						},
					}}
					size="small"
					variant="standard"
				/>
			</Grid2>
		);
	};
	const SlippageTabs = () => {
		return (
			<Tabs
				value={value}
				sx={classes}
				onChange={handleChange}
				aria-label="nav tabs example"
			>
				<NavTab label="Swap" href="/home/swap" />
				<NavTab
					label="Add Liquidity"
					href="/home/add"
				/>
				<Tab label={<SlippageInput />} />
			</Tabs>
		);
	};

	// move grid to individual comp swap/add 
	return (
		<Grid2 container sx={{ flexDirection: "row" }}>
			<Grid2>Slippage</Grid2>

			<Grid2>
				<SlippageTabs />
			      
			</Grid2>
		</Grid2>
	);
};
/*
  
		<div>
			<div>
			

			<Tabs
				value={value}
				sx={classes}
				onChange={handleChange}
				aria-label="nav tabs example"
			>
				<NavTab label="Swap" href="/home/swap" />
				<NavTab label="Add Liquidity" href="/home/add" />
				<Tab
					label={<SlippageInput />} 
				/>
			</Tabs>
			</div>
			<div>
				<SlippageInput />	
			</div>
			<div>
			<label style={{}} className="slippage-label">
				{"slippage "}
			</label>
			<input
				type="number"
				id="slippage"
				name="slippage"
				className="slippage-input"
				onChange={updateAmount}
				value={view()}
			></input>
			
			<label
				style={{ color: "red" }}
				className="balance-warning"
				hidden={sufficientBalance}
			>
				{"  Insufficient Balance"}
			</label>
			</div>
		</div>
  */
