import React from 'react';

import Grid from '@material-ui/core/Grid';
import { Typography } from '@material-ui/core';

import sidelogo from "../../assets/sidelogo.svg";

import useStyles from "./style";


const SideLogo = () => {
  const classes = useStyles();

  return (
    <Grid item className={classes.sidelogocontainer} xs={1}>
    {" "}
    <img className={classes.sidelogo} src={sidelogo} />
  </Grid>
  )
}

export default SideLogo;