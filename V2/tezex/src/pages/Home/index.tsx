import { FC } from "react";

import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import {NavHome} from '../../components/nav'
import {Swap} from '../../components/Swap'
import { AddLiquidity  } from "../../components/AddLiquidity";
import { RemoveLiquidity  } from "../../components/removeLiquidity";

import Grid2 from '@mui/material/Unstable_Grid2'; // Grid version 2
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from '@mui/material/CardHeader';
import Grid from "@mui/material/Grid";
//import KeyboardArrowDownIcon from '@mui/material/icons/KeyboardArrowDown';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from "@mui/material/Typography";

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
		<Grid2 sx={{ flexDirection: "column", justifyContent: "center"}} container>
<Grid2  sx={{paddingBottom: "32px" ,  paddingTop: "56px"}}>

		           <NavHome /> 	
</Grid2>
<Grid2>

				<Comp />
</Grid2>
</Grid2>
	);
};
