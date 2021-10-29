import { Grid, Typography } from "@material-ui/core";
import React, { useEffect, useState } from "react";

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import arrowRight from '../../assets/arrowRightAlt.svg';
import infoIcon from '../../assets/infoIcon.svg'
import { tokens } from "../constants";
import { updateBotStats } from "../../library/util";
import useStyles from "./style";

const Stat = ({ swapPairs }) => {
  const classes = useStyles();
  const [stats, setStats] = useState(undefined);
  const maxSwapTooltip = "Max swap size is the most that can be traded in a single swap.";
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
              <span><img src={token.logo} alt="logo" className={classes.img} /></span> {token.title}
              {" "} <span><img src={arrowRight} alt="right arrow" className={classes.imgArrow} /></span> {" "}
              <span><img src={counterToken.logo} alt="logo" className={classes.img} /></span> {counterToken.title}
            </Grid>
            <Grid item className={classes.currencyPairBottom}>
              <span><img src={counterToken.logo} alt="logo" className={classes.img} /></span> {counterToken.title}
              {" "} <span><img src={arrowRight} alt="right arrow" className={classes.imgArrow} /></span>{" "}
              <span><img src={token.logo} alt="logo" className={classes.img} /></span> {token.title}
            </Grid>
          </TableCell>
          <TableCell>
            <Grid item className={classes.currencyPairTop}> {stats.max[pair][assets[1]]} {counterToken.title} </Grid>
            <Grid item className={classes.currencyPairBottom}> {stats.max[pair][assets[0]]} {token.title}</Grid>
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

  return (
    <Grid container xs={12} md={8} className={`${classes.root} ${classes.statsCon}`}>
      <Grid item> <Typography variant="h2" >Current Stats </Typography> </Grid>
      {stats === undefined && (
        <Grid item>Couldn't Connect to Server</Grid>
      )}
      {stats !== undefined && (
        <Grid item xs={12} md={11}>
          <Typography variant="h3"> Currency Pairs </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell> Name </TableCell>
                  <TableCell>
                    Max Swap Size
                    <span><img className={classes.infoImg} src={infoIcon} alt="infoIcon" /></span>
                  </TableCell>
                  <TableCell> Total Liquidity </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currencyPairStat()}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      )}
    </Grid>
  );
};

export default Stat;
