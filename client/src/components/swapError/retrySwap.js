import React from 'react';

import error from '../../assets/error.svg'
import { useStyles } from "./style";

import { shorten } from "../../util";

import SwapError from './index';


const TryAgain = (props) => {

  const { open, onClose, onClick, swap } = props;
  return (
    <SwapError
      open = {open}
      onClose = {onClose}
      onClick = {onClick}
      titleImg = {error}
      title = "Token Swap Did Not Complete!"
      button = "Try Again"
      text1 = { "Swap Hash : " + shorten(7,7, swap.hashedSecret)}
      text2 = "You will able to refund your swap after the swap timeout period ends in 1 hour 30 minutes."
      text3 = "You can try your swap again at any time. Make sure you have a reliable internet connection and remember not to refresh or close the site while the swap is in progress."
   />
    // <Dialog onClose={onClose} aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
    //   <DialogTitle id="simple-dialog-title" onClose={onClose}>
    //     <span> <img src={error} alt="error_logo" className={classes.img} /> </span>
    //     Token Swap Did Not Complete!
    //     {/* <IconButton aria-label="close" onClick={onClose} className={classes.close}>
    //           <CloseIcon />
    //         </IconButton> */}
    //   </DialogTitle>
    //   <DialogContent >
    //     <Typography className={classes.p1} >
    //       Swap Hash : {swap.hashedSecret}
    //     </Typography>
    //     <Typography className={classes.p1} >
    //       You will able to refund your swap after the swap timeout period ends in 1 hour 30 minutes.
    //     </Typography>

    //     <Typography className={classes.p2}>
    //       You can try your swap again at any time. Make sure you have a reliable internet connection
    //       and remember not to refresh or close the site while the swap is in progress.
    //     </Typography>

    //     <Button size="large" className={classes.button + " Element"} onClick={onClick} >Try Again</Button>
    //   </DialogContent>
    // </Dialog>
  )
}

export default TryAgain;
