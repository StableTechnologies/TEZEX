import React from 'react';
import error from '../../assets/error.svg' //clock here

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
      text1 = { "Swap Hash : "}
      copyText = { shorten(7,7, swap.hashedSecret)}
      text2 = "A swap response was not found at this time. Please redeem your funds."
      text3 = "You can try your swap again at any time. Check out the stats page..."
     />
  )
}

export default RefundSwap;
