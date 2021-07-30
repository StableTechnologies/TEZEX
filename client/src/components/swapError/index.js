import React from 'react';

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from "@material-ui/core/DialogTitle";
import Typography from "@material-ui/core/Typography";
import IconButton from '@material-ui/core/IconButton';
import CloseIcon from '@material-ui/icons/Close';

import error from '../../assets/error.svg'
import { useStyles } from "./style";
import Copy from '../copy';

const SwapError = (props) => {
  const classes = useStyles();

  const { open, onClose, onClick, titleImg, button, title, text1, text2, text3, text4, copyText, expiryTime } = props;
  return (
    <Dialog aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
      <DialogTitle id="simple-dialog-title" onClose={onClose}>
        <span> <img src={titleImg} alt="error_logo" className={classes.img} /> </span>
          {title}
            <IconButton aria-label="close" onClick={onClose} className={classes.close}>
                <CloseIcon />
            </IconButton>
      </DialogTitle>
      <DialogContent >
        <Copy
          className={classes.p1}
          text = {text1}
          copyText = {copyText}
          tooltip = "copy swap hash"
        />

        {expiryTime ?
          <>
              <Typography className={classes.p1} > {text4} </Typography>
              <Button size="large" className={`${classes.button + " Element"} ${classes.disabled + " Element"}`} disabled>{button}</Button>
          </>
            :
            <>
              <Typography className={classes.p1} > {text2} </Typography>
              <Typography className={classes.p2}>  {text3} </Typography>
              <Button size="large" className={classes.button + " Element"} onClick={onClick} > {button} </Button>
            </>
          }
      </DialogContent>
    </Dialog>
  )
}

export default SwapError;
