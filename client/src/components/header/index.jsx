import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { constants } from "../../library/common/util";
import logo from "../../tezexbridge.png";
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
    tez = tez / constants.decimals10_6;
    tokenEth /= constants.decimals10_6;
    tokenTez /= constants.decimals10_6;
    balUpdate({ eth, tez, tokenEth, tokenTez });
    setBalance({ eth, tez, tokenEth, tokenTez });
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
        <p>Token Balance : {balance.tokenEth} USDC</p>
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
          onClick={() => history.push("/create")}
        >
          New Swap
        </button>
      </div>
      <div className={classes.account}>
        <p>Tezos Addr.: {shorten(5, 5, tezStore.account)}</p>
        <p>Balance : {balance.tez} XTZ</p>
        <p>Token Balance : {balance.tokenTez} USDTz</p>
      </div>
    </div>
  );
};

export default Header;
