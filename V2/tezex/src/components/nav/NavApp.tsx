import { FC } from "react";

import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
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

export const NavApp: FC = () => {
	const navigate = useNavigate();
	return (
		<div flex-direction="row" style={style1.nav}>
						<Grid
							item
							lg={3}
							className="btn Element"
						>
							<Button
								className="Button"
								onClick={() =>
									navigate(
										"/Home"
									)
								}
							>
								Home
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
										"/Analytics"
									)
								}
							>
								Analytics
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
										"/About"
									)
								}
							>
								About
							</Button>
					</Grid>
			</div>
	);
};
