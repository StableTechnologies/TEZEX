import React, { useEffect, useState } from "react";
import { constants, updateBotStats } from "../../library/common/util";
import useStyles from "./style";
const Stat = () => {
  const classes = useStyles();
  const [stats, setStats] = useState(undefined);
  const updateStats = async () => {
    const stat = await updateBotStats();
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
  return (
    <div className={classes.container}>
      <h2>TEZEX STATS</h2>
      {stats === undefined && (
        <div className={classes.stat}>Couldn't Connect to Server</div>
      )}
      {stats !== undefined && (
        <div className={classes.stat}>
          <div>
            <p>Max USDtz Swap Size</p>
            <p>Max USDC Swap Size</p>
            <p>Total USDtz Liquidity</p>
            <p>Total USDC Liquidity</p>
            <p>Live Liquidity Providers </p>
          </div>
          <div>
            <p>: {stats.maxUSDC / constants.decimals10_6} usdtz</p>
            <p>: {stats.maxUSDtz / constants.decimals10_6} usdc</p>
            <p>: {stats.totalUSDtz / constants.decimals10_6} usdtz</p>
            <p>: {stats.totalUSDC / constants.decimals10_6} usdc</p>
            <p>: {stats.activeBots}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stat;
