import React, { useEffect, useState } from "react";

import useStyles from "./style";

import { Grid, Typography } from "@material-ui/core";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import  arrowRight from '../../assets/arrowRightAlt.svg';

import { updateBotStats } from "../../library/util";
import { tokens } from "../constants";

const Stat = ({ swapPairs }) => {
  const classes = useStyles();
  const [stats, setStats] = useState(undefined);
  const updateStats = async () => {
    const stat = await updateBotStats();
    console.log(stat)
    setStats(stat);
  };
  useEffect(() => {
    updateStats();
    const timer1 = setInterval(() => {
      updateStats();
    }, 60000);
    return () => {
      clearInterval(timer1);
    };
  }, []);

  const currencyPairStat = () => {
    const data = [];
    const pairs = Object.keys(stats.max);

    for (const pair of pairs) {
      const assets = pair.split("/");
      let token = {}
      let counterToken = {}

      tokens.map((x) => {
        if (assets[0].toLowerCase() === x.title.toLowerCase()) { token = x; }
        if (assets[1].toLowerCase() === x.title.toLowerCase()) { counterToken = x; }
      });

      data.push(
        <TableRow>
          <TableCell>
            <Grid item className={classes.currencyPairTop}>
              <img src={token.logo} alt="logo" className={classes.img} /> {token.title}
              {" "} <img src={arrowRight} alt="right arrow" className={classes.imgArrow}/> {" "}
              <img src={counterToken.logo} alt="logo" className={classes.img} /> {counterToken.title}
            </Grid>
            <Grid item className={classes.currencyPairBottom}>
              <img src={counterToken.logo} alt="logo" className={classes.img} /> {counterToken.title}
              {" "} <img src={arrowRight} alt="right arrow" className={classes.imgArrow}/> {" "}
              <img src={token.logo} alt="logo" className={classes.img} /> {token.title}
            </Grid>
          </TableCell>

          <TableCell>
            <Grid item className={classes.currencyPairTop}> {stats.max[pair][assets[0]]} {counterToken.title} </Grid>
            <Grid item className={classes.currencyPairBottom}> {stats.max[pair][assets[1]]} {token.title}</Grid>
          </TableCell>

          <TableCell>
            <Grid item className={classes.currencyPairTop}> {stats.total[pair][assets[1]]} {counterToken.title} </Grid>
            <Grid item className={classes.currencyPairBottom}> {stats.total[pair][assets[0]]} {token.title} </Grid>
          </TableCell>
        </TableRow>
      );
    }
    return data;
  }

  const tokenStat = () => {

    const data = [];
    const e = []
    const pairs = Object.keys(stats.max);
    let assets, token, swapPair;

    pairs.map(pair=> {
      assets = pair.split("/");
      swapPair = pair;
      if(e.indexOf(assets[0]) === -1) { e.push(assets[0]) }
      if(e.indexOf(assets[1]) === -1) { e.push(assets[1]) }
    })
    for (const pair of e) {
      tokens.map(x=>{
        if(pair.toLowerCase()  === x.title.toLowerCase()) {token = x;}
      })

      data.push(
        <TableRow>
          <TableCell> <img src={token.logo} alt="logo" className={classes.img} /> {token.banner} </TableCell>

          <TableCell> {token.title} </TableCell>

          <TableCell> {stats.max[swapPair][assets[0]]} {token.title} </TableCell>

          <TableCell> {stats.total[swapPair][assets[0]]} {token.title} </TableCell>
        </TableRow>
      )
    }
    return data;
  }

  // const showStat = () => {
  //   const data = [];
  //   const pairs = Object.keys(stats.max);
  //   for (const pair of pairs) {
  //     const assets = pair.split("/");
  //     data.push(
  //       <div>
  //         * {swapPairs[pair][assets[0]].symbol} &hArr;{" "}
  //         {swapPairs[pair][assets[1]].symbol} Swaps :
  //         <div className={classes.indented}>
  //           - Total Liquidity : {stats.total[pair][assets[0]]} {assets[0]}/
  //           {stats.total[pair][assets[1]]} {assets[1]}
  //         </div>
  //       </div>
  //     );
  //   }
  //   return data;
  // };
  return (
    <Grid container xs={12} md={8} className={`${classes.root} ${classes.statsCon}`}>
      <Grid item> <Typography variant="h2" >Current Stats </Typography> </Grid>
      {/* {stats === undefined && (
        <Grid item className={classes.stat}>Couldn't Connect to Server</Grid>
      )} */}
      {stats !== undefined && (
        <Grid item xs={12} md={11}>
          <Typography variant="h3"> Currency Pairs </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell> Name </TableCell>
                  <TableCell> Max Swap Size </TableCell>
                  <TableCell> Total Liquidity </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {currencyPairStat()}
              </TableBody>
            </Table>
          </TableContainer>
          <div className={classes.tokenTable}>
            <Typography variant="h3"> Tokens </Typography>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell> Name </TableCell>
                    <TableCell> Symbol </TableCell>
                    <TableCell> Max Swap Size </TableCell>
                    <TableCell> Total Liquidity </TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {tokenStat()}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </Grid>
      )}
      {/* {stats !== undefined && (
        <div className={classes.stat}>
          {showStat()}
          <div>* Active Bot Count : {stats.activeBots}</div>
        </div>
      )} */}
    </Grid>
  );
};

export default Stat;
