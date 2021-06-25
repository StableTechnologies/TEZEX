import React from 'react';
import useStyles from "./style";


import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';

import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import Typography from '@material-ui/core/Typography';
import FileCopyOutlinedIcon from '@material-ui/icons/FileCopyOutlined';

import ellipseLogo from '../../assets/ellipseLogo.svg';
import copyIcon from '../../assets/copyIcon.svg';
import exchangeIcon from '../../assets/exchangeIcon.svg';
import disconnectIcon from '../../assets/disconnectIcon.svg';
import { shorten } from '../../util';


const ExpandWalletView = (props) => {
  const classes = useStyles();
  const {walletType, address, close, open, selectedValue, ethStyle, tezStyle} = props;
  return (
    <div className={classes.container}>
      <Grid container className={classes.ethStyle || classes.tezStyle}>
        <Grid item xs={12}>
          <Typography> Connected To {  walletType || " Galleon"} </Typography>
        </Grid>
        {/* <Grid container spacing={3}> */}
          <Grid item xs={8}>
            <Box py={1}>
            <Typography>{address || "tz1ae86gsd...KiRus8Xs"}</Typography>
            </Box>
          </Grid>
          <Grid  item xs={4}>
            <Box alignContent="center" py={1}p x={2} display="flex">
                <img src={copyIcon} alt="copyIcon" />
                <Typography>copy</Typography>
            </Box>
          </Grid>
          {/* <div item xs={12} className={classes.divider}> {""} </div> */}
          <Divider className={classes.divider}/>
          {/* <Grid  item xs={12} className={classes.walletAction}> */}
          <Grid  item xs={6} p={1}>
            <Box alignContent="center" spacing={3} display="flex" className={classes.walletAction} >
                <img src={exchangeIcon} alt="exchangeIcon" />
                <Typography> Change Wallet </Typography>
            </Box>
          </Grid>
          <Grid  item xs={6}>
            <Box alignContent="center" display="flex" className={classes.walletAction} >
                <img src={disconnectIcon} alt="disconnectIcon" />
                <Typography> Disconnect Wallet </Typography>
            </Box>
          </Grid>
          {/* </Grid> */}
        {/* </Grid> */}
      </Grid>

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
    </div>
  )
}

export default ExpandWalletView;