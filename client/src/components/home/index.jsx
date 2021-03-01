import React from "react";
import { useHistory } from "react-router-dom";
import useStyles from "./style";

const Home = ({ swaps, clients, swapPairs, update }) => {
  const history = useHistory();
  const classes = useStyles();
  const refundHandler = async (swap) => {
    try {
      if (Math.trunc(Date.now() / 1000) < swap.refundTime) {
        alert("Wait till expiry!");
        return;
      }
      await clients[swap.network].refund(
        swapPairs[swap.pair][swap.asset].swapContract,
        swap.hashedSecret
      );
      update(swap.hashedSecret, 4);
    } catch (err) {
      console.error(err);
      alert("error in refunding, check if the refund time has come");
    }
  };
  const SwapItem = (data) => {
    const exp = new Date(data.refundTime * 1000);
    const state = {
      0: "Error in Swap",
      1: "Swap Initiated",
      2: "Swap Response Found",
      3: "Completed",
      4: "Refunded",
    };
    return (
      <div className={classes.swap} key={data.hashedSecret}>
        <p>Hash : {data.hashedSecret}</p>
        <p>Value : {data.value}</p>
        {data.minReturn !== "nil" && (
          <p>Min Expected Return : {data.minReturn}</p>
        )}
        {data.exact !== "nil" && <p>Exact Return : {data.exact}</p>}
        <p>Expiry Time : {exp.toLocaleString()}</p>
        {data.state === 0 && (
          <div className={classes.error}>
            <p>{state[data.state]}</p>
            <button
              className={classes.errorBtn}
              onClick={() => refundHandler(data)}
            >
              refund!
            </button>
          </div>
        )}
        {data.state !== 0 && <p>State : {state[data.state]}</p>}
      </div>
    );
  };
  let data = (
    <div className={classes.noSwap}>
      <p>
        No Swaps Created Yet! Learn more about <b>TEZEX</b> and how to create
        your own Atomic Swap
      </p>
      <button className={classes.button} onClick={() => history.push("/about")}>
        Learn More
      </button>
      <p>or create a Swap now!</p>
      <button className={classes.button} onClick={() => history.push("/swap")}>
        Start New Swap
      </button>
    </div>
  );
  if (swaps !== undefined)
    data = Object.keys(swaps).map((key) => SwapItem(swaps[key]));
  return (
    <div>
      {/* <MiniStat /> */}
      <div className={classes.swaps}>
        <h3>Your Swaps</h3>
        {data}
      </div>
    </div>
  );
};

export default Home;
