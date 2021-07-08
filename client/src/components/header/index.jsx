import React, { useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import BigNumber from "bignumber.js";
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';

import { convertBigIntToFloat } from "../../library/util";

import ExpandWalletView from "../expandWalletView/index";
import SwipeableDrawer from '@material-ui/core/SwipeableDrawer';


import logo from "../../assets/TezexLogo.svg";
import tzwalletlogo from "../../assets/tzwalletlogo.svg";
import ethwalletlogo from "../../assets/ethwalletlogo.svg";

import { shorten, connectEthAccount, connectTezAccount, setupEthClient, setupTezClient } from "../../util";
import { TezexContext } from '../context/TezexContext';

import useStyles from "./style";

const Header = ({ clients, swapPairs, balUpdate, setupEth, setupTez, }) => {
    const classes = useStyles();
    const history = useHistory();
    const globalContext = useContext(TezexContext);



    const [expandEthWallet, setExpandEthWallet] = useState({right: false,});
    const [expandTezWallet, setExpandTezWallet] = useState({right: false,});
    const [ethBalance, setEthBalance] = useState(0);
    const [xtzBalance, setXtzBalance] = useState(0);
    const [ethAccount, setEthAccount] = useState('');
    const [xtzAccount, setXtzAccount] = useState('');

    const [ethClient, setEthClient] = useState(globalContext.ethereumClient);
    const [xtzClient, setXtzClient] = useState(globalContext.tezosClient);

    const isEthAccount = globalContext.ethereumClient.account;
    const isTezAccount = globalContext.tezosClient.account;

  const toggleTezDrawer = (anchor, open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
      setExpandTezWallet({ ...expandTezWallet, [anchor]: open })
  };
  const toggleEthDrawer = (anchor, open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
      setExpandEthWallet({ ...expandEthWallet, [anchor]: open })
  };

  const setupEthAccount = async (e) => {
    e.preventDefault();
    try {
      setupEth();
    } catch (error) { console.log(e);}
  }

  const setupXtzAccount = async (e) => {
    e.preventDefault();
    try{
      setupTez();
    }
    catch(error) {}
  };

console.log(clients, 'clients@header');
console.log(swapPairs, 'swapPairs@header');
console.log(isEthAccount, 'isEthAccount');
console.log(ethAccount, 'ethAccount');
console.log(isTezAccount, 'isTezAccount');
    const updateBalance = async () => {

      let eth = 0;
      let xtz = 0;
      if (clients && clients['ethereum']) {
        eth = await clients["ethereum"]
        .balance(clients["ethereum"].account)
        .then((val) => new BigNumber(val));
      }

      if (clients && clients['tezos']) {
        xtz = await clients["tezos"]
        .balance(clients["tezos"].account)
        .then((val) => new BigNumber(val));
      }

      balUpdate({ eth, xtz });

      setEthBalance({ eth: convertBigIntToFloat(eth, 18, 6),});
      setXtzBalance({ xtz: convertBigIntToFloat(xtz, 6, 6)});

    };

    // useEffect(() => {
    //   setEthClient(globalContext.ethereumClient.account);
    //   return () => {
    //     cleanup
    //   }
    // }, [input])

    useEffect(() => {
      if(clients && clients['ethereum']) {
        globalContext.changeEthereumClient(clients.ethereum);
      }
      if(clients && clients['tezos']) {
        globalContext.changeTezosClient(clients.tezos);
      }
    }, [clients,])

    useEffect(() => {
        updateBalance();
        const timer = setInterval(async () => { await updateBalance(); }, 60000);
        return () => { clearInterval(timer); };
    }, [isEthAccount, isTezAccount]);
console.log(ethAccount, 'ethAccounttet');
console.log(ethBalance.eth, 'ethBalance.eth');
console.log(xtzBalance.xtz, 'xtzBalance.xtz');
// console.log(xtzBalance.tez, 'xtzBalance.tez');

    return (
        <div className={classes.header}>
            <div className={classes.nav}>
                <Grid container>
                    <Grid data-aos="flip-left" container item xs={6} sm={3} md={2} alignContent = "center" justify = "center">
                        <img className={classes.logo} src={logo} alt="Logo" />
                    </Grid>
                    <Grid container item alignContent = "center" justify = "center" xs={6} sm={5} md={6} lg={7} >
                        <Grid md={2}></Grid>
                        <Grid container item alignContent = "center" justify = "center" xs={12} md={9} >
                            <button className={classes.button} onClick={() => history.push("/")} xs={4}>Home</button>
                            <button className={classes.button} onClick={() => history.push("/about")} xs={4}>About</button>
                            <button className={classes.button} onClick={() => history.push("/stats")} xs={4}> Stats </button>
                        </Grid>
                    </Grid>
                    <Grid container item alignContent = "center" justify = "center" xs={12} sm={4} md={4} lg={3}>
											{['right'].map((anchor) => (
												<>
                        <Button key={anchor} variant="outlined" size="small" disableElevation
													onClick={!isEthAccount ? setupEthAccount :  toggleEthDrawer(anchor, true)}
													className={`${classes.walletbutton + " Element"} ${ isEthAccount ? classes.ethButton + " Element" : '' }`}
                        >
													<Grid container item alignContent="center" justify="space-evenly">
															<img src={ethwalletlogo} />
															{/* {(!ethAccount || ethAccount.length === 0) && ('Connect Wallet')} */}
															{(!isEthAccount || isEthAccount.length === 0) && ('Connect Wallet')}
															{/* {(ethAccount && ethAccount.length > 0) && (shorten(5, 5, ethAccount))} */}
															{(isEthAccount && isEthAccount.length > 0) &&(shorten(5, 5, isEthAccount))}
													</Grid>
                        </Button>
												<SwipeableDrawer anchor={anchor} open={expandEthWallet[anchor]} onClose={toggleEthDrawer(anchor, false)} className={classes.root}>
													<ExpandWalletView
														// address= {ethAccount &&(shorten(10, 7, ethAccount))}
														address= {isEthAccount &&(shorten(10, 7, isEthAccount))}
                            walletType= {"Metamask"}
														className= {classes.ethStyle + " Element"}
													/>
												</SwipeableDrawer>
												</>
											))}
											{['right'].map((anchor) => (
												<>
												<Button key={anchor} variant="outlined" size="small" disableElevation
													onClick={!isTezAccount ? setupXtzAccount : toggleTezDrawer(anchor, true)}
													className={`${classes.walletbutton + " Element"} ${ isTezAccount ? classes.tezButton + " Element" : '' }`}
												>
													<Grid container item alignContent="center" justify="space-evenly">
														<img src={tzwalletlogo} />
														{(!isTezAccount || isTezAccount.length === 0) && ('Connect Wallet')}
														{(isTezAccount && isTezAccount.length > 0) && (shorten(5, 5, isTezAccount))}
													</Grid>
												</Button>
												<SwipeableDrawer anchor={anchor} open={expandTezWallet[anchor]} onClose={toggleTezDrawer(anchor, false)} className={classes.root}>
													<ExpandWalletView
														address= {isTezAccount &&(shorten(10, 7, isTezAccount))}
                            walletType= {"Temple"}
														className= {classes.tezStyle + " Element"}
													/>
												</SwipeableDrawer>
												</>
											))}
                    </Grid>
                </Grid>
            </div>
        </div>
    );
};

export default Header;
