import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    // "& .MuiPaper-root": {
    //   borderRadius: "1.5rem",
    //   marginBottom: "15vw",
    // },
    "& .MuiDrawer-paperAnchorRight": {
       left: "auto",
       right: "0",
       top: "60px",
       width: "284px",
       height: "135px",
       margin: "0 .5rem",
       borderRadius: "4px",
     },
  },
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
    marginRight: ".3rem",
    marginLeft: ".3rem",
    border: "1px solid black",
    textTransform: "none",
    width: "max-content",
    height: "40px",
    fontSize: "16px",
    '@media (max-width: 768px)': {
      margin: ".2rem",
      height: "35px",
      // width: "164px",

    },
    '@media (max-width: 600px)': {
      marginTop: ".5rem",
      fontSize: "13px",
      width: "150px",
      height: "30px",
    },
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
      // height:" 135px",
      // width: "284px",
      // right: "2.8%",
      // top: "7%",
      borderRadius: "4px",
      height: "135px",
      width: "284px",
      left: "1141px",
      top: "65px",
      background: "linear-gradient(92.04deg, rgba(171, 240, 255, 0.4) 4.41%, #F9FEFF 84.62%)",
    },
  },
}));

export default useStyles;
