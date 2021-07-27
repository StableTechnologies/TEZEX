import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from "@material-ui/core/DialogTitle";
import React from 'react';
import Typography from "@material-ui/core/Typography";
import complete from '../../assets/complete.gif';
import error from '../../assets/error.svg'
import { useStyles } from "./style";

import SwapError from './index';
import { shorten } from "../../util";

const RefundSwap = (props) => {

  const { open, onClose, onClick, swap } = props;

  return (
    <SwapError
      open = {open}
      onClose = {onClose}
      onClick = {onClick}
      titleImg = {error}
      title = "Token Swap Timed Out"
      button = "Refund"
      text1 = { "Swap Hash : " + shorten(7,7, swap.hashedSecret)}
      text2 = "A swap response was not found at this time. Please redeem your funds."
      text3 = "You can try your swap again at any time. Check out the stats page..."
     />
  )
}

export default RefundSwap;
