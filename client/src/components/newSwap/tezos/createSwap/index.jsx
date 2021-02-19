import React, { useState } from "react";
import { useHistory } from "react-router-dom";
import { calcSwapReturn, constants } from "../../../../library/common/util";
import useStyles from "../../style";

const CreateSwap = ({ className, genSwap, loader, feeDetails, balance }) => {
  const [input, setInput] = useState(0);
  const history = useHistory();
  const classes = useStyles();
  const msg = `Max Swap Limit : `;
  const generateSwap = async (e) => {
    e.preventDefault();
    if (e.target.tez.value === "" || e.target.tez.value === 0) return;
    try {
      const minValue =
        calcSwapReturn(
          e.target.tez.value * constants.decimals10_6,
          feeDetails.reward
        ) - feeDetails.botFee;
      if (minValue <= 0) {
        alert("Minimum expected return in less than zero!");
        return;
      }
      if (
        (feeDetails.stats !== undefined &&
          minValue > feeDetails.stats.maxUSDC) ||
        minValue > balance.usdtz
      ) {
        alert("Swap size exceeds current swap limit/balance!");
        return;
      }
      loader(true);
      const res = await genSwap(
        2,
        e.target.tez.value * constants.decimals10_6,
        minValue
      );
      loader(false);
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
  const getMaxValue = (set = false) => {
    let max = feeDetails.stats.maxUSDC;
    if (balance.usdtz < feeDetails.stats.maxUSDC) max = balance.usdtz;
    if (set) setInput((max / constants.decimals10_6).toString());
    return max;
  };

  return (
    <div className={className}>
      <div className={classes.createWrap}>
        <form onSubmit={generateSwap}>
          <strong>
            {feeDetails.stats === undefined
              ? msg + "Couldn't connect to server"
              : msg +
                (feeDetails.stats.maxUSDC / constants.decimals10_6).toString() +
                " USDtz"}
          </strong>
          <div className={classes.swapValue}>
            <input
              type="number"
              placeholder="Amount in USDtz"
              name="tez"
              step=".000001"
              min="0"
              max={getMaxValue() / constants.decimals10_6}
              onInput={(e) => setInput(e.target.value || 0)}
              className={classes.valueInput}
              value={input === 0 ? "" : input}
            />
            <div
              className={classes.maxButton}
              onClick={() => {
                getMaxValue(true);
              }}
            >
              max
            </div>
          </div>
          <input className={classes.create} type="submit" value="CREATE" />
        </form>
        <p className={classes.expectedValue}>
          Min Expected USDC Value :{" "}
          {input === 0
            ? 0
            : (calcSwapReturn(
                input * constants.decimals10_6,
                feeDetails.reward
              ) -
                feeDetails.botFee) /
              constants.decimals10_6}{" "}
          USDC
        </p>
        <p className={classes.expectedValue}>
          Max Network Fee :{" "}
          {input === 0 ? 0 : feeDetails.botFee / constants.decimals10_6} USDC
        </p>
        <p className={classes.expectedValue}>
          Swap Fee :{" "}
          {input === 0
            ? 0
            : (
                input -
                calcSwapReturn(
                  input * constants.decimals10_6,
                  feeDetails.reward
                ) /
                  constants.decimals10_6
              ).toFixed(6)}{" "}
          USDC
        </p>
      </div>
    </div>
  );
};

export default CreateSwap;
