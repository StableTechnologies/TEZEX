import React, { useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import BigNumber from "bignumber.js";
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';

import { convertBigIntToFloat } from "../../library/util";
import ExpandWalletView from "../expandWalletView/index";

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

    const [expandEthWallet, setExpandEthWallet] = useState(false);
    const [expandTezWallet, setExpandTezWallet] = useState(false);
    const [ethBalance, setEthBalance] = useState(0);
    const [xtzBalance, setXtzBalance] = useState(0);
    const [ethAccount, setEthAccount] = useState('');
    const [xtzAccount, setXtzAccount] = useState('');

  const expandEthWalletModal = () => { setExpandEthWallet(true); };
  const expandTezWalletModal = () => { setExpandTezWallet(true); };
  const closeWalletModal = () => { setExpandEthWallet(false) || setExpandTezWallet(false);; };

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

    useEffect(() => {
        updateBalance();
        const timer = setInterval(async () => { await updateBalance(); }, 60000);
        return () => { clearInterval(timer); };
    }, [ethAccount, xtzAccount]);
    return (
        // <div className={classes.root}>
        //     <Grid container spacing={3}>
        //         <Grid item xs={2}>
        //             <img className={classes.logo} src={logo} alt="Logo" />
        //         </Grid>
        //         <Grid item xs={6}>
        //             <div>
        //                 <button className={classes.button} onClick={() => history.push("/")}>Home</button>
        //                 <button className={classes.button} onClick={() => history.push("/about")}>About</button>
        //                 <button className={classes.button} onClick={() => history.push("/stats")}> Stats </button>
        //             </div>
        //         </Grid>
        //         <Grid item xs={4}>
        //             <div>
        //                 <Button className={classes.walletbutton + " Element"} variant="outlined" size="small" disableElevation onClick={setupEthAccount}>
        //                     <Grid container item alignContent="center" justify="space-evenly">
        //                         <img src={ethwalletlogo} />
        //                         {(!ethAccount || ethAccount.length === 0) && ('Connect Wallet')}
        //                         {(ethAccount && ethAccount.length > 0) && (shorten(5, 5, ethAccount))}
        //                     </Grid>
        //                 </Button>
        //                 <Button className = {classes.walletbutton + " Element"} variant="outlined" size="small" disableElevation onClick={setupXtzAccount}>
        //                     <Grid container item alignContent="center" justify="space-evenly">
        //                         <img src={tzwalletlogo} />
        //                         {(!xtzAccount || xtzAccount.length === 0) && ('Connect Wallet')}
        //                         {(xtzAccount && xtzAccount.length > 0) && (shorten(6, 6, xtzAccount))}
        //                     </Grid>
        //                 </Button>
        //             </div>
        //         </Grid>
        //     </Grid>
        // </div>
        <div className={classes.header}>
            <div className={classes.nav}>
                <Grid container>
                    <Grid container item xs={6} sm={3} md={2} alignContent = "center" justify = "center">
                        <img className={classes.logo} src={logo} alt="Logo" />
                    </Grid>
                    <Grid container item alignContent = "center" justify = "center" xs={6} sm={4} md={6} >
                        <Grid md={3}></Grid>
                        <Grid container item alignContent = "center" justify = "center" md={9} >
                            <button className={classes.button} onClick={() => history.push("/")}>Home</button>
                            <button className={classes.button} onClick={() => history.push("/about")}>About</button>
                            <button className={classes.button} onClick={() => history.push("/stats")}> Stats </button>
                        </Grid>
                    </Grid>
                    <Grid container item alignContent = "center" justify = "space-evenly" xs={12} sm={5} md={4}>
                        <Button variant="outlined" size="small" disableElevation
                            onClick={!isEthAccount ? setupEthAccount :  expandEthWalletModal}
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
                        <Button variant="outlined" size="small" disableElevation
                            onClick={!isTezAccount ? setupXtzAccount : expandTezWalletModal}
                            className={`${classes.walletbutton + " Element"} ${ isTezAccount ? classes.tezButton + " Element" : '' }`}
                        >
                            <Grid container item alignContent="center" justify="space-evenly">
                                <img src={tzwalletlogo} />
                                {(!isTezAccount || isTezAccount.length === 0) && ('Connect Wallet')}
                                {(isTezAccount && isTezAccount.length > 0) && (shorten(6, 6, isTezAccount))}
                            </Grid>
                        </Button>
                        <ExpandWalletView open = {expandEthWallet} close = {closeWalletModal}
                        address= {isEthAccount &&(shorten(10, 8, isEthAccount))}
                        />
                        <ExpandWalletView open = {expandTezWallet} close = {closeWalletModal}
                        address= {isTezAccount &&(shorten(10, 7, isTezAccount))}
                        className= {classes.tezStyle + " Element"}
                        />
                    </Grid>
                </Grid>
            </div>
        </div>
    );
};

export default Header;
