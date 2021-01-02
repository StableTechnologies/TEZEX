import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { calcSwapReturn } from "../../../../library/common/util";
import useStyles from "../../style";

const CreateSwap = ({ className, genSwap, loader, reward }) => {
  const [input, setInput] = useState(0);
  const history = useHistory();
  const classes = useStyles();

  const generateSwap = async (e) => {
    e.preventDefault();
    if (e.target.tez.value === "" || e.target.tez.value === 0) return;
    loader(true);
    try {
      const minValue = calcSwapReturn(e.target.tez.value, reward);
      const res = await genSwap(2, e.target.tez.value, minValue);
      loader(false);
      console.log(res);
      if (!res) {
        alert("Error: Swap Couldn't be created");
      } else {
        history.push("/");
      }
    } catch (err) {
      console.log(err);
      loader(false);
    }
  };
  return (
    <div className={className}>
      <div className={classes.createWrap}>
        <form onSubmit={generateSwap}>
          <input
            type="number"
            placeholder="Amount in USDTz"
            name="tez"
            step=".0001"
            min="0"
            onInput={(e) => setInput(e.target.value || 0)}
            className={classes.valueInput}
          />
          <input className={classes.create} type="submit" value="CREATE" />
        </form>
        <p className={classes.expectedValue}>
          Min Expected USDC Value : {calcSwapReturn(input, reward)} USDC
        </p>
      </div>
    </div>
  );
};

export default CreateSwap;
