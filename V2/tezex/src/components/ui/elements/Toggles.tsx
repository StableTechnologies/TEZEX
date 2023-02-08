import { FC } from "react";
import Button from "@mui/material/Button";
import swapIcon from "../../../assets/swapIcon.svg";

import Box from "@mui/material/Box";
export interface IToggle {
	toggle: () => void;
}

export const SwapUpDownToggle: FC<IToggle> = (props) => {

	return (
		<Box>
			<Button
				sx={{
					minWidth: "32px",
					minHeight: "32px",
					boxShadow: "0px 4px 20px rgba(181, 181, 181, 0.25)",
					background: "#FFFFFF",
					borderRadius: "8px",
				}}
				onClick={props.toggle}
			>
				<img
					style={{
						width: "19.2px",
						height: "19.2px",
					}}
					src={swapIcon}
					alt="swapIcon"
				/>
			</Button>
		</Box>
	);
};

/*
export const SwapRightLeftToggle: FC<IToggle> = (props) => {
	const toggle = () => {
		props.setToggle(props.toggle ? false : true);
	};

	return (
		<div>
			<button onClick={toggle}>{props.children}</button>
		</div>
	);
};
export const Toggle: FC<IToggle> = (props) => {
	const toggle = () => {
		props.setToggle(props.toggle ? false : true);
	};

	return (
		<div>
			<button onClick={toggle}>{props.children}</button>
		</div>
	);
};
*/
