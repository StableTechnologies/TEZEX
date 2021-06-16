import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  header: {
    display: "flex",
    fontSize: "1.5vw"
  },
  account: {
    padding: "0.6vw",
    border: "0.2vw black solid",
    borderRadius: "2vw",
    height: "fit-content",
    width: "28vw",
    marginTop: "1vw",
  },
  button: {
    color: "black",
    border: "0",
    cursor: "pointer",
    margin: "1.5vw 0.7vw",
    // outline: "none",
    // padding: "0.4vw 0.2vw",
    fontSize: "1.2vw",
    fontWeight: "bold",
    // borderRadius: "0.5vw",
    backgroundColor: "white",
    width: "8vw",
    "&:hover": {
      textDecoration: "underline",
      // backgroundColor: "white",
      // color: "black",
    },
  },
  // logo: {
  //   width: "36vw",
  //   display: "block",
  //   margin: "1vw auto",
  //   padding: "0 4vw",
  // },
  nav: {
    width: "100%",
  },
  walletbutton: {
    "&.Element": {
    background: "white",
    border: "1px solid black",
    textTransform: "none",
  }
  },
  ethButton: {
    "&.Element": {
      background:"linear-gradient(92.7deg, rgba(206, 143, 255, 0.4) 4.54%, #F9FEFF 98.49%)",
      // background:"linear-gradient(#CE8FFF 4%, #F9FEFF 100%)",
    }
  },
  tezButton: {
    "&.Element": {
      background: "linear-gradient(92.04deg, rgba(171, 240, 255, 0.4) 4.41%, #F9FEFF 84.62%)",
      // background:"linear-gradient(#ABF0FF 4%, #F9FEFF 100%)",
    }
  },
  tezStyle: {
    "&.Element": {
      position: "absolute",
      height:" 135px",
      width: "284px",
      borderRadius: "4px",
      right: "2.8%",
      top: "7%",
    },
  },
}));

export default useStyles;
