import { FC, useState, useEffect } from "react";
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

const classes = {
	/*
	
fontFamily: 'Inter',
fontStyle: 'normal',
fontWeight: '500',
fontSize: '12px',
lineHeight: '15px',
textAlign: 'right',

	*/

	tabInput: {
		"&.MuiButtonBase-root": {
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "12px",
			lineHeight: "15px",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			minHeight: "31px",
			marginRight: "40px", 
			minWidth: "61px",
			zIndex: 5,
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
	},
	tabClasses: {
		"&.MuiButtonBase-root": {
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "12px",
			lineHeight: "15px",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			minHeight: "31px",
			paddingRight: "3px", 
			minWidth: "61px",
			zIndex: 5,
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
	},
	textField: {
		"& .MuiButtonBase-root": {},
		"& .MuiInputAdornment-root": {},

		"& .MuiTypography-root": {
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "12px",
			lineHeight: "15px",
			textAlign: "left",
		},

		"&.MuiFormControl-root": {
			position: "absolute",
			fontFamily: "Inter",

			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			bottom: "45%",
			left: "26%",
			padding: "0px",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "12px",
			lineHeight: "15px",

			// marginTop: spacing(0.5),
			textTransform: "initial",
		},

		"& .MuiInputBase-root": {
			position: "absolute",
			fontFamily: "Inter",

			right: "1%",
			left: "6%",
			padding: "0px",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "12px",
			lineHeight: "15px",
			maxHeight: 10,
			minWidth: 40,
			// marginTop: spacing(0.5),
			textTransform: "initial",
		},
	},
	tabs: {
		"& .MuiTabs-root": {
			minHeight: 10,
		},

		"& .MuiTabs-scroller": {
			position: "relative",

		display: "flex",

		flexDirection: "row",
		left:"20%",
		padding: "4px",

			/*
		display: "flex",
		flexDirection: "row",
		alignItems: "flex-start",
		padding: "4px",
		gap: "16px",
		position: "absolute",
		left: "46.34%",
		right: "3.64%",
		top: "51.37%",
		bottom: "21.92%",
		background: "#FFFFFF",
		border: "1px solid #EDEDED",
		borderRadius: "8px",
			
			*/
		},
		"& .MuiTabs-flexContainer": {
			padding: "1",
			gap: "4px",
			justifyContent: "center",
			position: "absolute",
			left: "20%",
			border: "1px solid #EDEDED",
				borderRadius: "8px",
		},
		"& .MuiTabs-indicator": {
			position: "relative",

			top: "5%",
			padding: "3px", 
			background: "none",
			"&:after": {

			minHeight: "31px",
			minWidth: "61px",
			padding: "", 

				content: '""',
				display: "flex",
				position: "absolute",
				borderRadius: "8px",
				backgroundColor: "selectedHomeTab.main", //'#E3F7FF',//'palette.action.selected' ,
			},
		},
	},
};

export interface ISlippage {
	asset: TokenKind;
	walletInfo: WalletInfo | null;
	setslippage: React.Dispatch<
		React.SetStateAction<BigNumber | number >
	>;
	slippage: BigNumber | number ;
	amountMantissa: BigNumber;
	inverse?: boolean;
	balanceCheck?: boolean;
}

export const Slippage: FC<ISlippage> = (props) => {
	const [selectedId, setSelectedId] = useState("0");
	const [sufficientBalance, setSufficientBalance] = useState(true);
	const net = useNetwork();
	const stringToBigNumber = (value: string) => {

		const num = props.inverse
			? new BigNumber(value).multipliedBy(-1)
			: new BigNumber(value);

		 return BigNumber(num);
	}

	const updateAmount = (value: string) => {
		props.setslippage(stringToBigNumber('3'));
		//props.setSlippage(stringToBigNumber(value));
	};

	const _updateAmount = async (value: string) => {
		const num =  stringToBigNumber(value);
		props.setslippage(num);
		if (props.balanceCheck) {
			if (props.walletInfo && num.gt(0) && !num.isNaN()) {
				setSufficientBalance(
					await hasSufficientBalance(
						addSlippage(
							num,
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


	const [input, setInput] = useState<string>("0.1");

	useEffect(()=>{
              props.setslippage(stringToBigNumber(input).toNumber())
	},[input]);

	interface ISlippageInput {
		disabled?: boolean;
	}
	const SlippageInput = (prop: ISlippageInput) => {

		return (
			<TextField
				autoFocus
				disabled={prop.disabled}
				onChange={(e) =>{setInput(e.target.value)}}
				value={input}
				sx={classes.textField}
				InputProps={{
					disableUnderline: true,
					endAdornment: (
						<InputAdornment position="start">
							%
						</InputAdornment>
					),
				}}
				inputProps={{}}
				size="small"
				variant="standard"
			/>
		);
	};

	interface SlippageTabProps {
		id: string;
		label?: React.ReactNode;
		
		amount?: number;
	}

	function SlippageTab(props: SlippageTabProps, input?: boolean) {
		return (
			<Tab
				label={
					(props.id === 'input') ? (
						<SlippageInput
							disabled={
								selectedId !==
								props.id
							}
						/>
					) : (
						props.label
					)
				}
				href=""
				sx={(props.id === 'input')? classes.tabInput : classes.tabClasses}
				onClick={(
					event: React.MouseEvent<
						HTMLAnchorElement,
						MouseEvent
					>
				) => {
					event.preventDefault();
					setSelectedId(props.id);
				}}
				{...props}
			/>
		);
	}
	const SlippageTabs = () => {
		return (
			<Tabs
				value={value}
				sx={classes.tabs}
				onChange={handleChange}
				aria-label="nav tabs example"
			>
				<SlippageTab
					id="0"
					label="0.5%"
					amount={0.5}
				/>
				<SlippageTab
					id="1"
					label="1%"
					amount={1}
				/>
				<SlippageTab
					id="input"
				/>
			</Tabs>
		);
	};

	// move grid to individual comp swap/add
	return <SlippageTabs />;
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
				<SlippageTab label="Swap" href="/home/swap" />
				<SlippageTab label="Add Liquidity" href="/home/add" />
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
