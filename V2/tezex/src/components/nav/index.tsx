import { FC } from "react";

import { useNavigate } from "react-router-dom";
import BigNumber from "bignumber.js";
import Grid from '@mui/material/Grid';
import Button from '@mui/material';

import useStyles from "./style";
export interface INav {
  children: string
}
export const Nav: FC = (props) => {

    const navigate = useNavigate();
  return (
            <div className="nav">
                <Grid container>
                    <Grid data-aos="flip-left" container item xs={6} sm={3} md={2} alignContent = "center" >
                    </Grid>
                    <Grid container item alignContent = "center"  xs={6} sm={5} md={6} lg={6} >
                        <Grid item md={2} lg={4}></Grid>
                        <Grid container item alignContent = "center"  xs={12} md={9} lg={8}>
				<Grid item lg={3} className="btn Element">
                            <button className="button" onClick={() => navigate("/")}>Home</button>
                          </Grid>
                          <Grid item lg={3} className="btn Element">
                            <button className="button" onClick={() => navigate("/about")}>About</button>
                          </Grid>
                          <Grid item lg={3} className="btn Element">
                            <button className="button" onClick={() => navigate("/stats")}> Stats </button>
                          </Grid>
                        </Grid>
                    </Grid>
                    </Grid>
	  </div>
  );
};

