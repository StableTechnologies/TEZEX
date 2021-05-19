import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    maxWidth: "30vw", 
  },
  title: {
    "&.Element": {
    fontFamily: "Inter",
    fontSize: "1.1em",
    fontStyle: "normal",
    fontWeight: "500",
    lineHeight: "29px",
    letterSpacing: "0em",
    textAlign: "left",
  }
  },
  tokeninput: {
    border: "0",
  },
  tokencontainer: {
    backgroundColor: "#F8F8F8",
    marginBottom: "1vh"
  },
  bodycontainer: {
    maxHeight: "90vh"
  },
  sidelogocontainer: {
    maxHeight: "100%"
  },
  sidelogo: {
    maxHeight: "90vh"
  },
  swapcontainer: {
    marginTop: "4vh"
  },

  button: {
    color: "white",
    cursor: "pointer",
    padding: "0.4vw",
    background: "black",
    fontWeight: "bold",
    borderRadius: "0.4vw",
    fontSize: "1.2vw",
    outline: "none",
    border: "0.2vw black solid",
    "&:hover": {
      backgroundColor: "white",
      color: "black",
    },
  },
  swaps: {
    margin: "1.4vw",
    "& h3": {
      fontSize: "2.1vw",
    },
  },
  swap: {
    color: "white",
    width: "fit-content",
    border: "0.2vw black solid",
    margin: "3vw auto",
    padding: "0.5vw 2vw",
    lineHeight: "1.7vw",
    borderRadius: "2vw",
    backgroundColor: "black",
  },
  noSwap: {
    fontSize: "1.2vw",
  },
  error: {
    display: "flex",
    justifyContent: "space-around",
    backgroundColor: "red",
    padding: "0 0.5vw",
    borderRadius: "2vw",
    width: "50%",
    margin: "0 auto",
  },
  errorBtn: {
    height: "fit-content",
    padding: "0.5vw",
    borderRadius: "0.7vw",
    marginTop: "4%",
    cursor: "pointer",
    background: "white",
    borderStyle: "none",
    fontSize: "1vw",
  },
  connectwalletbutton: {
    "&.Element": {
    color: "white",
    backgroundColor: "black",
    border: "1px solid black",
  width: "100%"}
  },
  tokentext: {
    "&.Element": {
      color: "#000",
      fontSize: "1em",
      textTransform: "capitalize",
},
},
  feepaper: {
    "&.Element": {
    marginTop: "4vh"
  },
},
}));

export default useStyles;
