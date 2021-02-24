import React, { useEffect, useState } from "react";
import {
  convertBigIntToFloat,
  updateBotStats,
} from "../../library/common/util";
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
              Total Liquidity : {convertBigIntToFloat(stats.totalUSDtz, 6, 6)}{" "}
              USDtz / {convertBigIntToFloat(stats.totalUSDC, 6, 6)} USDC
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MiniStat;
