import React, { useContext } from "react";
import { useHistory } from "react-router-dom";
import useStyles from "./style";
import Card from "@material-ui/core/Card";
import CardActions from "@material-ui/core/CardActions";
import CardContent from "@material-ui/core/CardContent";
import Button from "@material-ui/core/Button";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import ListItemText from "@material-ui/core/ListItemText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Dialog from "@material-ui/core/Dialog";
import PersonIcon from "@material-ui/icons/Person";
import AddIcon from "@material-ui/icons/Add";
import ArrowDropDownIcon from "@material-ui/icons/ArrowDropDown";
import ImportExportIcon from "@material-ui/icons/ImportExport";
import { blue } from "@material-ui/core/colors";
import PropTypes from "prop-types";
import Grid from "@material-ui/core/Grid";
import Paper from '@material-ui/core/Paper';

import tzlogo from "../../assets/tzlogo.svg";
import ethlogo from "../../assets/ethlogo.svg";
import sidelogo from "../../assets/sidelogo.svg";

import { TezexContext } from '../context/TezexContext';

const tokens = { XTZ: tzlogo, ETH: ethlogo };

function TokenSelectionDialog(props) {
  const classes = useStyles();

  const { onClose, selectedValue, open, side } = props;

  const handleClose = () => { onClose(selectedValue, side); };

  const handleListItemClick = (value) => { onClose(value, side); };

  return (
    <Dialog onClose={handleClose} aria-labelledby="simple-dialog-title" open={open}>
      <DialogTitle id="simple-dialog-title">
          {(side === 'input') && ('Select Input Token')}
          {(side === 'output') && ('Select Output Token')}
      </DialogTitle>
      <List>
        {Object.entries(tokens).map(([key, value]) => (
          <ListItem button onClick={() => handleListItemClick(key)} key={key}>
            <ListItemAvatar>
              <Avatar className={classes.avatar}>
                <img className={classes.logo} src={value} alt="Logo" />
              </Avatar>
            </ListItemAvatar>
            <ListItemText primary={key} />
          </ListItem>
        ))}
      </List>
    </Dialog>
  );
}

TokenSelectionDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  selectedValue: PropTypes.string.isRequired,
  side: PropTypes.string.isRequired
};

const Home = ({ swaps, clients, swapPairs, update }) => {
  const history = useHistory();
  const classes = useStyles();
  const globalContext = useContext(TezexContext);

  const [inputTokenModalOpen, setInputTokenModalOpen] = React.useState(false);
  const [outputTokenModalOpen, setOutputTokenModalOpen] = React.useState(false);
  const [inputToken, setInputToken] = React.useState('');
  const [outputToken, setOutputToken] = React.useState('');
  const [inputTokenAmount, setInputTokenAmount] = React.useState(0);
  const [outputTokenAmount, setOutputTokenAmount] = React.useState(0);

  const openInputTokenModal = () => { setInputTokenModalOpen(true); };
  const openOutputTokenModal = () => { setOutputTokenModalOpen(true); };

  const setToken = (value, side) => {
    setInputTokenModalOpen(false);
    setOutputTokenModalOpen(false);
    
    if (side === 'input') { setInputToken(value); }
    if (side === 'output') { setOutputToken(value); }
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
            <Card className={classes.root} variant="outlined">
              <CardContent>
                <Typography className={classes.title + " Element"}>Swap Tokens</Typography>
                <form>
                  <div className={classes.tokencontainer}>
                    <Typography color="textSecondary" variant="subtitle2">From</Typography>
                    <Typography  color="textSecondary">Balance</Typography>
                    <Button color="primary" onClick={openInputTokenModal}>
                      <Typography className = {classes.tokentext + " Element"} variant="subtitle1">
                        {" "}
                        <img className={classes.logo} src={tokens[inputToken]} />
                        {inputToken|| "Select Token"}
                      </Typography>{" "}
                      <ArrowDropDownIcon style={{ color: "#000" }} />
                    </Button>
                    <TokenSelectionDialog
                      selectedValue={inputToken}
                      open={inputTokenModalOpen}
                      onClose={setToken}
                      side='input'
                    />
                    <input type={'number'} className={classes.tokeninput} value={inputTokenAmount} onInput={(e) => setInputTokenAmount(e.target.value || 0)}></input>
                  </div>
                  <ImportExportIcon />
                  <div className={classes.tokencontainer}>
                    <Typography color="textSecondary" variant="subtitle2">To</Typography>
                    <Typography color="textSecondary">Balance</Typography>
                    <Button color="primary" onClick={openOutputTokenModal}>
                      <Typography className = {classes.tokentext + " Element"} variant="subtitle1">
                      {" "}
                        <img className={classes.logo} src={tokens[outputToken]} />
                        {outputToken|| "Select Token"}
                      </Typography>{" "}
                      <ArrowDropDownIcon style={{ color: "#000" }} />
                    </Button>
                    <TokenSelectionDialog
                      selectedValue={outputToken}
                      open={outputTokenModalOpen}
                      onClose={setToken}
                      side='output'
                    />
                    <input type={'number'} className={classes.tokeninput} value={outputTokenAmount} onInput={(e) => setOutputTokenAmount(e.target.value || 0)}></input>
                  </div>
                </form>
              </CardContent>
              <CardActions>
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
                      <Button size="large" className = {classes.connectwalletbutton + " Element"}>Connect Wallets</Button>
                  )}
              </CardActions>
            </Card>
            <Paper className = {classes.feepaper + " Element"}>
              <div>Swap fee        0.00</div>
              <div>Max network fee     0.00XTZ</div>
              <div>Minimum Received    0.00XTZ</div>
            </Paper>
            {/* {data} */}
          </div>
        </div>
      </Grid>
    </Grid>
  );
};

export default Home;
