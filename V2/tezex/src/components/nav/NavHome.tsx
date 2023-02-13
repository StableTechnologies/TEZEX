import { FC, useState, useEffect } from "react";

import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import {useSession} from "../../hooks/session";

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
const tabClasses = {
	'&.MuiButtonBase-root': {

    minHeight: 44,
    minWidth: 96,
    zIndex: 2,
    // marginTop: spacing(0.5),
    color: 'palette.text.primary',
    textTransform: 'initial'
  },
  wrapper: {
    // zIndex: 2,
    // marginTop: spacing(0.5),
    color: 'palette.text.primary',
    textTransform: 'initial'
  }
}

const classes = {
  '.MuiTabs-flexContainer': {

    justifyContent: "space-between",
    minWidth: 440,
    border: '1px solid #EDEDED',
    borderRadius: 4,
    display: 'inline-flex',
    position: 'relative',
  },
	'.MuiTabs-indicator': {
    top: 0,
    bottom: '12%',
    right: 3,
    height: 'auto',
    background: 'none',
    '&:after': {
      content: '""',
      display: 'block',
      position: 'absolute',
      top: '10%',
      left: 4,
      right: 4,
      bottom: '10%',
      borderRadius: 3,
	    backgroundColor: 'selectedHomeTab.main'//'#E3F7FF',//'palette.action.selected' ,
    }
  }
}

interface NavTabProps {
	label: string;
	href: string;
}

function NavTab(props: NavTabProps) {
	const navigate = useNavigate();
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
				navigate(props.href);
			}}
			{...props}
		/>
	);
}

export interface INavHome {
	children: string;
}
export const NavHome: FC = () => {
	const [value, setValue] = useState(0);
        const sessionInfo = useSession()
	const handleChange = (
		event: React.SyntheticEvent,
		newValue: number
	) => {
		setValue(newValue);
	};
	useEffect(() => {
		switch(sessionInfo.activeComponent){
			case TransactingComponent.SWAP :
			setValue(0);	
			break;
			case TransactingComponent.ADD_LIQUIDITY :
			setValue(1);	
			break;
			case TransactingComponent.REMOVE_LIQUIDITY :
			setValue(2);	
			break;
		}
	},[sessionInfo])
	
	return (
		<Tabs
			value={value}
			sx={classes}
			onChange={handleChange}
			aria-label="nav tabs example"
		>
			<NavTab label="Swap" href="/home/swap" />
			<NavTab label="Add Liquidity" href="/home/add" />
			<NavTab
				label="Remove Liquidity"
				href="/home/remove"
			/>
		</Tabs>
	);
};
