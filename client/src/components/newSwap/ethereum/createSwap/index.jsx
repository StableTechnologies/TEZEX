import { BigNumber } from "bignumber.js";
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
    if (e.target.eth.value === "" || e.target.eth.value === 0) return;
    const minValue = new BigNumber(
      calcSwapReturn(
        new BigNumber(e.target.eth.value).multipliedBy(constants.decimals10_6),
        feeDetails.reward
      )
    ).minus(feeDetails.botFee);
    if (minValue.lte(0)) {
      alert("Minimum expected return in less than zero!");
      return;
    }
    if (
      (feeDetails.stats !== undefined &&
        minValue.gt(feeDetails.stats.maxUSDtz)) ||
      minValue.gt(balance.usdc)
    ) {
      alert("Swap size exceeds current swap limit/balance!");
      return;
    }
    loader(true);
    const res = await genSwap(
      1,
      new BigNumber(e.target.eth.value)
        .multipliedBy(constants.decimals10_6)
        .toString(),
      minValue.toString()
    );
    loader(false);
    if (!res) {
      alert("Error: Swap Couldn't be created");
    } else {
      history.push("/");
    }
  };

  const getMaxValue = (set = false) => {
    let max = new BigNumber(feeDetails.stats.maxUSDtz);
    if (new BigNumber(balance.usdc).lt(feeDetails.stats.maxUSDtz))
      max = new BigNumber(balance.usdc);
    if (set) setInput(max.div(constants.decimals10_6).toString());
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
                new BigNumber(feeDetails.stats.maxUSDtz)
                  .div(constants.decimals10_6)
                  .toString() +
                " USDC"}
          </strong>
          <div className={classes.swapValue}>
            <input
              type="number"
              placeholder="Amount in USDC"
              name="eth"
              step=".000001"
              min="0"
              max={getMaxValue().div(constants.decimals10_6).toString()}
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
          Min Expected Value :{" "}
          {input === 0
            ? 0
            : new BigNumber(
                calcSwapReturn(
                  new BigNumber(input).multipliedBy(constants.decimals10_6),
                  feeDetails.reward
                )
              )
                .minus(feeDetails.botFee)
                .div(constants.decimals10_6)
                .toString()}{" "}
          USDtz
        </p>
        <p className={classes.expectedValue}>
          Max Network Fee :{" "}
          {input === 0
            ? 0
            : new BigNumber(feeDetails.botFee)
                .div(constants.decimals10_6)
                .toString()}{" "}
          USDtz
        </p>
        <p className={classes.expectedValue}>
          Swap Fee :{" "}
          {input === 0
            ? 0
            : new BigNumber(input)
                .minus(
                  new BigNumber(
                    calcSwapReturn(
                      new BigNumber(input).multipliedBy(constants.decimals10_6),
                      feeDetails.reward
                    )
                  ).div(constants.decimals10_6)
                )
                .toFixed(6)}{" "}
          USDtz
        </p>
      </div>
    </div>
  );
};

export default CreateSwap;
