import React, { useEffect, useState } from "react";
import { constants, updateBotStats } from "../../library/common/util";
import useStyles from "./style";
const MiniStat = () => {
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
      {stats === undefined && (
        <div className={classes.stat}>Couldn't Connect to Server</div>
      )}
      {stats !== undefined && (
        <div className={classes.stat}>
          <div>
            <p>
              Total Liquidity :{" "}
              {(stats.totalUSDtz / constants.decimals10_6).toFixed(6)} USDtz /{" "}
              {(stats.totalUSDC / constants.decimals10_6).toFixed(6)} USDC
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniStat;
