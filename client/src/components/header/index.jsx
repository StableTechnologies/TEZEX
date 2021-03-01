import BigNumber from "bignumber.js";
import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { convertBigIntToFloat } from "../../library/util";
import logo from "../../tezexbridge.png";
import { shorten } from "../../util";
import useStyles from "./style";

const Header = ({ clients, swapPairs, balUpdate }) => {
  const [balance, setBalance] = useState({ eth: 0, tez: 0 });
  const classes = useStyles();
  const history = useHistory();
  const updateBalance = async () => {
    let eth = await clients["ethereum"]
      .balance(clients["ethereum"].account)
      .then((val) => new BigNumber(val));
    let tez = await clients["tezos"]
      .balance(clients["tezos"].account)
      .then((val) => new BigNumber(val));
    balUpdate({ eth, tez });
    setBalance({
      eth: convertBigIntToFloat(eth, 18, 6),
      tez: convertBigIntToFloat(tez, 6, 6),
    });
  };

  useEffect(() => {
    updateBalance();
    const timer = setInterval(async () => {
      await updateBalance();
    }, 60000);
    return () => {
      clearInterval(timer);
    };
  }, [clients["ethereum"].account, clients["tezos"].account]);

  return (
    <div className={classes.header}>
      <div className={classes.account}>
        <p>Ethereum Addr.: {shorten(5, 5, clients["ethereum"].account)}</p>
        <p>Balance : {balance.eth} ETH</p>
        {/* <p>Token Balance : {balance.usdc} USDC</p> */}
      </div>
      <div className={classes.nav}>
        <img className={classes.logo} src={logo} alt="Logo" />
        <button className={classes.button} onClick={() => history.push("/")}>
          Home
        </button>
        <button
          className={classes.button}
          onClick={() => history.push("/about")}
        >
          About
        </button>
        <button
          className={classes.button}
          onClick={() => history.push("/stats")}
        >
          Live Stats
        </button>
        <button
          className={classes.button}
          onClick={() => history.push("/swap")}
        >
          New Swap
        </button>
      </div>
      <div className={classes.account}>
        <p>Tezos Addr.: {shorten(5, 5, clients["tezos"].account)}</p>
        <p>Balance : {balance.tez} XTZ</p>
        {/* <p>Token Balance : {balance.usdtz} USDtz</p> */}
      </div>
    </div>
  );
};

export default Header;
