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

import { shorten } from "../../util";
import { TezexContext } from '../context/TezexContext';

import useStyles from "./style";
import { getSwapStat } from "../newSwap/util";

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

    const [currentSwap, setCurrentSwap] = useState(undefined);
    const [swapStat, setSwapStat] = useState(undefined);
    const [pairs, setPairs] = useState([]);

    const toggleEthDrawer = (anchor, open) => (event) => {
      if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
        return;
      }
      setExpandEthWallet({ ...expandEthWallet, [anchor]: open })
    };
    const toggleTezDrawer = (anchor, open) => (event) => {
      if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
        return;
      }
        setExpandTezWallet({ ...expandTezWallet, [anchor]: open })
    };

    const setupEthAccount = async () => {
      // e.preventDefault();
      try {
        setupEth();
      } catch (error) {}
    }

    const setupXtzAccount = async () => {
      // e.preventDefault();
      try{
        setupTez();
      }
      catch(error) {}
    };


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

    useEffect(() => {

      setXtzAccount(globalContext.tezosClient.account);
      setEthAccount(globalContext.ethereumClient.account);

    }, [setupXtzAccount, setupEthAccount]);

    useEffect(() => {
      if (clients['tezos']) {
        globalContext.changeTezosClient(clients.tezos);
      }
    }, [ clients['tezos']])

    useEffect(() => {
      if (clients['ethereum']) {
        globalContext.changeEthereumClient(clients.ethereum);
      }
    }, [clients['ethereum']])

    useEffect(() => {
        updateBalance();
        const timer = setInterval(async () => { await updateBalance(); }, 60000);
        return () => { clearInterval(timer); };
    }, [ethAccount, xtzAccount]);
    return (
        <div className={classes.header}>
            <div className={classes.nav}>
                <Grid container>
                    <Grid data-aos="flip-left" container item xs={6} sm={3} md={2} alignContent = "center" justify = "center">
                        <img className={classes.logo} src={logo} alt="Logo" />
                    </Grid>
                    <Grid container item alignContent = "center" justify = "center" xs={6} sm={5} md={6} lg={7} >
                        <Grid item md={2}></Grid>
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
													onClick={!ethAccount ? setupEthAccount :  toggleEthDrawer(anchor, true)}
													className={`${classes.walletbutton + " Element"} ${ ethAccount ? classes.ethButton + " Element" : '' }`}
                        >
													<Grid container item alignContent="center" justify="space-evenly">
															<img src={ethwalletlogo} />
															{(!ethAccount || ethAccount.length === 0) && ('Connect Wallet')}
															{(ethAccount && ethAccount.length > 0) && (shorten(5, 5, ethAccount))}
													</Grid>
                        </Button>
												<SwipeableDrawer anchor={anchor} open={expandEthWallet[anchor]} onClose={toggleEthDrawer(anchor, false)} className={classes.root}>
													<ExpandWalletView
														address= {ethAccount &&(shorten(10, 7, ethAccount))}
                            walletType= {"Metamask"}
                            copyText={ethAccount}
														className= {classes.ethStyle + " Element"}
													/>
												</SwipeableDrawer>
												</>
											))}
											{['right'].map((anchor) => (
												<>
												<Button key={anchor} variant="outlined" size="small" disableElevation
													onClick={!xtzAccount ? setupXtzAccount : toggleTezDrawer(anchor, true)}
													className={`${classes.walletbutton + " Element"} ${ xtzAccount ? classes.tezButton + " Element" : '' }`}
												>
													<Grid container item alignContent="center" justify="space-evenly">
														<img src={tzwalletlogo} />
														{(!xtzAccount || xtzAccount.length === 0) && ('Connect Wallet')}
														{(xtzAccount && xtzAccount.length > 0) && (shorten(5, 5, xtzAccount))}
													</Grid>
												</Button>
												<SwipeableDrawer anchor={anchor} open={expandTezWallet[anchor]} onClose={toggleTezDrawer(anchor, false)} className={classes.root}>
													<ExpandWalletView
														address= {xtzAccount &&(shorten(10, 7, xtzAccount))}
                            walletType= {"Temple"}
                            copyText={xtzAccount}
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
