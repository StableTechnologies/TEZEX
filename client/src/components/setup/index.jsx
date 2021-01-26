import React from "react";
import logo from "../../tezexbridge.png";
import useStyles from "./style";
const Setup = ({ init }) => {
  const setup = (e) => {
    e.preventDefault();
    init();
  };
  const classes = useStyles();
  return (
    <div className={classes.container}>
      <div className={classes.intro}>
        <img className={classes.logo} src={logo} alt="Logo" />
        <p>
          Truly Decentralized Cross-Chain Atomic Swaps for Ethereum and Tezos
        </p>
        <p>
          *Do not refresh or close the app during a running swap, your swaps
          will be lost
        </p>
      </div>
      <button onClick={setup}>Connect to Tezos and Ethereum Wallets</button>
    </div>
  );
};

export default Setup;
