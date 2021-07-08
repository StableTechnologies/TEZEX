import React, { useContext, useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import useStyles from "./style";


import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import TextField from '@material-ui/core/TextField';
import Typography from "@material-ui/core/Typography";
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import Grid from "@material-ui/core/Grid";
import Paper from '@material-ui/core/Paper';

import Loader from "../loader";
import sidelogo from "../../assets/sidelogo.svg";
import swapIcon from "../../assets/swapIcon.svg";
import tzlogo from "../../assets/tzlogo.svg";

import { TezexContext } from '../context/TezexContext';
import TokenSelectionDialog from '../dialog/TokenSelectionDialog';
import SwapProgress from '../swapProgress';
import CurrentSwaps from '../currentSwaps'
import  {content, tokens, tokenWallets}  from '../constants/index';
import { shorten, connectEthAccount, connectTezAccount, setupEthClient } from "../../util";
import CreateSwap from "../newSwap/index";
import { selectToken } from "../tokenPairs/index";
import config from "../../library/dev-network-config.json";

const Home = ({ swaps, clients, swapPairs, update, setupEth, setupTez }) => {
  const history = useHistory();
  const classes = useStyles();
  const globalContext = useContext(TezexContext);

  const [inputTokenModalOpen, setInputTokenModalOpen] = useState(false);
  const [outputTokenModalOpen, setOutputTokenModalOpen] = useState(false);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [errModalOpen, setErrModalOpen] = useState(false);
  const [swapProgress, setSwapProgress] = useState(false);
  const [currentSwap, setCurrentSwap] = useState(false);

  const [inputToken, setInputToken] = useState(tokens[4]);
  const [outputToken, setOutputToken] = useState('');

  const [wallet, setWallet] = useState('');
  const [err, setErr] = useState('');

  const [inputTokenAmount, setInputTokenAmount] = useState();
  const [outputTokenAmount, setOutputTokenAmount] = useState();

  const [ethAccount, setEthAccount] = useState('');
  const [xtzAccount, setXtzAccount] = useState('');
  // const [tokenPair, setTokenPair] = useState(tokens);

  const openInputTokenModal = () => { setInputTokenModalOpen(true); }
  const openOutputTokenModal = () => { setOutputTokenModalOpen(true); }
  const openSwapProgress = () => { setSwapProgress(true); }
  const openWalletModal = () => { setWalletModalOpen(true); }
  const openErrModal = () => { setErrModalOpen(true); setWalletModalOpen(false);}
  const minimize = () => { setSwapProgress(false); setCurrentSwap(true);}
  const maximize = () => { setSwapProgress(true); setCurrentSwap(false);}

  const setToken = (value, side) => {
    setInputTokenModalOpen(false);
    setOutputTokenModalOpen(false);
    setWalletModalOpen(false);
    setErrModalOpen(false);

    if (side === 'input') { setInputToken(value); }
    if (side === 'output') { setOutputToken(value); }
    if (side === 'wallet') { setWallet(value); }
    if (side === 'err') { setErr(value); }
  };

  const setupEthAccount = async () => {
    try {
      setupEth();
  }
    catch(error) {
      return (
        openErrModal()
      )
    }
  };
  const setupXtzAccount = async () => {
    try {
      setupTez();
    }
    catch(error) {}
  };
  useEffect(() => {
    if(clients && clients['ethereum']) {
      globalContext.changeEthereumClient(clients.ethereum);
    }
    if(clients && clients['tezos']) {
      globalContext.changeTezosClient(clients.tezos);
    }
  }, [clients,])

  const setWalletType = async (value) => {
    const str = inputToken.title.toLowerCase();
    if(str.includes('tz')) {
       setupXtzAccount()
    }
    else {
      openWalletModal();
    }
  }

  const setEthWallet = (value) => {
    if(value.title === "Metamask") {
      setupEthAccount();
    }
}

const tokenPair = selectToken(inputToken.title);
// const tokenPair1 = selectToken(outputToken.title);
// const tokenPair2 = getPairings(inputToken.title);

const toggleTokens = () => {
  // tokenPair1.map(x =>{
  //   if(inputToken.title === x.title) {
  //     setInputToken(outputToken);
  //     setOutputToken(inputToken);

  //  console.log(!outputToken.title);
  //   }
  //   else {
  // setInputToken(outputToken);
  // setOutputToken(!outputToken.title);
  //   }
  // }) //stops here
  setInputToken(outputToken);
  setOutputToken(inputToken);
}
useEffect(() => {
  tokenPair.map(x =>{
    if(outputToken.title !== x.title) {
    // setOutputToken(!outputToken.title);
    }
  })
}, [inputToken, outputToken]);


  const refundHandler = async (swap) => {
    try {
      if (Math.trunc(Date.now() / 1000) < swap.refundTime) {
        alert("Wait till expiry!");
        return;
      }
      await clients[swap.network].refund(
        swapPairs[swap.pair][swap.asset].swapContract,
        swap.hashedSecret
        );
        console.log(swapPairs[swap.pair][swap.asset], 'swapPairs');
      update(swap.hashedSecret, 4);
    } catch (err) {
      console.error(err);
      alert("error in refunding, check if the refund time has come");
    }
  };




  // const SwapItem = (data) => {
  //   const exp = new Date(data.refundTime * 1000);
  //   const state = {
  //     0: "Error in Swap",
  //     1: "Swap Initiated",
  //     2: "Swap Response Found",
  //     3: "Completed",
  //     4: "Refunded",
  //   };
  //   return (
  //     <div className={classes.swap} key={data.hashedSecret}>
  //       <p>Hash : {data.hashedSecret}</p>
  //       <p>Value : {data.value}</p>
  //       {data.minReturn !== "nil" && (
  //         <p>Min Expected Return : {data.minReturn}</p>
  //       )}
  //       {data.exact !== "nil" && <p>Exact Return : {data.exact}</p>}
  //       <p>Expiry Time : {exp.toLocaleString()}</p>
  //       {data.state === 0 && (
  //         <div className={classes.error}>
  //           <p>{state[data.state]}</p>
  //           <button
  //             className={classes.errorBtn}
  //             onClick={() => refundHandler(data)}
  //           >
  //             refund!
  //           </button>
  //         </div>
  //       )}
  //       {data.state !== 0 && <p>State : {state[data.state]}</p>}
  //     </div>
  //   );
  // };
  // let data = (
  //   <div className={classes.noSwap}>
  //     <p>
  //       No Swaps Created Yet! Learn more about <b>TEZEX</b> and how to create
  //       your own Atomic Swap
  //     </p>
  //     <button className={classes.button} onClick={() => history.push("/about")}>
  //       Learn More
  //     </button>
  //     <p>or create a Swap now!</p>
  //     <button className={classes.button} onClick={() => history.push("/swap")}>
  //       Start New Swap
  //     </button>
  //   </div>
  // );
  // if (swaps !== undefined)
  //   data = Object.keys(swaps).map((key) => SwapItem(swaps[key]));

  return (
    <Grid container justify="center" className = {classes.bodycontainer}>
      <Grid item className = {classes.sidelogocontainer} xs={1}>
        {" "}
          <img className = {classes.sidelogo} src={sidelogo} />
      </Grid>
      <Grid data-aos="zoom-in-up" item xs={11} justify = "center" className = {classes.swapcontainer}>
        <Grid container justify = "space-evenly" className={classes.con}>
          <Grid item xs={0} md ={2} lg={2}></Grid>
          <Grid item xs={12} sm={7} md={5} lg={4}>
            <div className={classes.swaps}>
              <Card className={classes.card} square>
                <CardHeader
                  title={
                    <Typography variant="h1" className={classes.title + " Element"}>
                    Swap Tokens
                    </Typography>
                    }
                />
                <CardContent>
                  <form>
                    <div className={classes.tokenContainer + " Element"}>
                      <div className={classes.balContainer}>
                        <Typography color="textSecondary" variant="subtitle2">From</Typography>
                        {/* <Typography color="textSecondary" variant="subtitle2">Balance: 200 XTZ</Typography> */}
                      </div>
                      <div className={classes.tokenDetails} >
                        <Button
                          endIcon={ <KeyboardArrowDownIcon style={{ color: "#000" }} />}
                          size="small"
                          onClick={openInputTokenModal}
                          className={classes.tokenButton}
                        >
                          {inputToken && (
                            <img className={classes.logo} src={inputToken.logo} alt="logo"/>
                          )}
                          {inputToken.title || "Select Token"}
                        </Button>
                        <TextField
                          autoFocus
                          margin="dense"
                          id="inputTokenValue"
                          type="text"
                          placeholder="0.00"
                          onInput={(e) => setInputTokenAmount(e.target.value.replace(/"^[0-9]*[.,]?[0-9]*$/, ''))}
                          value={inputTokenAmount}
                          className={classes.tokenValue }
                          inputProps={{className: classes.tokenValue, pattern: "^\d+(\.\d{1,4})?$", inputMode:"decimal"}}
                          // inputProps={{className: classes.tokenValue, pattern: "^[+-]?((\[0-9]+(\.\[0-9]*)?)|(\.\[0-9]+))$", inputMode:"decimal"}}
                          // inputProps={{className: classes.tokenValue, pattern: "^[0-9]*[.,]?[0-9]*$", inputMode:"decimal"}}
                          InputProps={{ disableUnderline: true}}
                        />
                      </div>

                      <TokenSelectionDialog
                          selectedValue={inputToken}
                          open={inputTokenModalOpen}
                          onClose={setToken}
                          side='input'
                          isSearch
                          lists={tokens}
                      />
                    </div>

                    <Button className={classes.swapIcon} onClick={toggleTokens}>
                        <img src={swapIcon} alt="swap-Icon" />
                    </Button>

                    <div className={classes.tokenContainer}>
                      <Typography color="textSecondary" variant="subtitle2">To</Typography>
                      <div className={classes.tokenDetails} >
                        <Button
                          endIcon={ <KeyboardArrowDownIcon style={{ color: "#000" }} />}
                          size="small"
                          onClick={openOutputTokenModal}
                          className={classes.tokenButton}
                        >
                          {outputToken && (
                            <img className={classes.logo} src={outputToken.logo} alt="logo" />
                          )}
                          {outputToken.title || "Select Token"}
                        </Button>
                        <TextField
                          autoFocus
                          margin="dense"
                          id="outputTokenValue"
                          type="text"
                          placeholder="0.00"
                          onInput={(e) => setOutputTokenAmount(e.target.value.replace(/[^0-9]/, '') )}
                          value={outputTokenAmount}
                          inputProps={{className: classes.tokenValue, pattern: "^[0-9]*[.,]?[0-9]*$", inputMode:"decimal"}}
                          InputProps={{ disableUnderline: true}}
                        />
                      </div>
                      <TokenSelectionDialog
                          selectedValue={outputToken }
                          open={outputTokenModalOpen}
                          onClose={setToken}
                          side='output'
                          isSearch
                          lists = {tokenPair}
                      />
                    </div>
                  </form>
                </CardContent>
                <CardActions>
                  {
                    (globalContext.tezosClient.account || globalContext.ethereumClient.account) ?
                    (
                      <>
                        {
                          (inputToken && outputToken) ?
                          (
                            <>
                            {
                              (inputTokenAmount && outputTokenAmount) ?
                              (
                            <>
                              <Button size="large" className = {classes.connectwalletbutton + " Element"} onClick={openSwapProgress} >swap tokens</Button>
                              <SwapProgress open={swapProgress} onClose={minimize} />
                            </>
                              ) :
                              (
                                <Button size="large" className = {`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}` } disabled>Enter Amount</Button>
                              )
                            }
                            </>
                          ) :
                          (
                            <Button size="large" className = {`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}` } disabled>Select Token</Button>
                          )
                        }
                      </>
                    ) :
                    (
                      <>
                        <Button size="large" className = {classes.connectwalletbutton + " Element"} onClick={setWalletType} >Connect Wallet</Button>
                        <TokenSelectionDialog
                        selectedValue={wallet}
                        open={walletModalOpen}
                        onClose={setToken}
                        side='wallet'
                        lists={tokenWallets}
                        content = {content.connectWallet}
                        handleClick={setEthWallet}
                        closeBtn
                      />
                      <TokenSelectionDialog
                        selectedValue={err}
                        open={errModalOpen}
                        side='err'
                        onClose={setToken}
                        content={content.errorMessage}
                        lists ={ []}
                        content1 = {
                          <Loader
                            message= "Waiting for connection confirmation..."
                            loaderContainer = {classes.loaderContainer}
                            loader = {classes.loader}
                            size = {32}
                          />}
                        closeBtn
                      />
                      </>
                    )
                  }
                </CardActions>
              </Card>
              <Paper  variant="outlined" className = {classes.feepaper + " Element"} square>
                <div className= {classes.feeDetails}>
                  <Typography>Swap Fee</Typography>
                  <Typography>0.15 %</Typography>
                  {/* <Typography>{swapFee}</Typography> */}
            {/* {swapPairs[currentSwap.pair][counterAsset].symbol} */}
                </div>
                <div className= {classes.feeDetails}>
                  <Typography>Max Network Fee</Typography>
                  <Typography>0.00 {outputToken.title || "XTZ"}</Typography>
                </div>
                <div className= {classes.feeDetails}>
                  <Typography>Minimum Received</Typography>
                  <Typography>0.00 {outputToken.title || "XTZ"}</Typography>
                </div>
              </Paper>
              {/* {data} */}
            </div>
          </Grid>
          <Grid item  xs={12} sm={4} md={4} lg={3}>
            {currentSwap && (
              <CurrentSwaps asset={inputToken} pair={outputToken} onClick={maximize} />
            )}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Home;
