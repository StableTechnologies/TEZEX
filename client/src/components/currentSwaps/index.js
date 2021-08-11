import React, { useEffect, useState } from 'react';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import maximize from '../../assets/maximize.svg';
import  arrowRight from '../../assets/arrowRight.svg';
import { tokens } from '../constants';
import useStyles from "./style";

const CurrentSwaps = (props) => {
  const { onClick, swaps, } = props;
  const classes = useStyles();

  const [activeStep, setActiveStep] = useState();
  const [refundTime, setRefundTime] = useState('');

  const [viewAsset, setViewAsset] = useState([]);
  const [viewCounterAsset, setViewCounterAsset] = useState([]);

  useEffect(() => {

    if (swaps) {
      Object.keys(swaps).map((x) => {
        setRefundTime(new Date(swaps[x].refundTime * 1000).toLocaleString())
        setActiveStep(swaps[x].state)
      });
    }

  }, [refundTime, activeStep])


  const state = {
    0: "Swap Failed, Refund!",
    1: "Swap Initiated",
    2: "Implementing Swap",
    3: "Swap Completed",
    4: "Refunded",
  }

  const SwapItem = (data) => {
    const refund = new Date(data.refundTime * 1000).toLocaleString()
    const swapInProgress = data.pair.split('/');
    const asset = data.asset;
    let token = {}
    let counterToken = {}
    tokens.map((x) => {
      if (swapInProgress[0].toLowerCase() === x.title.toLowerCase()) {
        if (swapInProgress[0] === asset) token = x; else counterToken = x;
      }

      if (swapInProgress[1].toLowerCase() === x.title.toLowerCase()) {
        if (swapInProgress[1] === asset) token = x; else counterToken = x;
      }
    });
    return (
      <div className={classes.container}>
        <Paper elevation={2}>
          <div className={classes.CurrentSwaps}>
            <Typography>
              <span>
                <img src={token.logo} alt="logo" className={classes.img} /> {token.title}
              </span>
              {" "} <img src={arrowRight} alt="right arrow" className={classes.img}/> {" "}
              <span>
                <img src={counterToken.logo} alt="logo" className={classes.img} /> {counterToken.title}
              </span>
            </Typography>
          </div>
          <Button onClick={() => onClick(data)}>
            <img src={maximize} alt="maximize" className={classes.maximize} />
          </Button>
        </Paper>
        <Typography className={classes.minPad} > {refund && "Swap Timeout: "} {refund}  </Typography>
        <Grid container alignContent="center" justify="space-between" >
          {/* <Typography className={classes.minPad}> {activeStep && "State: "} {state[data.state]}  </Typography> */}
          <Typography className={classes.minPad}> {state[data.state]}  </Typography>
          <Typography className={classes.minPad}> {data.value}  </Typography>
        </Grid>
      </div>
    )
  }

  return (
    <div className={classes.root}>
      {(swaps !== undefined && Object.keys(swaps).length > 0) &&
        <>
          <Typography>
            {/* Current swaps in progress... */}
            Swap Status
          </Typography>
          {Object.keys(swaps).map((x) => SwapItem(swaps[x]))}
        </>
      }
    </div>
  )
}

export default CurrentSwaps;