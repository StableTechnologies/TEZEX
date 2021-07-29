import React from 'react';

import error from '../../assets/error.svg'

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
      text1 = {"Swap Hash : " +  shorten(7,7, swap.hashedSecret)}
      copyText = {swap.hashedSecret}
      text2 = "You will able to refund your swap after the swap timeout period ends in 1 hour 30 minutes."
      text3 = "You can try your swap again at any time. Make sure you have a reliable internet connection and remember not to refresh or close the site while the swap is in progress."
   />
  )
}

export default TryAgain;
