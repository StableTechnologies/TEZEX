import React from 'react';
import clock from '../../assets/clock.svg';

import SwapError from './index';
import { shorten } from "../../util";
import timer from '../convertDate.js';

const RedeemSwap = (props) => {

  const { open, onClose, onClick, swap } = props;

  return (
    <SwapError
      open = {open}
      onClose = {onClose}
      onClick = {onClick}
      swap = {swap}
      titleImg = {clock}
      title = "Token Swap Timed Out"
      button = "Redeem"
      text1 = {"Swap Hash : " +  shorten(7,7, swap.hashedSecret)}
      copyText = {swap.hashedSecret}
      text2 = "A swap response was not found at this time. Please redeem your funds."
      text3 = "You can try your swap again at any time. Check out the stats page..."

      expiryTime = {Math.trunc(Date.now() / 1000) < swap.refundTime}
      text4 = {"You will be able to refund your swap after the swap timeout period ends in " + timer(swap.refundTime) }
     />
  )
}

export default RedeemSwap;
