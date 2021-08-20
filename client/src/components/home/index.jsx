import React, { useContext, useEffect, useState } from "react";
import { calcSwapReturn, createSecrets, getCounterPair } from "../../library/util";
import { connectEthAccount, connectTezAccount, setupEthClient, shorten } from "../../util";
import { content, tokenWallets, tokens } from '../constants/index';
import { TezexContext } from '../context/TezexContext';

import BigNumber from "bignumber.js";
import Button from "@material-ui/core/Button";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from '@material-ui/core/CardHeader';
import CurrentSwaps from '../currentSwaps'
import Grid from "@material-ui/core/Grid";
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import Loader from "../loader";
import Paper from '@material-ui/core/Paper';
import RedeemSwap from '../swapError/redeemSwap'
import SwapProgress from '../swapProgress';
import SwapStatus from '../swapStatus';
import TextField from '@material-ui/core/TextField';
import TokenSelectionDialog from '../dialog';
import TryAgain from '../swapError/retrySwap';
import Typography from "@material-ui/core/Typography";
import { getSwapStat } from "../newSwap/util";
import { selectToken } from "../tokenPairs/index";

import sidelogo from "../../assets/sidelogo.svg";
import swapIcon from "../../assets/swapIcon.svg";
import warning from "../../assets/warning.svg";
import exclamationError from "../../assets/exclamationError.svg";

import useStyles from "./style";

const config = require(`../../library/${process.env.REACT_APP_ENV || "prod"
  }-network-config.json`);

const Home = ({ swaps, updateSwaps, clients, swapPairs, update, setupEth, setupTez, genSwap }) => {
  const classes = useStyles();
  const globalContext = useContext(TezexContext);

  const [inputTokenModalOpen, setInputTokenModalOpen] = useState(false);
  const [outputTokenModalOpen, setOutputTokenModalOpen] = useState(false);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [errModalOpen, setErrModalOpen] = useState(false);

  const [swapProgress, setSwapProgress] = useState(false);
  const [swapStatus, setSwapStatus] = useState(false);
  const [tryAgain, setTryAgain] = useState(false);
  const [redeemSwap, setRedeemSwap] = useState(false);
  const [currentSwapView, setCurrentSwapView] = useState(false);

  const [inputToken, setInputToken] = useState(tokens[4]);
  const [outputToken, setOutputToken] = useState('');
  const [inputTokenAmount, setInputTokenAmount] = useState();
  const [outputTokenAmount, setOutputTokenAmount] = useState('');

  const [wallet, setWallet] = useState('');
  const [err, setErr] = useState('');


  const [ethAccount, setEthAccount] = useState('');
  const [xtzAccount, setXtzAccount] = useState('');

  const [connectTez, setConnectTez] = useState(false);
  const [connectEth, setConnectEth] = useState(false);
  const [maxLimit, setMaxLimit] = useState(false);
  const [maxButton, setMaxButton] = useState(false);

  const [currentSwap, setCurrentSwap] = useState(false);
  const [maxSwap, setMaximizedSwap] = useState(undefined);
  const [swapStat, setSwapStat] = useState(undefined);

  const openInputTokenModal = () => { setInputTokenModalOpen(true); }
  const openOutputTokenModal = () => { setOutputTokenModalOpen(true); }
  const openSwapProgress = (swap) => { setMaximizedSwap(swap); setSwapProgress(true); }
  const openWalletModal = () => { setWalletModalOpen(true); }
  const openErrModal = () => { setErrModalOpen(true); setWalletModalOpen(false); }

  const minimize = () => { setMaximizedSwap(undefined); setSwapProgress(false); }
  const maximize = (swap) => { setMaximizedSwap(swap); setSwapProgress(true); }

  useEffect(() => {
    if (inputToken && outputToken) {
      let pair = [inputToken.title.toLowerCase(), outputToken.title.toLowerCase()]
      let reversePair = [outputToken.title.toLowerCase(), inputToken.title.toLowerCase()]
      let asset = inputToken.title.toLowerCase();

      pair = pair.join('/')
      reversePair = reversePair.join('/')

      const pairs = Object.keys(swapPairs);

      pairs.map((x) => {
        if (pair === x) {
          setCurrentSwap({ pair: pair, asset: asset });
        }
        if (reversePair === x) {
          setCurrentSwap({ pair: reversePair, asset: asset });
        }
      })
    }
  }, [inputToken, outputToken]);

  useEffect(() => {
    if (maxSwap !== undefined && swaps !== undefined) {
      if (swaps[maxSwap.hashedSecret] !== undefined && swaps[maxSwap.hashedSecret].state != maxSwap.state) {
        setMaximizedSwap(swaps[maxSwap.hashedSecret]);
      }
    }
  });

  useEffect(() => {
    if (currentSwap === undefined) return;

    if (currentSwap
      && (
        (swapPairs[currentSwap.pair][currentSwap.asset].network !== "pureTezos" && clients["ethereum"])
        || swapPairs[currentSwap.pair][currentSwap.asset].network === "pureTezos"
      )
      && clients["tezos"]) {
      try {
        getSwapStat(clients, swapPairs, currentSwap.pair)
          .then((data) => setSwapStat(data))

        const timer = setInterval(async () => {
          await getSwapStat(clients, swapPairs, currentSwap.pair).then((data) =>
            setSwapStat(data)
          );
        }, 60000);

        setMaxButton(true);
        setMaxLimit(false);

        return () => {
          clearInterval(timer);
        };

      } catch (e) { console.log(e); }
    }
  }, [currentSwap, clients["ethereum"], clients["tezos"]]);

  let counterAsset, swapReturn, swapFee, minExpectedReturn, networkFees, minReceived, bal, max, swapLimit;

  if ((currentSwap)
    && (
      (swapPairs[currentSwap.pair][currentSwap.asset].network !== "pureTezos" && clients["ethereum"])
      || swapPairs[currentSwap.pair][currentSwap.asset].network === "pureTezos"
    )
    && clients["tezos"]) {
    try {
      counterAsset = getCounterPair(currentSwap.pair, currentSwap.asset);
      swapReturn = new BigNumber(
        calcSwapReturn(
          new BigNumber(inputTokenAmount).multipliedBy(
            10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
          ),
          swapStat.reward
        )
      );
      swapFee = swapStat.assetConverter[counterAsset](
        new BigNumber(inputTokenAmount)
          .multipliedBy(
            10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
          )
          .minus(swapReturn)
      )
        .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
        .toFixed(6);

      max = swapStat.assetConverter[currentSwap.asset](
        new BigNumber(
          swapStat.botStats.max[currentSwap.pair][counterAsset]
        ).multipliedBy(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
      );
      if (swapStat.balances[currentSwap.asset].lt(max))
        max = swapStat.balances[currentSwap.asset];
        swapLimit =  max
        .div(10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals)
        .toFixed(6);

      minExpectedReturn = swapStat.assetConverter[counterAsset](
        swapReturn
      ).minus(swapStat.networkFees[counterAsset]);

      if (swapPairs[currentSwap.pair][currentSwap.asset].network === "pureTezos") {
        minExpectedReturn = swapStat.assetConverter[counterAsset](
          swapReturn
        );
        minReceived = minExpectedReturn
          .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
          .toFixed(6);
        bal = swapStat.balances[currentSwap.asset]
          .div(10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals)
          .toFixed(2);
      }

      networkFees = swapStat.networkFees[counterAsset]
        .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
        .toFixed(6)

      minReceived = minExpectedReturn
        .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
        .toFixed(6);

      bal = swapStat.balances[currentSwap.asset]
        .div(10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals)
        .toFixed(2);

    } catch (error) { }
  }
  const generateSwap = async (swap, secret) => {
    const res = await genSwap(swap, secret);
    if (!res) {
      setSwapProgress(false)
      setTryAgain(true)
    }
  };

  const startSwap = () => {
    const secret = createSecrets();
    const swap = {
      hashedSecret: secret.hashedSecret,
      pair: currentSwap.pair,
      asset: currentSwap.asset,
      network: swapPairs[currentSwap.pair][currentSwap.asset].network,
      value: new BigNumber(inputTokenAmount)
        .multipliedBy(
          10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
        )
        .toString(),
      minValue: minExpectedReturn.toString(),
      refundTime: Math.trunc(Date.now() / 1000) + config.swapConstants.refundPeriod,
      state: -1
    };
    generateSwap(swap, secret);
    openSwapProgress(swap);
  }
  const retry = () => {
    const secret = createSecrets();
    const swap = {
      hashedSecret: secret.hashedSecret,
      pair: currentSwap.pair,
      asset: currentSwap.asset,
      network: swapPairs[currentSwap.pair][currentSwap.asset].network,
      value: new BigNumber(inputTokenAmount)
        .multipliedBy(
          10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
        )
        .toString(),
      minValue: minExpectedReturn.toString(),
      refundTime: Math.trunc(Date.now() / 1000) + config.swapConstants.refundPeriod,
      state: -1
    };
    setTryAgain(false)
    generateSwap(swap, secret);
    openSwapProgress(swap);
  }


  const openSwapStatus = () => {
    setSwapStatus(true);
    setSwapProgress(false);
  }
  const closeSwapStatus = () => {
    setSwapStatus(false)
    setMaximizedSwap(undefined)
    setInputTokenAmount("");
    setOutputTokenAmount(0.00);
    setOutputToken("");
    setCurrentSwap('');
  }
  const openTryAgain = () => {
    setSwapProgress(false);
    setTryAgain(true);
  }
  const closeTryAgain = () => {
    setTryAgain(false)
    setMaximizedSwap(undefined)
  }
  const openRedeemSwap = () => {
    setSwapProgress(false);
    setRedeemSwap(true);
  }
  const closeRedeemSwap = () => {
    setRedeemSwap(false)
    setMaximizedSwap(undefined)
  }
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
    catch (error) {
      return (
        openErrModal()
      )
    }
  };
  const setupXtzAccount = async () => {
    try {
      setupTez();
    }
    catch (error) { }
  };

  const setWalletType = async () => {
    if(inputToken.title !== undefined) {
      const inputStr = inputToken.title.toLowerCase();

      if (inputStr.includes('tz')) {
        setupXtzAccount()
      }
      else {
        openWalletModal();
      }
    }
  }

  const setEthWallet = (value) => {
    if (value.title === "Metamask") {
      setupEthAccount();
    }
  }

  const checkWallet = () => {

    const inputStr = inputToken.title.toLowerCase().includes('tz');
    const outputStr = outputToken.title.toLowerCase().includes('tz');

    if( (inputStr && outputStr) &&
      (!globalContext.tezosClient.account && globalContext.ethereumClient.account)) {
      setConnectTez(true);
      setConnectEth(false);
    }
    if(globalContext.tezosClient.account) {
      setConnectTez(false);
    }
    if(globalContext.ethereumClient.account || (inputStr && outputStr)) {
      setConnectEth(false);
    }
   if( (!inputStr || !outputStr) &&
      (!globalContext.ethereumClient.account && globalContext.tezosClient.account)) {
      setConnectEth(true);
      setConnectTez(false);
    }
   if( (!inputStr || !outputStr) &&
      (globalContext.ethereumClient.account && !globalContext.tezosClient.account)) {
      setConnectEth(false);
      setConnectTez(true);
    }
  }


  const tokenPair = selectToken(inputToken.title);

  const toggleTokens = () => {

    setInputToken(outputToken);
    setOutputToken(inputToken);
  }

  useEffect(() => {
    if(inputToken && outputToken){
      checkWallet();
    }
    if(minReceived > swapLimit){
      setMaxLimit(true);
    }
    else {
      setMaxLimit(false);
    }
  }, [inputTokenAmount, inputToken, outputToken, setupEthAccount, setupXtzAccount])

  useEffect(() => {
    if (tokenPair.indexOf(outputToken) === -1) {
      setOutputToken('');
      setOutputTokenAmount('');
      setCurrentSwap('');
    }
  }, [inputToken, outputToken]);

  useEffect(() => {
    !inputTokenAmount ?
    setOutputTokenAmount('')
    :
    setOutputTokenAmount(minReceived)
  }, [minReceived, inputTokenAmount]);

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
      update(swap.hashedSecret, 4);
    } catch (err) {
      console.error(err);
      alert("error in refunding, check if the refund time has come");
    }
  };
  const refundFailedSwap = (swap) => {
    setRedeemSwap(false)
    refundHandler(swap)
    setMaximizedSwap(undefined)
  }
  const totalLiquidity = () => {
    setMaxButton(false);
    setInputTokenAmount(Number(swapLimit));
  }

  return (
    <Grid container justify="center" className={classes.root}>
      <Grid item className={classes.sidelogocontainer} xs={1}>
        {" "}
        <img className={classes.sidelogo} src={sidelogo} />
      </Grid>
      <Grid data-aos="zoom-in-up" item xs={11} justify="center" className={classes.swapcontainer}>
        <Grid container justify="space-evenly" className={classes.con}>
          <Grid item xs={0} md={2} lg={2}></Grid>
          <Grid item xs={12} sm={7} md={5} lg={4}>
            <Typography className={classes.warning}>
              {((connectTez || connectEth) || (minReceived <= 0)) &&
                <img src={warning} alt="warning logo" className={classes.warningImg} />
              }
              {connectTez &&  "Connect Your Tezos Wallet"}
              {connectEth &&  "Connect Your Ethereum Wallet"}
              {(minReceived <= 0) &&  "Minimum Receiveable must be greater than 0"}
            </Typography>
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
                        {bal &&
                          <Typography color="textSecondary" variant="subtitle2">wallet balance:{" "} {(bal >= 1) ? Math.floor(bal) : bal}{" "}{inputToken.title} </Typography>
                        }
                      </div>
                      <div className={classes.tokenDetails} >
                        <Button
                          endIcon={<KeyboardArrowDownIcon style={{ color: "#000" }} />}
                          size="small"
                          onClick={openInputTokenModal}
                          className={classes.tokenButton}
                          disableRipple
                        >
                          {inputToken && (
                            <img className={classes.logo} src={inputToken.logo} alt="logo" />
                          )}
                          {inputToken.title || "Select Token"}
                        </Button>
                        {(swapLimit >0 && maxButton) &&
                          <Button variant="contained" className={classes.maxButton} onClick={totalLiquidity}>
                            Max
                          </Button>
                        }
                        <TextField
                          autoFocus
                          margin="dense"
                          id="inputTokenValue"
                          type="text"
                          placeholder="0.00"
                          onInput={(e) => setInputTokenAmount(e.target.value.replace(/"^[0-9]*[.,]?[0-9]*$/, ''))}
                          value={inputTokenAmount}
                          className={classes.tokenValue}
                          inputProps={{ className: classes.tokenValue, pattern: "^\d+(\.\d{1,4})?$", inputMode: "decimal" }}
                          InputProps={{ disableUnderline: true }}
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
                    <Grid className={classes.maxSwapLimitCon}>
                      {(inputTokenAmount && maxLimit) &&
                      <>
                          <Typography className={classes.maxSwapLimit}>
                            <img src={exclamationError} alt="warning logo" className={`${classes.warningImg} ${classes.redWarningImg}`}/>
                            Insufficient liquidity for this swap.
                          </Typography>
                          {swapLimit <= 0 ? "" :
                            <Typography className={classes.maxSwapLimit}>
                              Please enter an amount lower than {" "} {Number(swapLimit)} {" "} {inputToken.title}
                            </Typography>
                          }
                        </>
                      }
                    </Grid>
                    <Button className={classes.swapIcon} onClick={toggleTokens} disableRipple>
                      <img src={swapIcon} alt="swap-Icon" />
                    </Button>

                    <div className={classes.tokenContainer}>
                      <Typography color="textSecondary" variant="subtitle2">To</Typography>
                      <div className={classes.tokenDetails} >
                        <Button
                          endIcon={<KeyboardArrowDownIcon style={{ color: "#000" }} />}
                          size="small"
                          onClick={openOutputTokenModal}
                          className={classes.tokenButton}
                          disableRipple
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
                          // onInput={(e) => setOutputTokenAmount(e.target.value.replace(/[^0-9]/, '') )}
                          value={outputTokenAmount || "0.00"}
                          inputProps={{ className: classes.tokenValue, pattern: "^[0-9]*[.,]?[0-9]*$", inputMode: "decimal" }}
                          InputProps={{ disableUnderline: true }}
                          disabled
                        />
                      </div>
                      <TokenSelectionDialog
                        selectedValue={outputToken}
                        open={outputTokenModalOpen}
                        onClose={setToken}
                        side='output'
                        isSearch
                        lists={tokenPair}
                      />
                    </div>
                  </form>
                </CardContent>
                <CardActions>
                  {(maxSwap !== undefined) && <>
                    <SwapStatus swap={maxSwap} open={swapStatus} onClose={closeSwapStatus} />
                    <TryAgain swap={maxSwap} open={tryAgain} onClose={closeTryAgain} onClick={retry} />
                    <RedeemSwap swap={maxSwap} open={redeemSwap} onClose={closeRedeemSwap} onClick={() => refundFailedSwap(maxSwap)} />
                    <SwapProgress swap={maxSwap} open={swapProgress} onClose={minimize} completed={openSwapStatus} notCompleted={openRedeemSwap} />
                  </>}
                  {
                    (globalContext.tezosClient.account || globalContext.ethereumClient.account) ?
                        <>
                          {
                            (inputToken && outputToken) ?
                              <>
                                { (!connectTez && !connectEth) ?
                                  <>
                                    { (inputTokenAmount && (minReceived > 0)) ?
                                        <>
                                          {
                                            ((Number(inputTokenAmount) <= bal)) ?
                                              <>
                                              { (connectTez || connectEth) || (maxLimit) ?
                                                <Button size="large" className={`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}`} disabled>Swap Tokens</Button>
                                                :
                                                <Button size="large" className={classes.connectwalletbutton + " Element"} onClick={startSwap} >Swap Tokens</Button>
                                              }
                                              </> :
                                              <Button size="large" className={`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}`} disabled>Insufficient Funds</Button>
                                          }
                                        </> :
                                        <Button size="large" className={`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}`} disabled>Enter Amount</Button>
                                    }
                                  </> :
                                  <>
                                    {
                                      (connectTez &&
                                        <Button size="large" className = {classes.connectwalletbutton + " Element"} onClick={setupXtzAccount} >Connect Tezos Wallet</Button>
                                      ) ||
                                      (connectEth &&
                                        <Button size="large" className = {classes.connectwalletbutton + " Element"} onClick={openWalletModal} >Connect Ethereum Wallet</Button>
                                      )
                                    }
                                  </>
                                }
                              </> :
                              <Button size="large" className={`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}`} disabled>Select Token</Button>
                          }
                        </>
                       :
                        <>
                          <Button size="large" className={classes.connectwalletbutton + " Element"} onClick={setWalletType} >Connect Wallet</Button>
                        </>
                    }
                    <TokenSelectionDialog
                      selectedValue={wallet}
                      open={walletModalOpen}
                      onClose={setToken}
                      side='wallet'
                      lists={tokenWallets}
                      content={content.connectWallet}
                      handleClick={setEthWallet}
                      closeBtn
                    />
                    <TokenSelectionDialog
                      selectedValue={err}
                      open={errModalOpen}
                      side='err'
                      onClose={setToken}
                      content={content.errorMessage}
                      lists={[]}
                      content1={
                        <Loader
                          message="Waiting for connection confirmation..."
                          loaderContainer={classes.loaderContainer}
                          loader={classes.loader}
                          size={32}
                        />}
                      closeBtn
                    />
                </CardActions>
              </Card>
              <Paper variant="outlined" className={classes.feepaper + " Element"} square>
                <div className={classes.feeDetails}>
                  <Typography>Swap Fee</Typography>
                  <Typography>{(!inputTokenAmount ? 0 : swapFee) || (!outputToken ? "0.15 %" : "0.00")} {""} {outputToken.title} </Typography>
                </div>
                <div className={classes.feeDetails}>
                  <Typography>Max Network Fee</Typography>
                  <Typography>
                    {(!inputTokenAmount ? 0 : networkFees) ||(!outputToken ? "0.00 XTZ" : "0.00")} {""} {outputToken.title}
                  </Typography>

                </div>
                <div className={classes.feeDetails}>
                  <Typography>Minimum Receiveable</Typography>
                  <Typography> {(!inputTokenAmount ? 0 : minReceived) || (!outputToken ? "0.00 XTZ" : "0.00")} {""} {outputToken.title} </Typography>
                </div>
              </Paper>
            </div>
          </Grid>
          <Grid item xs={12} sm={4} md={4} lg={3}>
            {(
              <CurrentSwaps swaps={swaps} onClick={maximize} />
            )}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Home;
