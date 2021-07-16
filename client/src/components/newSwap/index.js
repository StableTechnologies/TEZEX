import React, { useEffect, useState } from "react";
import { calcSwapReturn, getCounterPair } from "../../library/util";

import BigNumber from "bignumber.js";
import Loader from "../loader";
import { MenuItem } from "@material-ui/core";
import Select from "@material-ui/core/Select";
import { getSwapStat } from "./util";
import { useHistory } from "react-router-dom";
import useStyles from "./style";

const CreateSwap = ({ clients, swapPairs, genSwap }) => {
  const [input, setInput] = useState(0);
  const [pairs, setPairs] = useState([]);
  const [currentSwap, setCurrentSwap] = useState(undefined);
  const [swapStat, setSwapStat] = useState(undefined);
  const [loader, setLoader] = useState("...Loading...");
  const history = useHistory();
  const classes = useStyles();
  const msg = `Max Swap Limit : `;

  useEffect(() => {
    // console.log("here");
    const pairs = Object.keys(swapPairs);
    const assets = pairs[0].split("/");
    setPairs(pairs);
    setCurrentSwap({ pair: pairs[0], asset: assets[0] });
  }, [swapPairs, clients]);

  useEffect(() => {
    setLoader("...Loading...");
    // console.log("in");
    if (currentSwap === undefined) return;

    getSwapStat(clients, swapPairs, currentSwap.pair)
      .then((data) => setSwapStat(data))
      .then(() => setLoader(""));
    const timer = setInterval(async () => {
      await getSwapStat(clients, swapPairs, currentSwap.pair).then((data) =>
        setSwapStat(data)
      );
    }, 60000);
    return () => {
      // console.log("out");
      clearInterval(timer);
    };
  }, [currentSwap]);

  const handleChange = (e) => {
    e.preventDefault();
    const pair = e.target.value.split(" ");
    setCurrentSwap({ pair: pair[0], asset: pair[1] });
  };

  const menu = pairs.flatMap((pair) => {
    const assets = pair.split("/");
    return [
      <MenuItem value={`${pair} ${assets[0]}`}>
        {swapPairs[pair][assets[0]].symbol} &#8614;{" "}
        {swapPairs[pair][assets[1]].symbol}
      </MenuItem>,
      <MenuItem value={`${pair} ${assets[1]}`}>
        {swapPairs[pair][assets[1]].symbol} &#8614;{" "}
        {swapPairs[pair][assets[0]].symbol}
      </MenuItem>,
    ];
  });

  if (loader !== "") return <Loader message={loader} />;
  const assets = currentSwap.pair.split("/");
  if (!Object.prototype.hasOwnProperty.call(swapStat.balances, assets[0]))
    return <Loader message="...Loading..." />;
  console.log(swapStat.botStats);
  if (swapStat.botStats === undefined)
    return <Loader message="...Error Fetching Swap Stats..." />;

  const counterAsset = getCounterPair(currentSwap.pair, currentSwap.asset);
  console.log(currentSwap, swapStat, counterAsset);

  const getMaxValue = (set = false) => {
    let max = swapStat.assetConverter[currentSwap.asset](
      new BigNumber(
        swapStat.botStats.max[currentSwap.pair][counterAsset]
      ).multipliedBy(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
    ); //feeDetails.stats.maxUSDtz);
    if (swapStat.balances[currentSwap.asset].lt(max))
      //feeDetails.stats.maxUSDtz))
      max = swapStat.balances[currentSwap.asset];
    if (set)
      setInput(
        max
          .div(10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals)
          .toFixed(6)
      );
    return max
      .div(10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals)
      .toFixed(6);
  };

  const swapReturn = new BigNumber(
    calcSwapReturn(
      new BigNumber(input).multipliedBy(
        10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
      ),
      swapStat.reward
    )
  );
  const swapFee = swapStat.assetConverter[counterAsset](
    new BigNumber(input)
      .multipliedBy(
        10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
      )
      .minus(swapReturn)
  )
    .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
    .toFixed(6);
  let minExpectedReturn = swapStat.assetConverter[counterAsset](
    swapReturn
  );
  if (swapPairs[currentSwap.pair][currentSwap.asset].network !== "pureTezos")
    minExpectedReturn = swapStat.assetConverter[counterAsset](
      swapReturn
    ).minus(swapStat.networkFees[counterAsset]);

  const generateSwap = async (e) => {
    e.preventDefault();
    const swap = {
      pair: currentSwap.pair,
      asset: currentSwap.asset,
      network: swapPairs[currentSwap.pair][currentSwap.asset].network,
      value: new BigNumber(input)
        .multipliedBy(
          10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
        )
        .toString(),
      minValue: minExpectedReturn.toString(),
    };
    setLoader("...Creating Swap...");
    const res = await genSwap(swap);
    setLoader("");
    if (!res) {
      alert("Error: Swap Couldn't be created");
    } else {
      history.push("/");
    }
  };
  return (
    <div className={classes.newSwap}>
      <Select
        classes={{
          root: classes.dropdown,
          input: classes.dropdown,
          select: classes.dropdown,
          selectMenu: classes.dropdown,
          focused: classes.dropdown,
          colorSecondary: classes.dropdown,
          icon: classes.dropdownIcon,
        }}
        MenuProps={{ classes: { paper: classes.select } }}
        value={`${currentSwap.pair} ${currentSwap.asset}`}
        onChange={handleChange}
      >
        {menu}
      </Select>
      <div className={classes.balances}>
        Your Balance :{" "}
        {swapStat.balances[assets[0]]
          .div(10 ** swapPairs[currentSwap.pair][assets[0]].decimals)
          .toFixed(6)}{" "}
        {assets[0]} /{" "}
        {swapStat.balances[assets[1]]
          .div(10 ** swapPairs[currentSwap.pair][assets[1]].decimals)
          .toFixed(6)}{" "}
        {assets[1]}
      </div>
      <div className={classes.createWrap}>
        <form onSubmit={generateSwap}>
          <strong>
            {msg +
              swapStat.assetConverter[currentSwap.asset](
                new BigNumber(
                  swapStat.botStats.max[currentSwap.pair][counterAsset]
                ).multipliedBy(
                  10 ** swapPairs[currentSwap.pair][counterAsset].decimals
                )
              )
                .div(
                  10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
                )
                .toString() +
              " " +
              swapPairs[currentSwap.pair][currentSwap.asset].symbol}
          </strong>
          <div className={classes.swapValue}>
            <input
              type="number"
              placeholder={`Amount in ${swapPairs[currentSwap.pair][currentSwap.asset].symbol
                }`}
              name="swap"
              step=".000001"
              min="0"
              max={getMaxValue()}
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
            : minExpectedReturn
              .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
              .toFixed(6)}{" "}
          {swapPairs[currentSwap.pair][counterAsset].symbol}
        </p>
        <p className={classes.expectedValue}>
          Swap Fee : {input === 0 ? 0 : swapFee}{" "}
          {swapPairs[currentSwap.pair][counterAsset].symbol}
        </p>
        <p className={classes.expectedValue}>
          Max Network Fee :{" "}
          {swapPairs[currentSwap.pair][counterAsset].network === "pureTezos" ? 0 : (input === 0
            ? 0
            : swapStat.networkFees[counterAsset]
              .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
              .toFixed(6))}{" "}
          {swapPairs[currentSwap.pair][counterAsset].symbol}
        </p>
      </div>
    </div>
  );
};

export default CreateSwap;
