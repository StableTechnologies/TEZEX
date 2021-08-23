import React from "react";
import {tooltipStyles} from "./style";

import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';


const Tooltip = () => {
  const classes = tooltipStyles();

  return (
    <Grid container>
      <Grid item xs={12} sm={6}></Grid>
      <Grid item xs={12} sm={6} justify="space-between">
        <Paper elevation={2} className={classes.tooltip}>
          <Typography>
            If no response is found to your swap request, you will be able to redeem a refund after this timeout period.
          </Typography>
        </Paper>
      </Grid>
    </Grid>
  );
}

export default Tooltip