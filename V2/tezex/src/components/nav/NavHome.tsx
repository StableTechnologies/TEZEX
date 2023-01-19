import { FC, useState } from "react";

import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
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
	    backgroundColor:  '#E3F7FF',//'palette.action.selected' ,
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

	const handleChange = (
		event: React.SyntheticEvent,
		newValue: number
	) => {
		setValue(newValue);
	};
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
/*

		<div className="nav">
			<Grid container>
				<Grid
					data-aos="flip-left"
					container
					item
					xs={6}
					sm={3}
					md={2}
					alignContent="center"
				></Grid>
				<Grid
					container
					item
					alignContent="center"
					xs={6}
					sm={5}
					md={6}
					lg={6}
				>
					<Grid item md={2} lg={4}></Grid>
					<Grid
						container
						item
						alignContent="center"
						xs={12}
						md={9}
						lg={8}
					>
						<Grid
							item
							lg={3}
							className="btn Element"
						>
							<Button
								className="Button"
								onClick={() =>
									navigate(
									"/home/swap"
									)
								}
							>
								Swap
							</Button>
						</Grid>
						<Grid
							item
							lg={3}
							className="btn Element"
						>
							<Button
								className="Button"
								onClick={() =>
									navigate(
									"/home/add"
									)
								}
							>
								Add Liquidity
							</Button>
						</Grid>
						<Grid
							item
							lg={3}
							className="btn Element"
						>
							<Button
								className="Button"
								onClick={() =>
									navigate(
									"/home/remove"
									)
								}
							>
								Remove Liquidity
							</Button>
						</Grid>
					</Grid>
				</Grid>
			</Grid>
		</div>
*/
