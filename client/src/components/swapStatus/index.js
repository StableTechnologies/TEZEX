import Dialog from "@material-ui/core/Dialog";
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from "@material-ui/core/DialogTitle";
import React from 'react';
import Typography from "@material-ui/core/Typography";
import complete from '../../assets/complete.gif';
import { useStyles } from "./style";

import { shorten } from "../../util";
import Copy from "../copy";

import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';


const SwapStatus = (props) => {
  const classes = useStyles();

  const { open, onClose, swap } = props;
  return (
    <Dialog aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
      <DialogTitle id="simple-dialog-title" onClose={onClose}>
        Congrats!
        <Typography> Your Token Swap is Complete </Typography>
          <IconButton aria-label="close" onClick={onClose} className={classes.close}>
            <CloseIcon />
          </IconButton>
      </DialogTitle>
      <DialogContent >
        <div>
          <img src={complete} alt="complete_gif" className={classes.completed} />
        </div>
        <div>
          <Typography> You can now view your updated token balances. </Typography>
          <Copy
            text = {"Swap Hash : " +  shorten(7,7, swap.hashedSecret)}
            copyText = {swap.hashedSecret}
            tooltip = { "copy swap hash"}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SwapStatus;
