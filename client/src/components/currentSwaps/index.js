import React, { useEffect, useState } from 'react';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import useStyles from "./style";

import minimize from '../../assets/minimize.svg';
import { tokens } from '../constants';


 const CurrentSwaps = (props) => {
  const { onClick, ongoingSwaps } = props;
  const classes = useStyles();

  const [viewAsset, setViewAsset] = useState([]);
  const [viewCounterAsset, setViewCounterAsset] = useState([]);

  useEffect(() => {
    if(ongoingSwaps.pair){
      const swapInProgress = ongoingSwaps.pair.split('/');
      tokens.map((x) => {
        if (swapInProgress[0].toLowerCase() === x.title.toLowerCase()) {
          setViewAsset(x);
        }
        if (swapInProgress[1].toLowerCase() === x.title.toLowerCase()) {
          setViewCounterAsset(x);
        }
      })
    }
  }, [ongoingSwaps])

  return (
    <div className={classes.root}>
      <Typography> Current swaps in progress... </Typography>
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
      <Typography> Swap will timeout in: 1 hour 56 minutes </Typography>
    </div>
  )
}

export default CurrentSwaps;