import React from 'react';
import Grid from '@material-ui/core/Grid';
import { Typography } from '@material-ui/core';

const Footer = () => {
  return (
    <Grid container justify = "center" xs={12}>
      <Grid item >
        <Typography>&#169; {new Date().getFullYear()} Tezos Stable Technologies, Ltd.</Typography>
      </Grid>
    </Grid>
  )
}

export default Footer;