import { FC } from "react";

import { useNavigate } from "react-router-dom";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";

export interface INav {
	children: string;
}
export const NavApp: FC = () => {
	const navigate = useNavigate();
	return (
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
					</Grid>
				</Grid>
			</Grid>
		</div>
	);
};
