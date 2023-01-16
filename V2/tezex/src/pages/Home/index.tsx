import { FC } from "react";

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import {NavHome} from '../../components/nav'
import {Swap} from '../../components/Swap'
import { AddLiquidity  } from "../addLiquidity";
import { RemoveLiquidity  } from "../removeLiquidity";

type HomePaths = 'swap' | 'add' | 'remove'

export interface IHome {
	path: HomePaths
}
export const Home: FC<IHome> = (props) => {
	const c = props.path;

	const Comp = (() =>{ switch(props.path) {
		case 'add': 
			return AddLiquidity;
		case 'remove': 
			return RemoveLiquidity;
		case 'swap': 
			return Swap;
	}})();

	return (
		<div>
			<div>
		           <NavHome /> 	
			</div>
			<div>
				<Comp />
			</div>
		</div>
	);
};
