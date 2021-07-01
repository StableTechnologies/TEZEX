import React from 'react';
import Paper from '@material-ui/core/Paper';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';

import useStyles from "./style";

import minimize from '../../assets/minimize.svg';


 const CurrentSwaps = (props) => {
  const { pair, asset, onClick, } = props;
  const classes = useStyles();

  return (
    <div className={classes.root}>
      <Typography> Current swaps in progress... </Typography>
      <Paper elevation={2}>
        <div className={classes.CurrentSwaps}>
          <Typography>
            <span>
              <img src={asset.logo} alt="logo" className={classes.img} /> {asset.title}
            </span>
            {" "} &#8594; {" "}
            <span>
              <img src={pair.logo} alt="logo" className={classes.img} /> {pair.title}
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