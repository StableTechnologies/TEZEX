import React, { useEffect, useState } from "react";

import { updateBotStats } from "../../library/util";
import useStyles from "./style";

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
  const showStat = () => {
    const data = [];
    const pairs = Object.keys(stats.max);
    for (const pair of pairs) {
      const assets = pair.split("/");
      data.push(
        <div>
          * {swapPairs[pair][assets[0]].symbol} &hArr;{" "}
          {swapPairs[pair][assets[1]].symbol} Swaps :
          <div className={classes.indented}>
            - Total Liquidity : {stats.total[pair][assets[0]]} {assets[0]}/
            {stats.total[pair][assets[1]]} {assets[1]}
          </div>
        </div>
      );
    }
    return data;
  };
  return (
    <div className={classes.container}>
      <h2>TEZEX STATS</h2>
      {stats === undefined && (
        <div className={classes.stat}>Couldn't Connect to Server</div>
      )}
      {stats !== undefined && (
        <div className={classes.stat}>
          {showStat()}
          <div>* Active Bot Count : {stats.activeBots}</div>
        </div>
      )}
    </div>
  );
};

export default Stat;
