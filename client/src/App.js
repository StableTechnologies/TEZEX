import { BigNumber } from "bignumber.js";
import React, { useContext, useEffect, useRef, useState } from "react";
import { BrowserRouter as Router, Route, Switch } from "react-router-dom";

import AOS from 'aos';
import "aos/dist/aos.css";

import "./App.css";
import TezexContext from './components/context/TezexContext';
import About from "./components/about";
import Header from "./components/header";
import Footer from "./components/footer";
import Home from "./components/home";
import Loader from "./components/loader";
import CreateSwap from "./components/newSwap";
import Notice from "./components/notice";
import Setup from "./components/setup";
import Stat from "./components/stats";
import requestSwap from "./library/request-swap";
import { getCounterPair } from "./library/util";
import { getOldSwaps, setupClient, setupEthClient, setupTezClient } from "./util";
import useStyles from "./style";

const App = () => {
  const [clients, setClients] = useState({ethereum: null, tezos: null});
  const [swapPairs, setSwapPairs] = useState(undefined);
  const [swaps, updateSwaps] = useState(undefined);
  const [balance, balUpdate] = useState(undefined);
  const [, updateState] = React.useState();

  const globalContext = useContext(TezexContext);

  const classes = useStyles();

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

  useEffect(() => {
    // Initialize AOS animation
    AOS.init({
      duration : 2000
    });
  }, []);

  const setupXtzAccount = async () => {
    try {
      const { swapPairs, clients } = await setupTezClient();
      // let swap = await getOldSwaps(clients, swapPairs);
      // if (Object.keys(swap).length > 0) updateSwaps(swap);
      setClients(prevState => ({...prevState, ...clients}));
      setSwapPairs(swapPairs);
    } catch (e) {
      console.log("error", e);
      alert("Error Connecting to TezWallet", e);
    }
  };
  const setupEthAccount = async () => {
    try {
        const { swapPairs, clients } = await setupEthClient();
        // let swap = await getOldSwaps(clients, swapPairs);
        // if (Object.keys(swap).length > 0) updateSwaps(swap);
        setClients(prevState => ({...prevState, ...clients}));
        setSwapPairs(swapPairs);
    }
    catch(err) {}
};

  console.log(swapPairs, 'ieth');
  console.log(clients, 'ccieth');
  console.log(swapPairs, 'iTez');
  console.log(clients, 'cciTez');

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
    const generatedSwap = await requestSwap(swap, clients, swapPairs, update);
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

  return (
    <TezexContext>
    <Router basename={process.env.PUBLIC_URL}>
      <div className="App">
        <Header
          clients={clientRef.current}
          swapPairs={swapPairsRef.current}
          balUpdate={balUpdate}
          setupEth = {setupEthAccount}
          setupTez = {setupXtzAccount}
        />
        {/* {balance === undefined && <Loader message="Loading Account" />} */}
        {/* {balance !== undefined && ( */}
          <Switch>
            <Route exact path="/">
              <Home
                swaps={swaps}
                clients={clientRef.current}
                swapPairs={swapPairsRef.current}
                update={update}
                setupEth = {setupEthAccount}
                setupTez = {setupXtzAccount}
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
          <Footer />
        {/* )} */}
      </div>
    </Router>
    </TezexContext>
  );
};

export default App;
