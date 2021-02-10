import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { constants } from "../../../../library/common/util";
import { shorten } from "../../../../util";
import Loader from "../../../loader";
import useStyles from "../../style";
import CreateSwap from "../createSwap";

const GetSwap = ({ genSwap, ethStore, tezStore }) => {
  const [swaps, setSwaps] = useState([]);
  const [feeDetails, setFee] = useState({});
  const [loader, setLoader] = useState(true);
  const [fullLoader, setFullLoader] = useState(false);

  const history = useHistory();
  const classes = useStyles();
  const filterSwaps = async () => {
    try {
      const swps = await ethStore.getWaitingSwaps(4200);
      console.log(swps);
      setSwaps(swps);
      setLoader(false);
    } catch (err) {
      console.error("Error getting swaps: ", err);
    }
  };
  const updateReward = async () => {
    const data = await Promise.all([
      tezStore.getFees(),
      tezStore.getPrice("ETH-USD"),
      tezStore.getPrice("XTZ-USD"),
      tezStore.getReward(),
      ethStore.web3.eth.getGasPrice(),
    ]);
    const reward = data[3];
    const usdtzFeeData = data[0]["USDTZ"];
    const usdcFeeData = data[0]["USDC"];
    const ethereumGasPrice = parseFloat(
      ethStore.web3.utils.fromWei(data[4], "ether")
    );
    const botFee =
      Math.ceil(
        (usdcFeeData["initiateWait"] + usdcFeeData["addCounterParty"]) *
          ethereumGasPrice *
          data[1] +
          (usdtzFeeData["redeem"] * data[2]) / constants.decimals10_6
      ) * constants.usdcFeePad;
    const txFee = {
      eth: (usdcFeeData["redeem"] * ethereumGasPrice).toFixed(6),
      tez:
        (usdtzFeeData["initiateWait"] + usdtzFeeData["addCounterParty"]) /
        constants.decimals10_6,
    };
    setFee({
      reward,
      botFee,
      txFee,
    });
  };
  const SwapItem = (data) => {
    return (
      <div
        onClick={() => {
          generateSwap(data.value, data);
        }}
        key={data.hashedSecret}
        className={classes.swap}
      >
        <p>Hash : {shorten(15, 15, data.hashedSecret)}</p>
        <p>USDC Value : {data.value}</p>
        <p>USDTz to Pay : {data.value}</p>
      </div>
    );
  };

  const generateSwap = async (value, data) => {
    setFullLoader(true);
    const res = await genSwap(1, value, value, data);
    setFullLoader(false);
    if (!res) {
      alert("Error: Swap Couldn't be created");
    } else {
      history.push("/");
    }
  };
  useEffect(() => {
    updateReward();
    // filterSwaps();
    // const timer = setInterval(() => {
    //   filterSwaps();
    // }, 600000);
    const timer1 = setInterval(() => {
      updateReward();
    }, 60000);
    return () => {
      // clearInterval(timer);
      clearInterval(timer1);
    };
  }, []);
  let data = "No Swaps Found. Create One!";
  if (swaps.length > 0) data = swaps.map((swp) => SwapItem(swp));
  if (fullLoader) return <Loader message="..Creating Your Swap.." />;
  return (
    <div className={classes.swapScreen}>
      <div className={classes.container}>
        <h3 className={classes.msg}>Create New Swap</h3>
        <CreateSwap
          className={classes.newSwap}
          genSwap={genSwap}
          loader={setFullLoader}
          feeDetails={feeDetails}
        />
      </div>
    </div>
  );
};

export default GetSwap;
