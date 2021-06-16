import React from 'react';
import useStyles from "./style";


import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';

import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';

import ellipseLogo from '../../assets/ellipseLogo.svg';
import { shorten } from '../../util';


const ExpandWalletView = (props) => {
  const classes = useStyles();
  const {walletType, address, close, open, selectedValue, ethStyle, tezStyle} = props;
  return (
    <>
        <div className={classes.ethStyle || classes.tezStyle}>
      <Dialog aria-labelledby="simple-dialog-title" open={open}  onClose={close} square="true">
          <DialogTitle id="simple-dialog-title">
          <Typography> Connected To{ walletType || "Galleon"} </Typography>
          </DialogTitle>

          <DialogContent className={classes.dialogContent}>
            <Typography>{address || "tz1ae86gsd...KiRus8Xs"}</Typography>
            {/* <Typography>{(shorten(6, 6, address))}</Typography> */}
            <Grid container item alignContent="center">
              <FileCopyOutlinedIcon item px={2}/>
              copy
            </Grid>
            {/* <div>
              <FileCopyOutlinedIcon /> copy
              <Typography> Copy </Typography>
            </div> */}
          </DialogContent>
      </Dialog>
        </div>

      {/* <Card  open={open}>
        <CardHeader>
          Connected To{ walletType || "Galleon"}
        </CardHeader>

        <CardContent>
          <Typography>{"tz1ae86gsd...KiRus8Xs" || address}</Typography>
          <div>
            <FileCopyOutlinedIcon />
            <Typography> Copy </Typography>
          </div>
        </CardContent>

      </Card> */}
    </>
  )
}

export default ExpandWalletView;