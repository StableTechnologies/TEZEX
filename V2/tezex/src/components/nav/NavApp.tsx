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

const style1 = {
	root: {
		backgroundColor: "red",
	},
	right: {
		justifyContent: "center",
                alignContent: "center"
	},
	nav: {
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
				sx={{}}
				onChange={handleChange}
				aria-label="nav tabs example"
			>
				<NavTab label="Home" href="/home/swap" />
				<NavTab label="Analytics" href="/Analytics" />
				<NavTab
					label="About"
					href="/About"
				/>
			</Tabs>
	);
}
