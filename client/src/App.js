import "./App.css";

import React, { useEffect, useRef, useState } from "react";
import { Route, BrowserRouter as Router, Switch } from "react-router-dom";
import { getOldSwaps, setupClient } from "./util";

import About from "./components/about";
import { BigNumber } from "bignumber.js";
import CreateSwap from "./components/newSwap";
import Header from "./components/header";
import Home from "./components/home";
import Loader from "./components/loader";
import Notice from "./components/notice";
import Setup from "./components/setup";
import Stat from "./components/stats";
import { getCounterPair } from "./library/util";
import requestPureSwap from "./library/request-pure-swap";
import requestSwap from "./library/request-swap";

const App = () => {
  const [clients, setClients] = useState(undefined);
  const [swapPairs, setSwapPairs] = useState(undefined);
  const [swaps, updateSwaps] = useState(undefined);
  const [balance, balUpdate] = useState(undefined);
  const [, updateState] = React.useState();

  const swapRef = useRef();
  swapRef.current = swaps;
  const clientRef = useRef();
  clientRef.current = clients;
  const swapPairsRef = useRef();
  swapPairsRef.current = swapPairs;

  const forceUpdate = React.useCallback(() => updateState({}), []);

  useEffect(() => {
    window.addEventListener("beforeunload", alertUser);
    return () => {
      window.removeEventListener("beforeunload", alertUser);
    };
  }, []);
  const alertUser = (e) => {
    e.preventDefault();
    e.returnValue = "";
  };

  const initialize = async () => {
    try {
      const { swapPairs, clients } = await setupClient();
      let swap = await getOldSwaps(clients, swapPairs);
      if (Object.keys(swap).length > 0) updateSwaps(swap);
      setClients(clients);
      setSwapPairs(swapPairs);
    } catch (e) {
      console.log("error", e);
      alert("Error Connecting to Wallet", e);
    }
  };

  const update = (hash, state, exact = undefined) => {
    let newSwap = swapRef.current;
    if (newSwap[hash] !== undefined) {
      newSwap[hash].state = state;
      if (exact !== undefined) newSwap[hash].exact = exact;
      updateSwaps(newSwap);
      forceUpdate();
    } else console.log("missing hash update request");
  };

  const genSwap = async (swap, req_swap = undefined) => {
    let generatedSwap = {}
    if (swap.network === "pureTezos")
      generatedSwap = await requestPureSwap(swap, clients, swapPairs, update);
    else
      generatedSwap = await requestSwap(swap, clients, swapPairs, update);
    if (generatedSwap === undefined) return false;
    let newSwaps = swapRef.current;
    if (newSwaps === undefined) {
      newSwaps = {};
    }
    const counterAsset = getCounterPair(
      generatedSwap.pair,
      generatedSwap.asset
    );

    generatedSwap["value"] =
      new BigNumber(generatedSwap.value)
        .div(10 ** swapPairs[generatedSwap.pair][generatedSwap.asset].decimals)
        .toString() +
      " " +
      swapPairs[generatedSwap.pair][generatedSwap.asset].symbol;
    generatedSwap["minReturn"] =
      new BigNumber(generatedSwap.minValue)
        .div(10 ** swapPairs[generatedSwap.pair][counterAsset].decimals)
        .toString() +
      " " +
      swapPairs[generatedSwap.pair][counterAsset].symbol;
    newSwaps[generatedSwap.hashedSecret] = generatedSwap;
    console.log(newSwaps);
    updateSwaps(newSwaps);
    forceUpdate();
    return true;
  };

  if (clients === undefined || swapPairs === undefined)
    return (
      <div className="App">
        <Setup init={initialize} />
      </div>
    );

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <div className="App">
        <Header
          clients={clientRef.current}
          swapPairs={swapPairsRef.current}
          balUpdate={balUpdate}
        />
        {balance === undefined && <Loader message="Loading Account" />}
        {balance !== undefined && (
          <Switch>
            <Route exact path="/">
              <Home
                swaps={swaps}
                clients={clientRef.current}
                swapPairs={swapPairsRef.current}
                update={update}
              />
            </Route>
            <Route exact path="/swap">
              <CreateSwap
                genSwap={genSwap}
                clients={clientRef.current}
                swapPairs={swapPairsRef.current}
                balance={balance}
              />
            </Route>
            <Route exact path="/about">
              <About />
            </Route>
            <Route exact path="/stats">
              <Stat swapPairs={swapPairsRef.current} />
            </Route>
          </Switch>
        )}
      </div>
    </Router>
  );
};

export default App;
