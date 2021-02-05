import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { calcSwapReturn } from "../../../../library/common/util";
import useStyles from "../../style";

const CreateSwap = ({ className, genSwap, loader, rewardInBIPS }) => {
  const [input, setInput] = useState(0);
  const history = useHistory();
  const classes = useStyles();

  const generateSwap = async (e) => {
    e.preventDefault();
    if (e.target.eth.value === "" || e.target.eth.value === 0) return;
    loader(true);
    const minValue = calcSwapReturn(e.target.eth.value * 1000000, rewardInBIPS);
    const res = await genSwap(1, e.target.eth.value * 1000000, minValue);
    loader(false);
    if (!res) {
      alert("Error: Swap Couldn't be created");
    } else {
      history.push("/");
    }
  };

  return (
    <div className={className}>
      <div className={classes.createWrap}>
        <form onSubmit={generateSwap}>
          <input
            type="number"
            placeholder="Amount in USDC"
            name="eth"
            step=".000001"
            min="0"
            onInput={(e) => setInput(e.target.value || 0)}
            className={classes.valueInput}
          />
          <input className={classes.create} type="submit" value="CREATE" />
        </form>
        <p className={classes.expectedValue}>
          Min Expected Value :{" "}
          {calcSwapReturn(input * 1000000, rewardInBIPS) / 1000000} USDTz
        </p>
      </div>
    </div>
  );
};

export default CreateSwap;
