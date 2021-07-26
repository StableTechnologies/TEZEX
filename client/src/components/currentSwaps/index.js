import React, { useEffect, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import useStyles from "./style";

import minimize from '../../assets/minimize.svg';
import { tokens } from '../constants';


 const CurrentSwaps = (props) => {
  const { onClick, ongoingSwaps, swaps,  } = props;
  const classes = useStyles();

  const [activeStep, setActiveStep] = useState(0);
  const [refundTime, setRefundTime] = useState('');

  const [viewAsset, setViewAsset] = useState([]);
  const [viewCounterAsset, setViewCounterAsset] = useState([]);

  useEffect(() => {

    if(swaps) {
      Object.keys(swaps).map((x) => {
        setRefundTime(new Date(swaps[x].refundTime * 1000).toLocaleString())
        setActiveStep(swaps[x].state)
      });
    }

  }, [refundTime, activeStep])


  const state = {
    0: "Swap Initiated",
    1: "Implementing Swap",
    2: "Validating Transaction",
  }

  useEffect(() => {
    if(ongoingSwaps.pair){
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
      <Typography>
        {
          swaps && "Current swaps in progress... "
        }
      </Typography>
      <Paper elevation={2}>
        <div className={classes.CurrentSwaps}>
          <Typography>
            <span>
              <img src={viewAsset.logo} alt="logo" className={classes.img} /> {viewAsset.title}
            </span>
            {" "} &#8594; {" "}
            <span>
              <img src={viewCounterAsset.logo} alt="logo" className={classes.img} /> {viewCounterAsset.title}
            </span>
          </Typography>
        </div>
        <Button onClick={onClick}>
          <img src={minimize} alt="minimize" className={ classes.img } />
        </Button>
      </Paper>
      <Typography> {refundTime &&  "Swap will timeout in: "} { refundTime }  </Typography>
      <Typography> {activeStep &&  "State: "} { state[activeStep] }  </Typography>
    </div>
  )
}

export default CurrentSwaps;