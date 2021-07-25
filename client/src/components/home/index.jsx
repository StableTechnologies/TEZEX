import React, { useContext, useEffect, useState } from "react";
import { calcSwapReturn, getCounterPair } from "../../library/util";
import { connectEthAccount, connectTezAccount, setupEthClient, shorten } from "../../util";
import { content, tokenWallets, tokens } from '../constants/index';

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
import SwapProgress from '../swapProgress';
import SwapStatus from '../swapStatus';
import SwapError from '../swapError';
import TextField from '@material-ui/core/TextField';
import { TezexContext } from '../context/TezexContext';
import TokenSelectionDialog from '../dialog';
import Typography from "@material-ui/core/Typography";
import { getSwapStat } from "../newSwap/util";
import { selectToken } from "../tokenPairs/index";
import sidelogo from "../../assets/sidelogo.svg";
import swapIcon from "../../assets/swapIcon.svg";
import { useHistory } from "react-router-dom";
import useStyles from "./style";

const Home = ({ swaps, updateSwaps, clients, swapPairs, update, setupEth, setupTez, genSwap }) => {
  const history = useHistory();
  const classes = useStyles();
  const globalContext = useContext(TezexContext);

  const [inputTokenModalOpen, setInputTokenModalOpen] = useState(false);
  const [outputTokenModalOpen, setOutputTokenModalOpen] = useState(false);

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [errModalOpen, setErrModalOpen] = useState(false);

  const [swapProgress, setSwapProgress] = useState(false);
  const [swapStatus, setSwapStatus] = useState(false);
  const [swapError, setSwapError] = useState(false);
  const [currentSwapView, setCurrentSwapView] = useState(false);

  const [inputToken, setInputToken] = useState(tokens[4]);
  const [outputToken, setOutputToken] = useState('');
  const [inputTokenAmount, setInputTokenAmount] = useState();
  const [outputTokenAmount, setOutputTokenAmount] = useState();

  const [wallet, setWallet] = useState('');
  const [err, setErr] = useState('');


  const [ethAccount, setEthAccount] = useState('');
  const [xtzAccount, setXtzAccount] = useState('');

  const [currentSwap, setCurrentSwap] = useState(false);
  const [swapStat, setSwapStat] = useState(undefined);
  const [ongoingSwaps, setOngoingSwaps] = useState([]);

  const openInputTokenModal = () => { setInputTokenModalOpen(true); }
  const openOutputTokenModal = () => { setOutputTokenModalOpen(true); }
  const openSwapProgress = () => { setSwapProgress(true); }
  const openWalletModal = () => { setWalletModalOpen(true); }
  const openErrModal = () => { setErrModalOpen(true); setWalletModalOpen(false); }

  const minimize = () => { setSwapProgress(false); setCurrentSwapView(true); }
  const maximize = () => { setSwapProgress(true); setCurrentSwapView(false); }

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

        return () => {
          clearInterval(timer);
        };

      } catch (e) { console.log(e); }
    }
  }, [currentSwap, clients]);

  let counterAsset, swapReturn, swapFee, minExpectedReturn, networkFees, minReceived, bal;

  if ((currentSwap && inputTokenAmount)
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
          .toFixed(6);
      }

      networkFees = swapStat.networkFees[counterAsset]
        .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
        .toFixed(6)

      minReceived = minExpectedReturn
        .div(10 ** swapPairs[currentSwap.pair][counterAsset].decimals)
        .toFixed(6);

      bal = swapStat.balances[currentSwap.asset]
        .div(10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals)
        .toFixed(6)
    } catch (error) { }
  }
  const generateSwap = async () => {
    const swap = {
      pair: currentSwap.pair,
      asset: currentSwap.asset,
      network: swapPairs[currentSwap.pair][currentSwap.asset].network,
      value: new BigNumber(inputTokenAmount)
        .multipliedBy(
          10 ** swapPairs[currentSwap.pair][currentSwap.asset].decimals
        )
        .toString(),
      minValue: minExpectedReturn.toString(),
    };
    const res = await genSwap(swap);
    if (!res) {
      setSwapProgress(false)
      setSwapError(true)
    }
  };

  const startSwap = () => {
    generateSwap();
    openSwapProgress();
    saveCurrentSwap(currentSwap);
  }
  const tryAgain = () => {
    setSwapError(false)
    generateSwap();
    openSwapProgress();
  }


  function saveCurrentSwap(swap) {
    // setOngoingSwaps([...ongoingSwaps, swap]);
    setOngoingSwaps(swap);
  }

  const openSwapStatus = () => {
    setSwapStatus(true);
    setCurrentSwapView(false);
    setSwapProgress(false);
  }
  const closeSwapStatus = () => {
    setSwapStatus(false)
    setInputTokenAmount("");
    setOutputTokenAmount(0.00);
    setOutputToken("");
    setCurrentSwap('');
    updateSwaps(undefined);
  }
  const openSwapError = () => {
    setSwapError(true);
    setCurrentSwapView(false);
    setSwapProgress(false);
  }
  const closeSwapError = () => {
    setSwapError(false)
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
  useEffect(() => {
    if (clients && clients['ethereum']) {
      globalContext.changeEthereumClient(clients.ethereum);
    }
    if (clients && clients['tezos']) {
      globalContext.changeTezosClient(clients.tezos);
    }
  }, [clients,])

  const setWalletType = async (value) => {
    const str = inputToken.title.toLowerCase();
    if (str.includes('tz')) {
      setupXtzAccount()
    }
    else {
      openWalletModal();
    }
  }

  const setEthWallet = (value) => {
    if (value.title === "Metamask") {
      setupEthAccount();
    }
  }

  const tokenPair = selectToken(inputToken.title);

  const toggleTokens = () => {

    setInputToken(outputToken);
    setOutputToken(inputToken);
  }

  useEffect(() => {
    if(tokenPair.indexOf(outputToken) === -1) {
      setOutputToken('');
      setOutputTokenAmount('');
      setCurrentSwap('');
    }
  }, [ inputToken, outputToken]);

  useEffect(() => {
    setOutputTokenAmount(minReceived)
  }, [minReceived]);


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

  return (
    <Grid container justify="center" className={classes.bodycontainer}>
      <Grid item className={classes.sidelogocontainer} xs={1}>
        {" "}
        <img className={classes.sidelogo} src={sidelogo} />
      </Grid>
      <Grid data-aos="zoom-in-up" item xs={11} justify="center" className={classes.swapcontainer}>
        <Grid container justify="space-evenly" className={classes.con}>
          <Grid item xs={0} md={2} lg={2}></Grid>
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
                        {bal &&
                          <Typography color="textSecondary" variant="subtitle2">Balance: {bal}</Typography>
                        }
                      </div>
                      <div className={classes.tokenDetails} >
                        <Button
                          endIcon={<KeyboardArrowDownIcon style={{ color: "#000" }} />}
                          size="small"
                          onClick={openInputTokenModal}
                          className={classes.tokenButton}
                        >
                          {inputToken && (
                            <img className={classes.logo} src={inputToken.logo} alt="logo" />
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

                    <Button className={classes.swapIcon} onClick={toggleTokens}>
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
                          value={outputTokenAmount}
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
                  {
                    (globalContext.tezosClient.account || globalContext.ethereumClient.account) ?
                      (
                        <>
                          {
                            (inputToken && outputToken) ?
                              (
                                <>
                                  {
                                    (inputTokenAmount && (minReceived > 0)) ?
                                      (
                                        <>
                                          <Button size="large" className={classes.connectwalletbutton + " Element"} onClick={startSwap} >swap tokens</Button>
                                          <SwapStatus swaps={swaps} open={swapStatus} onClose={closeSwapStatus} />
                                          <SwapError open={swapError} onClose={closeSwapError} onClick={tryAgain} />
                                          <SwapProgress swaps={swaps} open={swapProgress} onClose={minimize} completed={openSwapStatus} notCompleted={openSwapError}   />
                                        </>
                                      ) :
                                      (
                                        <Button size="large" className={`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}`} disabled>Enter Amount</Button>
                                      )
                                  }
                                </>
                              ) :
                              (
                                <Button size="large" className={`${classes.connectwalletbutton + " Element"} ${classes.disabled + " Element"}`} disabled>Select Token</Button>
                              )
                          }
                        </>
                      ) :
                      (
                        <>
                          <Button size="large" className={classes.connectwalletbutton + " Element"} onClick={setWalletType} >Connect Wallet</Button>
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
                        </>
                      )
                  }
                </CardActions>
              </Card>
              <Paper variant="outlined" className={classes.feepaper + " Element"} square>
                <div className={classes.feeDetails}>
                  <Typography>Swap Fee</Typography>
                  <Typography>{swapFee || 0.00} {""} {outputToken.title} </Typography>
                </div>
                <div className={classes.feeDetails}>
                  <Typography>Max Network Fee</Typography>
                  <Typography> {networkFees || 0.00} {""} {outputToken.title}</Typography>

                </div>
                <div className={classes.feeDetails}>
                  <Typography>Minimum Received</Typography>
                  <Typography> {minReceived || 0.00} {""} {outputToken.title} </Typography>
                </div>
              </Paper>
            </div>
          </Grid>
          <Grid item xs={12} sm={4} md={4} lg={3}>
            {currentSwapView && (
              <CurrentSwaps ongoingSwaps={ongoingSwaps} onClick={maximize} />
            )}
          </Grid>
        </Grid>
      </Grid>
    </Grid>
  );
};

export default Home;
