import { FC } from "react";
import { AppTitle } from "../elements/Headings";
import { Wallet } from "../../wallet/Wallet";
import { NavApp } from "../../nav";
import Grid from "@mui/material/Grid";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
//import KeyboardArrowDownIcon from '@mui/material/icons/KeyboardArrowDown';
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import logo from "../../../assets/TezexLogo.svg";

const style = {
	root: {
		backgroundColor: "red",
	},
	right: {
		justifyContent: "center",
		alignContent: "center",
	},
	header: {
		fontSize: "1.5vw",
		display:"flex",

					alignItems: "center",
					justifyContent: "flex-start",
		minWidth: "1440px",
		minHeight: "72px",
		left: "0px",
		top: "0px",
		background: "#FFFFFF",
		boxShadow: "4px 4px 4px rgba(204, 204, 204, 0.25)",
	},
};

export const Header: FC = () => {
	return (
		<Grid2 container sx={style.header}>
			<Grid2
				xs={2}
				sm={2}
				md={2}
				sx={{
					alignContent: "center",
					justifyContent: "flex-start",
				}}
			>
				<img src={logo} alt="Logo" />
			</Grid2>

			<Grid2
				xs={1}
				sm={3.3}
				md={5}
				sx={{
					alignContent: "center",
					justifyContent: "flex-start",
				}}
			>
				<NavApp />
			</Grid2>
			<Grid2 xs={2} sm={2} md={2}  sx={{ 

		display:"flex",
			
					justifyContent: "flex-start",
			}} >
				<Wallet variant={"header"}/>
			</Grid2>
		</Grid2>
	);
};
export {};
