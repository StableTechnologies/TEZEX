import { FC, useEffect, useState } from "react";

export interface IToggle {
	toggle: boolean;
	setToggle: React.Dispatch<React.SetStateAction<boolean>>;
	children: string 
}

export const Toggle: FC<IToggle> = (props) => {

	const toggle = () => {
		props.setToggle((props.toggle) ? false : true)
	};

	return (
		<div>
			<button onClick={toggle} >{props.children}</button>
		</div>
	);
};
