import React from 'react';
import {useStyles} from "./style";

import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from '@material-ui/core/DialogContent';
import Typography from "@material-ui/core/Typography";

import complete from '../../assets/complete.gif';

const SwapStatus = (props) => {
  const classes = useStyles();

  const { open, onClose, swaps } = props;
  console.log(swaps, 'swaps@swapStatus');
  return (
    <Dialog onClose={onClose} aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
      <DialogTitle id="simple-dialog-title" onClose={onClose}>
          Congrats!
          <Typography> Your Token Swap is Complete </Typography>
          {/* <IconButton aria-label="close" onClick={onClose} className={classes.close}>
              <CloseIcon />
            </IconButton> */}
      </DialogTitle>
      <DialogContent >
        <div>
          <img src={complete} alt="complete_gif" className={classes.completed} />
        </div>
        <div>
          <Typography> You can now view your updated token balances. </Typography>
          <Typography> Operation Hash: 0xc739...c3df </Typography>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SwapStatus;
