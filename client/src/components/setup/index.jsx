import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import React from "react";
import logo from "../../tezexbridge.png";
import useStyles from "./style";

const Setup = ({ init }) => {
  const setup = (e) => {
    e.preventDefault();
    init();
  };

  const [open, setOpen] = React.useState(true);

  const classes = useStyles();

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <div className={classes.container}>
      <div className={classes.intro}>
        <Dialog
          open={open}
          onClose={handleClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          disableBackdropClick
          disableEscapeKeyDown
        >
          <DialogTitle
            id="alert-dialog-title"
            style={{
              fontSize: "1.4vw",
              color: "black",
              fontWeight: "bolder",
              textAlign: "center",
              paddingTop: "1vw",
            }}
            disableTypography
          >
            Warning!
          </DialogTitle>
          <DialogContent>
            <DialogContentText
              id="alert-dialog-description"
              style={{ fontSize: "1vw", color: "black" }}
            >
              <strong>Audits: None.</strong>
              <br />
              <br /> While the initial creators of the TEZEX Bridge protocol
              have made reasonable efforts to attempt to ensure the security of
              the contracts and platform, including soliciting reviews from
              friends, nothing approaching the rigor of a formal audit has been
              conducted at this time. <br />
              We <strong>STRONGLY</strong> urge caution to anyone who chooses to
              engage with these contracts and platform.
            </DialogContentText>
          </DialogContent>
          <DialogActions
            style={{ justifyContent: "center", marginBottom: "1vw" }}
          >
            <Button onClick={handleClose} variant="contained" color="primary">
              I Understand
            </Button>
          </DialogActions>
        </Dialog>
        <img className={classes.logo} src={logo} alt="Logo" />
        <p>
          Truly Decentralized Cross-Chain Atomic Swaps for Ethereum and Tezos
        </p>
        <p>Network : Testnet [Goerli, Edonet] </p>
      </div>
      <button onClick={setup}>Connect to Tezos and Ethereum Wallets</button>
    </div>
  );
};

export default Setup;
