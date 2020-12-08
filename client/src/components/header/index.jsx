import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { shorten, truncate } from "../../util";
import useStyles from "./style";

const Header = ({ ethStore, tezStore, balUpdate }) => {
  const [balance, setBalance] = useState({ eth: 0, tez: 0 });
  const classes = useStyles();
  const history = useHistory();
  const updateBalance = async () => {
    let eth = await ethStore.balance(ethStore.account);
    let tez = await tezStore.balance(tezStore.account);
    let tokenEth = await ethStore.tokenBalance(ethStore.account);
    let tokenTez = await tezStore.tokenBalance(tezStore.account);
    eth = eth / Math.pow(10, 18);
    tez =tez / 1000000;
    balUpdate({ eth, tez, tokenEth, tokenTez });
    setBalance({ eth, tez,tokenEth, tokenTez });
  };

  useEffect(() => {
    updateBalance();
    const timer = setInterval(async () => {
      await updateBalance();
    }, 60000);
    return () => {
      clearInterval(timer);
    };
  }, [ethStore.account, tezStore.account]);

  return (
    <div className={classes.header}>
      <div className={classes.account}>
        <p>Ethereum Addr.: {shorten(5, 5, ethStore.account)}</p>
        <p>Balance : {truncate(balance.eth, 4)} ETH</p>
        <p>Token Balance : {truncate(balance.tokenEth, 4)} USDC</p>
      </div>
      <div className={classes.nav}>
        <h1 className={classes.title}>TrueSwap</h1>
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
          onClick={() => history.push("/create")}
        >
          New Swap
        </button>
      </div>
      <div className={classes.account}>
        <p>Tezos Addr.: {shorten(5, 5, tezStore.account)}</p>
        <p>Balance : {truncate(balance.tez, 4)} XTZ</p>
        <p>Token Balance : {truncate(balance.tokenTez, 4)} USDTz</p>
      </div>
    </div>
  );
};

export default Header;
