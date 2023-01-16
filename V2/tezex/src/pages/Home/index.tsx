import { FC } from "react";

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import {NavHome} from '../../components/nav'
import { AddLiquidity  } from "../addLiquidity";
import { RemoveLiquidity  } from "../removeLiquidity";
import { Swap } from "../swap";

export const Home: FC = () => {
	return (
		<div>
			<div>
		           <NavHome /> 	
			</div>
			<div>
			</div>
		</div>
	);
};
