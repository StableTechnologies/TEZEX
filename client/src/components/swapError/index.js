import React from 'react';
import {useStyles} from "./style";

import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";


import complete from '../../assets/complete.gif';
import error from '../../assets/error.svg'

const SwapError = (props) => {
  const classes = useStyles();

  const { open, onClose, onClick } = props;
  return (
    <Dialog onClose={onClose} aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
      <DialogTitle id="simple-dialog-title" onClose={onClose}>
        <span> <img src={error} alt="error_logo" className={classes.img} /> </span>
          Token Swap Did Not Complete!
          {/* <IconButton aria-label="close" onClick={onClose} className={classes.close}>
              <CloseIcon />
            </IconButton> */}
      </DialogTitle>
      <DialogContent >
        <Typography className={classes.p1} >
          You will able to refund your swap after the swap timeout period ends in 1 hour 30 minutes.
        </Typography>

        <Typography className={classes.p2}>
          You can try your swap again at any time. Make sure you have a reliable internet connection
          and remember not to refresh or close the site while the swap is in progress.
        </Typography>

        <Button size="large" className={classes.button + " Element"} onClick={onClick} >Try Again</Button>
      </DialogContent>
    </Dialog>
  )
}

export default SwapError;
