import React, { useContext, useState } from "react";
import { useHistory } from "react-router-dom";
import useStyles from "./style";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardHeader from '@material-ui/core/CardHeader';
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import TextField from '@material-ui/core/TextField';
import Typography from "@material-ui/core/Typography";

import PersonIcon from "@material-ui/icons/Person";
import AddIcon from "@material-ui/icons/Add";
import { blue } from "@material-ui/core/colors";
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import ImportExportIcon from "@material-ui/icons/ImportExport";

import Grid from "@material-ui/core/Grid";
import Paper from '@material-ui/core/Paper';

import TokenSelector from '../TokenSelector';
import TokenSelectionDialog from '../TokenSelectionDialog';

import sidelogo from "../../assets/sidelogo.svg";
import SwapIcon from '../../assets/swap-icon.svg';
import { TezexContext } from '../context/TezexContext';
import TokenSelectionDialog from '../dialog/TokenSelectionDialog';

import  {content, tokens, tokenWallets}  from '../constants/index';

const Home = ({ swaps, clients, swapPairs, update }) => {
  const history = useHistory();
  const classes = useStyles();
  const globalContext = useContext(TezexContext);

  const [isOpenModal, setIsOpenModal] = useState(false);
  const [inputToken, setInputToken] = useState({});
  const [outputToken, setOutputToken] = useState({});
  const [inputTokenAmount, setInputTokenAmount] = useState(0);
  const [outputTokenAmount, setOutputTokenAmount] = useState(0);
  const [selectedModal, setSelectModal] = useState('')

  const openTokenModal = (side) => {
    setSelectModal(side);
    setIsOpenModal(true);
  }

  // const openInputTokenModal = () => { setInputTokenModalOpen(true); };
  // const openOutputTokenModal = () => { setOutputTokenModalOpen(true); };

  const setToken = (value, side) => {   
    if (side === 'Input') {
      setInputToken(value);
    } else {
      setOutputToken(value);
    }
    setIsOpenModal(false);

/*  const [inputTokenModalOpen, setInputTokenModalOpen] = React.useState(false);
  const [outputTokenModalOpen, setOutputTokenModalOpen] = React.useState(false);
  const [walletModalOpen, setWalletModalOpen] = React.useState(false);
  const [inputToken, setInputToken] = React.useState('');
  const [outputToken, setOutputToken] = React.useState('');
  const [wallet, setWallet] = React.useState('');
  const [inputTokenAmount, setInputTokenAmount] = React.useState(0);
  const [outputTokenAmount, setOutputTokenAmount] = React.useState(0);

  const openInputTokenModal = () => { setInputTokenModalOpen(true); };
  const openOutputTokenModal = () => { setOutputTokenModalOpen(true); };
  const openWalletModal = () => { setWalletModalOpen(true); };

  const setToken = (value, side) => {
    setInputTokenModalOpen(false);
    setOutputTokenModalOpen(false);
    setWalletModalOpen(false);

    if (side === 'input') { setInputToken(value); }
    if (side === 'output') { setOutputToken(value); }
    if (side === 'wallet') { setWallet(value); }*/
  };


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

  const modalSelectedValue = selectedModal === 'Input' ? inputToken : outputToken;
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
    <Grid container className = {classes.bodycontainer}>
      <Grid item className = {classes.sidelogoconainer} xs={1}>
        {" "}
        <img className = {classes.sidelogo} src={sidelogo} />
      </Grid>
      <Grid container item xs={10} justify = "center">
        <div className = {classes.swapcontainer}>
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
                  <TokenSelector
                    label='From'
                    token={inputToken}
                    openModal={() => openTokenModal('Input')}
                  />
                  <Button className={classes.changeBtn}>
                    <img src={SwapIcon} />
                  </Button>
                  <TokenSelector
                    label='To'
                    token={outputToken}
                    openModal={() => openTokenModal('Output')}
                  />
                    {/*<div className={classes.tokenContainer + " Element"}>
                    <Typography color="textSecondary" variant="subtitle2">From</Typography>
                    <div className={classes.tokenDetails} >
                      <Button
                        endIcon={ <KeyboardArrowDownIcon style={{ color: "#000" }} />}
                        size="small"
                        onClick={openInputTokenModal}
                        className={classes.tokenButton}
                      >
                        {inputToken && (
                          <img className={classes.logo} src={tokens[inputToken]} />
                        )}
                        {inputToken || "Select Token"}
                      </Button>
                      <TextField
                        autoFocus
                        margin="dense"
                        id="inputTokenValue"
                        type="text"
                        placeholder="0.00"
                        onInput={(e) => setInputTokenAmount(e.target.value)}
                        className={classes.tokenValue }
                        inputProps={{style: { textAlign: 'right' }}}
                        InputProps={{ disableUnderline: true}}
                      />
                    </div>

                    <TokenSelectionDialog
                        selectedValue={inputToken}
                        open={inputTokenModalOpen}
                        onClose={setToken}
                        side='input'
                        lists={tokens}
                    />
                  </div>

                  <div className={classes.swapIcon}> <ImportExportIcon /></div>


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
                          <img className={classes.logo} src={tokens[outputToken]} />
                        )}
                        {outputToken || "Select Token"}
                      </Button>
                      <TextField
                        autoFocus
                        margin="dense"
                        id="outputTokenValue"
                        type="text"
                        placeholder="0.00"
                        onInput={(e) => setOutputTokenAmount(e.target.value )}
                        inputProps={{className: classes.tokenValue, pattern: "^[0-9]*[.,]?[0-9]*$", inputMode:"decimal"}}
                        InputProps={{ disableUnderline: true}}
                      />
                    </div>
                    <TokenSelectionDialog
                        selectedValue={outputToken}
                        open={outputTokenModalOpen}
                        onClose={setToken}
                        side='output'
                        lists={tokens}
                    />
                  </div>*/}
                </form>
              </CardContent>
              <CardActions className={classes.btnContainer}>
                  {globalContext.ethereumClient.account && globalContext.tezosClient.account && (
                      <Button size="large" className = {classes.connectwalletbutton + " Element"}>Swap</Button>
                  )}
                  {globalContext.ethereumClient.account && (
                      <Button size="large" className = {classes.connectwalletbutton + " Element"}>Connect Tezos Wallet</Button>
                  )}
                  {globalContext.tezosClient.account && (
                      <Button size="large" className = {classes.connectwalletbutton + " Element"}>Connect Ethereum Wallet</Button>
                  )}
                  {!globalContext.ethereumClient.account && !globalContext.tezosClient.account && (
                    <>
                      <Button size="large" className = {classes.connectwalletbutton + " Element"} onClick={openWalletModal} >Connect Wallet</Button>
                       <TokenSelectionDialog
                        selectedValue={wallet}
                        open={walletModalOpen}
                        onClose={setToken}
                        side='wallet'
                        lists={tokenWallets}
                        content = {content.connectWallet}
                        closeBtn
                      />
                    </>
                  )}
              </CardActions>
            </Card>
            <Paper className = {classes.feepaper + " Element"}>
              <div className={classes.feeItem}>
                <span className={classes.feeItemLabel}>Swap fee</span>
                <span className={classes.feeItemValue}>0.15%</span>
              </div>
              <div className={classes.feeItem}>
                <span className={classes.feeItemLabel}>Max network fee</span>
                <span className={classes.feeItemValue}>0.00XTZ</span>
              </div>
              <div className={classes.feeItem}>
                <span className={classes.feeItemLabel}>Minimum Received</span>
                <span className={classes.feeItemValue}>0.00XTZ</span>
              </div>
            </Paper>
            <TokenSelectionDialog
              selectedValue={modalSelectedValue}
              open={isOpenModal}
              onClose={() => setIsOpenModal(false)}
              onSelect={setToken}
              side={selectedModal}
            />
          </div>
        </div>
      </Grid>
    </Grid>
  );
};

export default Home;
