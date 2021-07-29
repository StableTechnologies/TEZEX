import React from 'react';
import useStyles from "./style";

import Grid from '@material-ui/core/Grid';
import Box from '@material-ui/core/Box';
import Divider from '@material-ui/core/Divider';
import Typography from '@material-ui/core/Typography';

import Copy from '../copy';


const ExpandWalletView = (props) => {
  const classes = useStyles();
  const {walletType, address, copyText } = props;
  return (
    <div className={classes.container}>
      <Grid container className={classes.ethStyle || classes.tezStyle}>
        <Grid item xs={12}>
          <Typography> Connected To {  walletType || " Galleon"} </Typography>
        </Grid>
        <Divider className={classes.divider}/>
          <Grid  item xs={12}>
            <Box alignContent="center" py={1}>
              <Copy
                text = {address}
                copyText = {copyText}
                tooltip = { "copy address"}
              />
            </Box>
          </Grid>

          {/* <Divider className={classes.divider}/>
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
          </Grid> */}
      </Grid>
    </div>
  )
}

export default ExpandWalletView;