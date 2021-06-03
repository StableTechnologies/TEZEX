import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    width: "440px",
    borderRadius: '24px !important',
    '& .MuiCardContent-root': {
      padding: '24px 31px 31px 31px',
      textAlign: 'left'
    },
    '& .MuiCardActions-root': {
      padding: '0 24px 32px 24px'
    }
  },
  title: {
    "&.Element": {
      fontFamily: "Inter",
      fontSize: "24px",
      fontStyle: "normal",
      fontWeight: "500",
      lineHeight: "29px",
      letterSpacing: "0em",
      textAlign: "left",
      fontWeight: 600,
      marginBottom: '16px'
    }
  },
  changeBtn: {
    margin: '23px 0',
    padding: 8,
    minWidth: 0,
    borderRadius: 8,
    border: '0.5px solid #E5E5E5'
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
    background: 'linear-gradient(180deg, rgba(224, 224, 224, 0.7) -26.98%, rgba(255, 255, 255, 0) 176.46%)',
    borderRadius: 24,
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
  btnContainer: {
    padding: '0 24px'
  },
  connectwalletbutton: {
    "&.Element": {
        color: "white",
        backgroundColor: "black",
        border: "1px solid black",
        width: "100%",
        height: '56px',
        borderRadius: 8,
        fontFamily: 'Inter',
        fontWeight: 500,
        fontSize: 24,
        textTransform: 'initial',
    }
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
      background: 'transparent',
      boxShadow: 'none',
      padding: '15px 24px'
    },
  },
  feeItem: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: '24px',
    color: '#000000',
  },
  feeItemLabel: {
    fontWeight: 500,
  },
  feeItemValue: {
    fontWeight: 300,
  }
}));

export default useStyles;
