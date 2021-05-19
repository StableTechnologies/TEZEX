import React from "react";
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
const tokens = { XTZ: tzlogo, ETH: ethlogo };
function SimpleDialog(props) {
  const classes = useStyles();
  const { onClose, selectedValue, open } = props;

  const handleClose = () => {
    onClose(selectedValue);
  };

  const handleListItemClick = (value) => {
    onClose(value);
  };

  return (
    <Dialog
      onClose={handleClose}
      aria-labelledby="simple-dialog-title"
      open={open}
    >
      <DialogTitle id="simple-dialog-title">Set backup account</DialogTitle>
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

SimpleDialog.propTypes = {
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
  selectedValue: PropTypes.string.isRequired,
};
const Home = ({ swaps, clients, swapPairs, update }) => {
  const history = useHistory();
  const classes = useStyles();
  const [open, setOpen] = React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState(tokens[1]);
  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = (value) => {
    setOpen(false);
    setSelectedValue(value);
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
          {/* <MiniStat /> */}
          <div className={classes.swaps}>
            <Card className={classes.root} variant="outlined">
              <CardContent>
                <Typography className={classes.title + " Element"}>
                  Swap Tokens
                </Typography>
                <form>
                  <div className={classes.tokencontainer}>
                    <Typography color="textSecondary" variant="subtitle2">
                      From
                    </Typography>
                    {/* <Typography  color="textSecondary">
          Balance       
        </Typography> */}
                    <Button color="primary" onClick={handleClickOpen}>
                      <Typography className = {classes.tokentext + " Element"} variant="subtitle1">
                        {" "}
                        {
                          <img
                            className={classes.logo}
                            src={tokens[selectedValue]}
                          />
                        }
                        {selectedValue|| "Select Token"}
                      </Typography>{" "}
                      <ArrowDropDownIcon style={{ color: "#000" }} />
                    </Button>
                    <SimpleDialog
                      selectedValue={selectedValue}
                      open={open}
                      onClose={handleClose}
                    />
                    <input className={classes.tokeninput}></input>
                  </div>
                  <ImportExportIcon />
                  <div className={classes.tokencontainer}>
                    <Typography color="textSecondary" variant="subtitle2">
                      From
                    </Typography>
                    {/* <Typography  color="textSecondary">
          Balance       
        </Typography> */}
                    <Button color="primary" onClick={handleClickOpen}>
                      <Typography className = {classes.tokentext + " Element"} variant="subtitle1">
                      {" "}
                        {
                          <img
                            className={classes.logo}
                            src={tokens[selectedValue]}
                          />
                        }
                        {selectedValue|| "Select Token"}
                      </Typography>{" "}
                      <ArrowDropDownIcon style={{ color: "#000" }} />
                    </Button>
                    <SimpleDialog
                      selectedValue={selectedValue}
                      open={open}
                      onClose={handleClose}
                    />
                    <input className={classes.tokeninput}></input>
                  </div>
                </form>
              </CardContent>
              <CardActions>
                <Button size="large" className = {classes.connectwalletbutton + " Element"}>Connect Wallet</Button>
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
