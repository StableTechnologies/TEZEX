import React, { useRef, useState } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";
import "./App.css";
import About from "./components/about";
import Header from "./components/header";
import Home from "./components/home";
import Loader from "./components/loader";
import Swap from "./components/newSwap";
import Ethereum from "./components/newSwap/ethereum/index.jsx";
import Tezos from "./components/newSwap/tezos";
import Setup from "./components/setup";
import requestEth from "./library/common/request-eth";
import requestTezos from "./library/common/request-tezos";
import respondEth from "./library/common/respond-eth";
import respondTezos from "./library/common/respond-tezos";
import { setEthAccount, setTezAccount } from "./util";

const App = () => {
  const [ethStore, ethSetup] = useState(undefined);
  const [tezStore, tezSetup] = useState(undefined);
  const [swaps, updateSwaps] = useState(undefined);
  const [balance, balUpdate] = useState(undefined);
  const [, updateState] = React.useState();

  const swapRef = useRef();
  swapRef.current = swaps;
  const ethRef = useRef();
  ethRef.current = ethStore;
  const tezRef = useRef();
  tezRef.current = tezStore;

  const forceUpdate = React.useCallback(() => updateState({}), []);

  const initialize = async () => {
    try {
      const eth = await setEthAccount();
      const tez = await setTezAccount();
      const ethSwaps = await eth.getUserSwaps(eth.account);
      const tezSwaps = await tez.getUserSwaps(tez.account);
      let swap = {};
      ethSwaps.forEach((swp) => {
        if (swp.initiator === eth.account)
          swap[swp.hashedSecret] = {
            type: "eth",
            hashedSecret: swp.hashedSecret,
            value: swp.value + " USDC",
            refundTime: swp.refundTimestamp,
            state: 0,
          };
      });
      tezSwaps.forEach((swp) => {
        if (swp.initiator === tez.account)
          swap[swp.hashedSecret] = {
            type: "tez",
            hashedSecret: swp.hashedSecret,
            value: swp.value + " USDTz",
            refundTime: swp.refundTimestamp,
            state: 0,
          };
      });
      if (Object.keys(swap).length > 0) updateSwaps(swap);
      ethSetup(eth);
      tezSetup(tez);
    } catch (e) {
      console.log("error", e);
      alert(e.message);
    }
  };

  const update = (hash, state) => {
    let newSwap = swapRef.current;
    if (newSwap[hash] !== undefined) {
      newSwap[hash].state = state;
      updateSwaps(newSwap);
      forceUpdate();
    } else console.log("missing hash update request");
  };

  const genSwap = async (type, value, req_swap = undefined) => {
    let swap = {};
    if (type === 2) {
      if (req_swap === undefined) {
        swap = await requestTezos(
          value,
          ethRef.current,
          tezRef.current,
          update
        );
      } else {
        swap = await respondTezos(
          value,
          ethRef.current,
          tezRef.current,
          req_swap,
          update
        );
      }
    } else if (type === 1) {
      if (req_swap === undefined) {
        swap = await requestEth(value, ethRef.current, tezRef.current, update);
      } else {
        swap = await respondEth(
          value,
          ethRef.current,
          tezRef.current,
          req_swap,
          update
        );
      }
    }
    if (swap === undefined) return false;
    let newSwaps = swaps;
    if (newSwaps === undefined) {
      newSwaps = {};
    }
    newSwaps[swap.hashedSecret] = swap;
    updateSwaps(newSwaps);
    return true;
  };

  if (ethStore === undefined || tezStore === undefined)
    return (
      <div className="App">
        <Setup init={initialize} />
      </div>
    );

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <div className="App">
        <Header ethStore={ethStore} tezStore={tezStore} balUpdate={balUpdate} />
        {balance === undefined && <Loader message="Loading Account" />}
        {balance !== undefined && (
          <Switch>
            <Route exact path="/">
              <Home
                swaps={swaps}
                ethStore={ethRef.current}
                tezStore={tezRef.current}
                update={update}
              />
            </Route>
            <Route exact path="/create/eth">
              <Ethereum genSwap={genSwap} tezStore={tezRef.current} />
            </Route>
            <Route exact path="/create/xtz">
              <Tezos genSwap={genSwap} ethStore={ethRef.current} />
            </Route>
            <Route exact path="/create">
              <Swap />
            </Route>
            <Route exact path="/about">
              <About />
            </Route>
          </Switch>
        )}
      </div>
    </Router>
  );
};

export default App;
