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

import { shorten, connectEthAccount, connectTezAccount } from "../../util";
import { TezexContext } from '../context/TezexContext';

import useStyles from "./style";

const Header = ({ clients, swapPairs, balUpdate }) => {
    const classes = useStyles();
    const history = useHistory();
    const globalContext = useContext(TezexContext);

    const isEthAccount = globalContext.ethereumClient.account;
    const isTezAccount = globalContext.tezosClient.account;

    const [expandEthWallet, setExpandEthWallet] = useState({right: false,});
    const [expandTezWallet, setExpandTezWallet] = useState({right: false,});
    const [ethBalance, setEthBalance] = useState(0);
    const [xtzBalance, setXtzBalance] = useState(0);
    const [ethAccount, setEthAccount] = useState('');
    const [xtzAccount, setXtzAccount] = useState('');

    const [ethClient, setEthClient] = useState(globalContext.ethereumClient);
    const [xtzClient, setXtzClient] = useState(globalContext.tezosClient);


  const toggleDrawer = (anchor, open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
      setExpandTezWallet({ ...expandTezWallet, [anchor]: open })
  };
  const toggleTezDrawer = (anchor, open) => (event) => {
    if (event && event.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
      setExpandEthWallet({ ...expandEthWallet, [anchor]: open })
  };

    const setupEthAccount = async (e) => {
        e.preventDefault();
        try {
            const r = await connectEthAccount();
            setEthAccount(r.account);
            globalContext.changeEthereumClient(r);
        }
        catch(err) {}
    };

    const setupXtzAccount = async (e) => {
        e.preventDefault();
        try{
            const r = await connectTezAccount();
            setXtzAccount(r.account);
            globalContext.changeTezosClient(r);
            console.log(r);
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

        setEthBalance(convertBigIntToFloat(eth, 18, 6))
        setXtzBalance(convertBigIntToFloat(xtz, 6, 6));
    };

    console.log(ethClient, xtzClient);

    useEffect(() => {
        updateBalance();
        const timer = setInterval(async () => { await updateBalance(); }, 60000);
        return () => { clearInterval(timer); };
    }, [ethAccount, xtzAccount]);

    // console.log(ethBalance, xtzBalance);
    // console.log(ethAccount, xtzAccount);
    // console.log(isEthAccount, isTezAccount);
    // console.log(globalContext);

    return (
        <div className={classes.header}>
            <div className={classes.nav}>
                <Grid container>
                    <Grid container item xs={6} sm={3} md={2} alignContent = "center" justify = "center">
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
													onClick={!isEthAccount ? setupEthAccount :  toggleTezDrawer(anchor, true)}
													className={`${classes.walletbutton + " Element"} ${ isEthAccount ? classes.ethButton + " Element" : '' }`}
                        >
													<Grid container item alignContent="center" justify="space-evenly">
															<img src={ethwalletlogo} />
															{/* {(!ethAccount || ethAccount.length === 0) && ('Connect Wallet')} */}
															{(!isEthAccount ) && ('Connect Wallet')}
															{/* {(ethAccount && ethAccount.length > 0) && (shorten(5, 5, ethAccount))} */}
															{isEthAccount &&(shorten(5, 5, isEthAccount))}
													</Grid>
                        </Button>
												<SwipeableDrawer anchor={anchor} open={expandEthWallet[anchor]} onClose={toggleTezDrawer(anchor, false)} className={classes.root}>
													<ExpandWalletView
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
													onClick={!isTezAccount ? setupXtzAccount : toggleDrawer(anchor, true)}
													className={`${classes.walletbutton + " Element"} ${ isTezAccount ? classes.tezButton + " Element" : '' }`}
												>
													<Grid container item alignContent="center" justify="space-evenly">
														<img src={tzwalletlogo} />
														{(!isTezAccount || isTezAccount.length === 0) && ('Connect Wallet')}
														{(isTezAccount && isTezAccount.length > 0) && (shorten(5, 5, isTezAccount))}
													</Grid>
												</Button>
												<SwipeableDrawer anchor={anchor} open={expandTezWallet[anchor]} onClose={toggleDrawer(anchor, false)} className={classes.root}>
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
