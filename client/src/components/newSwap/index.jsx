import React from "react";
import { useHistory } from "react-router-dom";
import useStyles from "./style";

const Swap = () => {
  const history = useHistory();
  const classes = useStyles();
  return (
    <div className={classes.select}>
      <button
        className={classes.selectButton}
        onClick={() => history.push("/create/xtz")}
      >
        USDtz &#8614; USDC
      </button>
      <button
        className={classes.selectButton}
        onClick={() => history.push("/create/eth")}
      >
        USDC &#8614; USDtz
      </button>
    </div>
  );
};

export default Swap;
