import React, { useEffect, useState } from 'react';

import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import minimize from '../../assets/minimize.svg';
import { tokens } from '../constants';
import useStyles from "./style";

const CurrentSwaps = (props) => {
  const { onClick, ongoingSwaps, swaps, } = props;
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
    0: "Failed",
    1: "Swap Initiated",
    2: "Implementing Swap",
    3: "Validating Transaction",
    4: "Refunded",
  }

  const SwapItem = (data) => {
    // console.log(data)
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
              {" "} &#8594; {" "}
              <span>
                <img src={counterToken.logo} alt="logo" className={classes.img} /> {counterToken.title}
              </span>
            </Typography>
          </div>
          <Button onClick={() => onClick(data)}>
            <img src={minimize} alt="minimize" className={classes.img} />
          </Button>
        </Paper>
        <Typography className={classes.minPad} > {refund && "Swap will timeout in: "} {refund}  </Typography>
        <Grid container alignContent="center" justify="space-between" >
          <Typography className={classes.minPad}> {activeStep && "State: "} {state[data.state]}  </Typography>
          <Typography className={classes.minPad}> Value: {data.value}  </Typography>
        </Grid>
      </div>
    )
  }

  useEffect(() => {
    if (ongoingSwaps.pair) {
      const swapInProgress = ongoingSwaps.pair.split('/');
      const asset = ongoingSwaps.asset;
      tokens.map((x) => {
        if (swapInProgress[0].toLowerCase() === x.title.toLowerCase()) {
          (swapInProgress[0] === asset) ? setViewAsset(x) : setViewCounterAsset(x);
        }

        if (swapInProgress[1].toLowerCase() === x.title.toLowerCase()) {
          (swapInProgress[1] === asset) ? setViewAsset(x) : setViewCounterAsset(x);
        }
      })
    }
  }, [ongoingSwaps])

  return (
    <div className={classes.root}>
      {swaps !== undefined &&
        <>
          <Typography>
            Current swaps in progress...
          </Typography>
          {Object.keys(swaps).map((x) => SwapItem(swaps[x]))}
        </>
      }
    </div>
  )
}

export default CurrentSwaps;