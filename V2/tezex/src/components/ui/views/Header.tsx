import { FC } from "react";
import { AppTitle } from "../elements/Headings";
import { Wallet } from "../../wallet/Wallet";
import { NavApp } from "../../nav";
import Grid from "@mui/material/Grid";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Box from "@mui/material/Box";
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
		width: "100%",
		minHeight: "5vw",
		left: "0px",
		top: "0px",
		background: "#FFFFFF",
		boxShadow: "4px 4px 4px rgba(204, 204, 204, 0.25)",
	},
};

export const Header: FC = () => {
	return (
		<Box sx={style.header}>
			<Box
			>
				<img style={{
					maxWidth: "11.35vw",
				}}src={logo} alt="Logo" />
			</Box>

			<Box
				sx={{
					alignContent: "center",
				}}
			>
				<NavApp />
			</Box>
			<Box  sx={{ 

				position: "relative",
				left: "51vw",
				justifyContent:"flexend",
		display:"flex",
			
			}} >
				<Wallet variant={"header"}/>
			</Box>
		</Box>
	);
};
export {};
