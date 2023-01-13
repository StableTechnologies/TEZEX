import { FC } from "react";
import { AppTitle } from "../elements/Headings";
import { Wallet } from "../../wallet/Wallet";
import { NavApp } from "../../nav";
import Grid from "@mui/material/Grid";
import logo from "../../../assets/TezexLogo.svg";

const style = {
	root: {
		backgroundColor: "red",
	},
	right: {
		justifyContent: "center",
                alignContent: "center"
	},
	header: {
		display: "flex",
		fontSize: "1.5vw",
		justifyContent: "center",
		
	},
};

export const Header: FC = () => {
	return (
			<div flex-direction="row" style={style.header}>
				<Grid
					data-aos="flip-left"
					container
					item
					xs={6}
					sm={3}
					md={2}
					alignContent="center"
				>
					<img src={logo} alt="Logo" />
				</Grid>

				<NavApp />

                    <Grid container item xs={12} sm={4} md={4} lg={4} style={style.right}>

				<Wallet />
		</Grid>	
	</div>
	);
};
export {};
