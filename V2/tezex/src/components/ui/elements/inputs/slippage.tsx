import {
	memo,
	MemoExoticComponent,
	FC,
	useCallback,
	useState,
	useEffect,
} from "react";
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

import Button from "@mui/material/Button";
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
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "80%",
			lineHeight: "1.56vh",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			minHeight: "3.03vh",
			//marginRight: "40px",
			minWidth: "4.26vw",
			zIndex: 1,
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
		"&.MuiButton-root.Mui-disabled": {
			"&:after": {
				zindex: 0,
				//minHeight: "3.26vh",
				//marginRight: "40px",
				//minWidth: "4.26vw",
				// padding: "",
				content: '"e"',
				display: "flex",
				position: "absolute",
				top: 0,
				left: 4,
				right: 4,
				bottom: 0,
				//position: "absolute",

				borderRadius: "8px",
				backgroundColor: "transparent", //"selectedHomeTab.main", //'#E3F7FF',//'palette.action.selected' ,
			},
		},
		"&.MuiButtonBase-root": {
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "80%",
			lineHeight: "1.56vh",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			minHeight: "3.03vh",
			//marginRight: "40px",
			minWidth: "4.26vw",
			zIndex: 1,
			// marginTop: spacing(0.5),
			color: "palette.text.primary",
			textTransform: "initial",

			"&:after": {
				//minHeight: "3.26vh",
				//marginRight: "40px",
				//minWidth: "4.26vw",
				// padding: "",
				content: '"e"',
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				position: "absolute",
				top: 0,
				left: 4,
				right: 4,
				bottom: 0,
				//position: "absolute",

				borderRadius: "8px",
				backgroundColor: "selectedHomeTab.main", //'#E3F7FF',//'palette.action.selected' ,
			},
		},
		wrapper: {
			// zIndex: 2,
			// marginTop: spacing(0.5),
			color: "palette.text.primary",
			textTransform: "initial",
		},
	},
	textField: {
		"& .MuiButtonBase-root": {
			zIndex: 3,
		},
		"& .MuiInputAdornment-root": {},

		"& .MuiTypography-root": {
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",
			textAlign: "left",
		},

		"&.MuiFormControl-root": {
			position: "absolute",
			fontFamily: "Inter",

			zIndex: -1,
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			//bottom: "45%",
			//	left: "26%",
			padding: "1px",
			fontStyle: "normal",
			fontWeight: "500",
			//fontSize: "12px",
			//lineHeight: "15px",

			fontSize: "1.17vh",
			lineHeight: "1.56vh",
			minHeight: "3.03vh",
			//marginRight: "40px",
			minWidth: "4.26vw",
			// marginTop: spacing(0.5),
			textTransform: "initial",
			// marginTop: spacing(0.5),
		},

		"&.MuiInputBase-root": {
			position: "absolute",
			fontFamily: "Inter",

			padding: "0px",
			fontSize: "1.17vh",
			lineHeight: "1.56vh",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			minHeight: "3.03vh",
			//marginRight: "40px",
			minWidth: "4.26vw",
			// marginTop: spacing(0.5),
			textTransform: "initial",
		},
	},
	tabs: {
		"& .MuiTabs-root": {
			//			minHeight: 10,
		},

		"& .MuiTabs-scroller": {
			position: "relative",

			display: "flex",

			flexDirection: "row",
			//			left: "20%",
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
			//gap: "4px",

			alignItems: "center",
			justifyContent: "center",
			position: "absolute",
			border: "1px solid #EDEDED",
			borderRadius: "8px",
		},
		"& .MuiTabs-indicator": {
			position: "relative",

			top: "5%",
			padding: "3px",
			background: "none",
			"&:after": {
				minHeight: "3.26vh",
				//marginRight: "40px",
				minWidth: "4.26vw",
				padding: "",

				content: '""',
				display: "flex",
				justifyContent: "center",
				//position: "absolute",

				borderRadius: "8px",
				backgroundColor: "selectedHomeTab.main", //'#E3F7FF',//'palette.action.selected' ,
			},
		},
	},
};

export interface ISlippage {
	asset: TokenKind;
	value: BigNumber | number;
	onChange: (value: string) => void;
	inverse?: boolean;
}

const SlippageInput: FC<ISlippage> = (props) => {
	const [selectedId, setSelectedId] = useState("0");
	//const [slippage, setSlippage] = useState("0.0");
	const net = useNetwork();

	const updateAmount = (value: string) => {
		//		props.setslippage(stringToBigNumber("3"));
		//props.setSlippage(stringToBigNumber(value));
	};

	const [value, setValue] = useState(0);

	const handleChange = (
		event: React.SyntheticEvent,
		newValue: number
	) => {
		setValue(newValue);
	};

	const [input, setInput] = useState<string>("0.1");

	useEffect(() => {
		/*
		const stringToNumber = (value: string) => {
			const num = props.inverse
				? new BigNumber(value).multipliedBy(-1)
				: new BigNumber(value);
		
			return BigNumber(num).toNumber();
		};
		*/
		props.onChange(input);
	}, [input, props]);

	interface ISlippageInput {
		disabled?: boolean;
	}
	const SlippageInput = (prop: ISlippageInput) => {
		const classes  =   {
		"& .MuiButtonBase-root": {
			zIndex: 3,
		},
			"& .MuiInputAdornment-root": {

				//			paddingTop: "1vw",

			paddingRight: ".5vw",
			},

		"& .MuiTypography-root": {
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",

			fontSize: "80%",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			minHeight: "3.03vh",
		},

		"& .MuiFormControl-root": {
			
			display: "inline-flex",

				alignItems: "center",
			justifyContent: "center",
		},

		"& .MuiInputBase-root": {
			paddingTop: ".5vw",
			paddingLeft: "1vw",
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "80%",
			lineHeight: "1.56vh",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			minHeight: "3.03vh",
			//marginRight: "40px",
			minWidth: "4.26vw",
			zIndex: 1,
			// marginTop: spacing(0.5),
			color: "palette.text.primary",
			textTransform: "initial",
		}
		};
		return (
			<TextField
				autoFocus
				disabled={prop.disabled}
				onChange={useCallback(
					(
						e: React.ChangeEvent<HTMLInputElement>
					) => {
						e.preventDefault();
						setInput(e.target.value);
					},
					[]
				)}
				value={input}
				sx={classes}
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

		amount: number;
	}

	function SlippageTab(props: SlippageTabProps, input?: boolean) {

	const classes =  {
		"&.MuiButton-root.Mui-disabled": {

			backgroundColor: "transparent", //'#E3F7FF',//'palette.action.selected' ,
			"&:after": {
				zindex: 0,
				//minHeight: "3.26vh",
				//marginRight: "40px",
				//minWidth: "4.26vw",
				// padding: "",
				display: "flex",
				position: "absolute",
				top: 0,
				left: 4,
				right: 4,
				bottom: 0,
				//position: "absolute",

				borderRadius: "8px",
				backgroundColor: "transparent", //"selectedHomeTab.main", //'#E3F7FF',//'palette.action.selected' ,
			},
		},
		"&.MuiButtonBase-root": {
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "80%",
			lineHeight: "1.56vh",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			minHeight: "3.03vh",
			//marginRight: "40px",
			minWidth: "4.26vw",
			zIndex: 1,
			// marginTop: spacing(0.5),

			backgroundColor: "selectedHomeTab.main", //'#E3F7FF',//'palette.action.selected' ,
			color: "palette.text.primary",
			textTransform: "initial",

			"&:after": {
				//minHeight: "3.26vh",
				//marginRight: "40px",
				//minWidth: "4.26vw",
				// padding: "",
				display: "flex",

				alignItems: "center",
				justifyContent: "center",
				position: "absolute",
				top: 0,
				left: 4,
				right: 4,
				bottom: 0,
				//position: "absolute",

				borderRadius: "8px",
				backgroundColor: "selectedHomeTab.main", //'#E3F7FF',//'palette.action.selected' ,
			},
		},
		wrapper: {
			// zIndex: 2,
			// marginTop: spacing(0.5),
			color: "palette.text.primary",
			textTransform: "initial",
		},
	};


		const ButtonOrInput = () =>{

			if(!(props.id==="input")){


	return (<Button
				disabled={selectedId!==props.id}
				href=""
				sx={
					classes
				}
				onClick={(
					event: React.MouseEvent<
						HTMLAnchorElement,
						MouseEvent
					>
				) => {
					event.preventDefault();
					setSelectedId(props.id);
					setInput(props.amount.toString());
				}}
				{...props}
			>
					{props.amount.toString()}
				</Button>);

			}else{
				return (<SlippageInput disabled={selectedId!==props.id} />);

			}
		}

		return (
			<Box
				onClick={(
					event

				) => {
					event.preventDefault();
					setSelectedId(props.id);
					setInput(props.amount.toString());
				}}
			>
                        <ButtonOrInput />
			</Box>
		);
	}
	const SlippageTabs = () => {
		return (
			<Box sx={{
				display: "inline-flex",
                                position: "relative",
				width:"100%",
				alignItems: "center",
				justifyContent: "flex-start",
				minHeight: "3.8vh",
				//marginRight: "40px",
				maxWidth: "15vw",
			       paddingRight: "0px",
border: "1px solid #EDEDED",
			}}> 
				<SlippageTab id="0" label="0.5%" amount={0.5} />
			<SlippageTab id="1" label="1%" amount={1} />
			<SlippageTab id="input" amount={0} />
			</Box>
		);
	};

	// move grid to individual comp swap/add
	return <SlippageTabs />;
};

export const Slippage = memo(SlippageInput);

/*
			<Tabs
				value={value}
				sx={classes.tabs}
				onChange={handleChange}
				aria-label="nav tabs example"
			>
				<SlippageTab id="0" label="0.5%" amount={0.5} />
				<SlippageTab id="1" label="1%" amount={1} />
				<SlippageTab id="input" amount={0}/>
			</Tabs>
			*/
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
