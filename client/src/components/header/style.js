import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDrawer-paperAnchorRight": {
       left: "auto",
       right: "0",
       top: "60px",
       width: "284px",
       height: "auto",
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
    fontSize: "1.125rem",
    fontWeight: "bold",
    backgroundColor: "white",
    width: "8vw",
    '@media (max-width: 768px)': {
      fontSize: "1rem",
    },
    '@media (max-width: 600px)': {
      fontSize: ".7rem",
      width: "auto"
    },
    "&:hover": {
      textDecoration: "underline",
    },
    "&:active": {
      textDecoration: "underline",
    },
  },

  btn: {
    "&.Element": {
    '@media (min-width: 1200px)': {
      marginRight: "1.3rem",
      marginLeft: "-2rem",
    },
    },
  },
  nav: {
    width: "100%",
  },
  walletbutton: {
    "&.Element": {
    background: "white",
    width: "160px",
    height: "40px",
    marginRight: ".3rem",
    marginLeft: ".3rem",
    border: "1px solid black",
    textTransform: "none",
    fontSize: "16px",
    '@media (max-width: 768px)': {
      margin: ".2rem",
      height: "35px",
    },
    '@media (max-width: 600px)': {
      marginTop: ".5rem",
      fontSize: "13px",
      width: "150px",
      height: "30px",
    },
    '@media (min-width: 1200px)': {
      margin: "0 .9375rem",
    }
  }
  },
  rightwalletbutton: {
    "&.Element": {
      '@media (min-width: 1200px)': {
        marginRight: "0",
        marginLeft: "1rem"
      },
    }
  },
  btnContent: {
    flexWrap: "nowrap"
  },
  ethButton: {
    "&.Element": {
      background:"linear-gradient(92.7deg, rgba(206, 143, 255, 0.4) 4.54%, #F9FEFF 98.49%)",
    }
  },
  tezButton: {
    "&.Element": {
      background: "linear-gradient(92.04deg, rgba(171, 240, 255, 0.4) 4.41%, #F9FEFF 84.62%)",
    }
  },
  tezStyle: {
    "&.Element": {
      position: "absolute",
      borderRadius: "4px",
      height: "auto",
      width: "284px",
      left: "1141px",
      top: "65px",
      background: "linear-gradient(92.04deg, rgba(171, 240, 255, 0.4) 4.41%, #F9FEFF 84.62%)",
    },
  },
}));

export default useStyles;
