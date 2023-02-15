import { FC, useState } from "react";
import { redirect, Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

export interface INav {
	children: string;
}

const classes = {
	root: {
		backgroundColor: "red",
	},
	right: {
		justifyContent: "center",
		alignContent: "center",
	},
	nav: {
		"&.MuiButton-root.Mui-disabled": {
			color: "#999999",
		},

		"& .MuiButtonBase-root": {

			"&.Mui-selected": {
				color: "#000000",
			},
			fontFamily: "Inter",
			fontStyle: "normal",
			fontWeight: "500",
			fontSize: "1.11vw",
			lineHeight: "1.34vw",
			display: "inline-flex",
			justifyContent: "center",
			textAlign: "center",
			//minHeight: "16",
			//marginRight: "40px",
			minWidth: "3.7vw",
			maxWidth: "7.7vw",
			// marginTop: spacing(0.5),
                       padding: "0px 4vw ",
			color: "#999999",
			background: "white",
			textTransform: "initial",
		},

		padding: 0,
		//idth: "12.7vw",
		display: "flex",
		fontSize: "1.5vw",
		justifyContent: "center",
	},
};

interface NavTabProps {
	label: string;
	href: string;
}

function NavTab(props: NavTabProps) {
	const navigate = useNavigate();
	return (
		<Tab
			sx={{}}
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
export const NavApp: FC = () => {
	const navigate = useNavigate();

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
			sx={classes.nav}
			onChange={handleChange}
			aria-label="nav tabs "
			TabIndicatorProps={{
				style: { display: "none" },
			}}
		>
			<NavTab label="Home" href="/home/swap" />
			<NavTab label="Analytics" href="/Analytics" />
			<NavTab label="About" href="/About" />
		</Tabs>
	);
};
