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
    <Grid container justify="center" className={ `${classes.root} ${classes.container}` }>
      <Grid item xs={9} justify="center">
        <Typography> About </Typography>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography>
          TezEx (Tezos Exchange) is a next-generation decentralized exchange and decentralized cross-chain bridge
          built on Tezos blockchain. On TezEx there are no pools, no custody, and no price-slippage. TezEx is powered by
          a network of decentralized atomic swaps, a ‘peer-to-peer’ process without any central intermediaries.
        </Typography>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> Get in touch </Typography>
        <Grid >
          <img src="" alt="" />
        </Grid>
        <Grid >
          <img src="" alt="" />
        </Grid>
        <Grid >
          <img src="" alt="" />
        </Grid>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> How TezEx works </Typography>
        <Grid>
          <img src="" alt="" />
        </Grid>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> Changemakers </Typography>
        <Typography>
          Liquidity Providers on TezEx are called ‘Changemakers’. Changemakers do not deposit their liquidity into pools or to a central custodian.
          Rather, they keep their liquidity in their own custody. Just like for traders, funds only move out of a changemaker’s wallet when it’s time to swap.
        </Typography>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> Satellites </Typography>
        <Typography>
          A changemaker’s setup is called a ‘satellite’. A changemaker’s satellite includes the capital set aside for trading
          as well as the swap-bots that automate the trading process for them. Changemakers configure their bots to accept desired currencies in exchange for offered currencies.
          Over time, more customizable features will come to changemaker satellite bots including price tolerances and limit orders.
        </Typography>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> TezEx vs. an AMM (like Uniswap, Quipuswap, PlentyDeFi: Swap, etc.)  </Typography>
        <Typography>
          Whereas AMMs (Automated Market Makers) prices for trades are set by an algorithm that reflects previous price action and is subject to slippage,
          TezEx prices are set by Harbinger oracle. AMM pricing algorithms are a seesaw, moving the price up and down as a consequence of the previous trade.
          If in an AMM, traders are suddenly trading a lot of their A for B, so they could get more B, then the algorithm reacts by increasing the price of B relative to A for the next trader.
          If the reverse were to occur and traders started selling B for A so that they could get more A, then the algorithm would respond by increasing the price of A relative to B for the next trader.
        </Typography>
        <Typography>
          Whereas liquidity on an AMM is deposited to a smart contract, TezEx liquidity is non-custodial and only transacts in lock-step with the trader (i.e. the other party)
          making a swap at the same time. Non-custodial liquidity providing is a hallmark feature of TezEx.
        </Typography>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> Prices </Typography>
        <Typography>
          Fully-convertible ‘like-assets’ (e.g. USDC-USDtz, USDT-USDtz, ETH-ETHtz, BTC-BTCtz, WBTC-tzBTC) are hardcoded in price 1-1.
        </Typography>
        <Typography>
          Price oracles are used for incongruently priced tokens of a pair (e.g. XTZ-USDtz, ETHtz-USDtz).
        </Typography>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> Refunds </Typography>
        <Typography>
          If a swap process is interrupted and can not move on to the redemption stage, the smart-contract is released back to the account from which it came.
          As per the smart-contract, no account can become the recipient of these funds other than the original public key (account; wallet address).
        </Typography>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> Changemaker rewards </Typography>
        <Typography>
          Changemakers earn rewards on any swap involving their liquidity. The main reward is the percentage fee which can vary from
          15 basis points (0.15%) to 45 basis points (0.45%), and in rare cases in which the cost of inventory is high 100 basis points (1.00%).
        </Typography>
        <Typography>
          A cross-chain transaction can be gas-intensive, but nonetheless the changemaker must front the gas costs for those transactions.
          However, the gas cost is deducted from the trader’s final settlement and given to the changemaker; effectively,
          the trader pays the gas costs for the changemaker. Gas costs are calculated by taking an oracle reading of the gas price for the last block,
          and adding a cushion to account for block-to-block gas fluctuations.
        </Typography>
      </Grid>
      <Grid item xs={9} text-align="left">
        <Typography> Audits </Typography>
        <Typography> TEZEX has been audited by Apriorit. View the report here. [link to pdf] </Typography>
      </Grid>
    </Grid>
   );
};

export default About;
