import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import useStyles from "../../style";

const CreateSwap = ({ className, genSwap, loader, balance }) => {
  const [input, setInput] = useState(0);
  const history = useHistory();
  const classes = useStyles();

  const generateSwap = async (e) => {
    e.preventDefault();
    if (e.target.tez.value === "" || e.target.tez.value === 0) return;
    loader(true);
    const res = await genSwap(2, e.target.tez.value);
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
            placeholder="Amount in USDTz"
            name="tez"
            step=".0001"
            min="0"
            onInput={(e) => setInput(e.target.value)}
            className={classes.valueInput}
          />
          <input className={classes.create} type="submit" value="CREATE" />
        </form>
        <p className={classes.expectedValue}>
          Expected USDC Value : {input / 1} USDC
        </p>
      </div>
    </div>
  );
};

export default CreateSwap;
