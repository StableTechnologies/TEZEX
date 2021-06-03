import React from "react";
import useStyles from "./style";
const Notice = () => {
  const classes = useStyles();
  return (
    <div className={classes.container}>
      <p>
        <h2>currently not accepting new swaps</h2>
        we are facing some downtime will be back soon,
        if you have created new swaps you can refund them after expiry.
      </p>
    </div>
  );
};

export default Notice;
