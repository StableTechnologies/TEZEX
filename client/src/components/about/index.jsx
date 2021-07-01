import React from "react";
import useStyles from "./style";
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import Grid from "@material-ui/core/Grid";

import sidelogo from "../../assets/sidelogo.svg";


import { Typography } from "@material-ui/core";

const About = () => {
  const classes = useStyles();
  return (
    <div className={classes.root}>
      {/* <Grid item className = {classes.sidelogoconainer} xs={1}>
        {" "}
          <img className = {classes.sidelogo} src={sidelogo} />
      </Grid> */}
      <Typography data-aos="flip-up" variant="h1" > About Tezex </Typography>
      <div className={classes.container}>
        <div data-aos="fade-right" className={classes.txtCon}>
          <Typography variant="h4" >What are Atomic Swaps?</Typography>
          <Typography> Atomic swaps are automated, self-enforcing crypto-currency exchange contracts
            that allow crypto-currencies to be traded peer-to-peer without the need for a trusted third party.
          </Typography>
        </div>

        <div data-aos="zoom-out-up" className={classes.txtCon}>
          <Typography variant="h4">Why TEZEX?</Typography>
          <Typography>
            The goal of atomic swaps was to remove any need for centralized 3rd parties,
            but most exchanges that provide "Decentralized" Atomic Swaps have some form of centralized backend service
            which is being used for either order book maintenance, order matching or both.
          </Typography>
          <Typography>
            TEZEX provides complete Decentralized Atomic Swaps, it is not dependent on any centralized third-party service.
          </Typography>
          <Typography>
            All stages of a swap are performed by the client application(this website), hence it is mandatory
            for the client to be active throughout the swap. If the app is disconnected or closed before a swap is
            completed or refunded the data will be lost and your swap assets will not be recoverable.
          </Typography>
        </div>

        <div data-aos="fade-left" className={classes.txtCon}>
          <Typography variant="h4"> How to Perform a Swap? </Typography>
          <Typography>
            Currently, TEZEX provides cross chain atomic swaps between Ethereum and Tezos, to start a swap follow these steps :
          </Typography>
          <List>
              <ListItem>1. Visit the New Swap option from the navigation.</ListItem>
              <ListItem>2. Select which crypto-currency you want to swap(USDC&#8594;USDtz or USDtz&#8594;USDC).</ListItem>
              <ListItem>3. In the following screen you can create an new swap by entering the amount you want to exchange.</ListItem>
              <ListItem>4. Once a swap is generated you can see the Swap state in the Home page.</ListItem>
          </List>
        </div>

        <div data-aos="fade-up" className={classes.txtCon}>
          <Typography variant="h4"> The swap can can be in the following states : </Typography>
          <List>
            <ListItem> 1. Swap Initiated : Swap Request initiated, waiting for response Swaps. </ListItem>
            <ListItem> 2. Swap Response Found : Swap response has been found and can proceed to completion. </ListItem>
            <ListItem> 3. Completed : The Swap was successfully completed.</ListItem>
            <ListItem> 4. Refunded : There was no Response for the Swap, it expired and the funds have been returned.</ListItem>
          </List>
        </div>
      </div>
    </div>
   );
};

export default About;
