import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiButton-text': {
      '&:hover': {
        background: 'transparent',
      },
    },

    '& .MuiTypography-subtitle2': {
      fontSize: '0.875rem',

      '@media(max-width: 1024px)': {
        fontSize: '0.75rem',
      },
      '@media(max-width: 768px)': {
        fontSize: '0.875rem',
      },
      '@media(max-width: 376px)': {
        fontSize: '0.85rem',
      },
      '@media(max-width: 320px)': {
        fontSize: '0.7rem',
      },
    },
  },

  '& .MuiCardContent-root': {
    padding: '24px 31px 31px 31px',
    textAlign: 'left'
  },

  '@media(max-width: 501px)': {
    con: {
      flexDirection: "column-reverse",
    }
  },
  card: {
    background:' #FFFFFF',
    border: '1px solid #E1E1E1',
    borderRadius : (24),

  },

  title: {
    "&.Element": {
      marginTop: '1rem',
      padding: '0 2rem',
      fontSize: "1.5rem",
      fontStyle: "normal",
      fontWeight: "600",
      lineHeight: "29px",
      letterSpacing: "0em",
      textAlign: "left",
      color: '#000',
  }
  },
  tokeninput: {
    border: "0",
    textAlign: "right",
    fontSize: "18px",
  },
  tokenButton: {
    minWidth: "auto",
    textTransform: "none",
    fontSize: "18px",
    fontWeight: "500",
    lineHeight: "21.78px",
    padding: "0",
  },
  maxButton: {
    background: "#3391F6",
    color: "#fff",
    width: "53px",
    minWidth: "53px",
    height: "24px",
    textTransform: "uppercase",
    fontSize: "0.875",
    fontWeight: "500",
    lineHeight: "17px",
    margin: "0.5rem 1.5rem",
    '@media(max-width: 600px)': {
      minWidth: "43px",
      margin: "0.5rem 0.5rem",
    },
    '&:hover': {
      background: "#3391F6",
      color: "#fff",
  },
  },
  tokenContainer: {
    backgroundColor: "#F8F8F8",
    borderRadius: "8px",
    textAlign: "left",
    marginBottom: "1vh",
    padding:  ".5rem 1rem",
  },
  balContainer: {
    display: "flex",
    justifyContent: "space-between",
  },
  tokenDetails: {
    display: "flex",
    justifyContent: "space-between",
  },
  rightAlignText: {
    textAlign: "right",
  },
  swapIcon: {
    margin: '1.5rem 0rem',
    padding: (1),
    minWidth: "0",
    width: "40px",
    height: "40px",
    borderRadius: ".5rem",
    border: '0.5px solid #E5E5E5',
    cursor: "pointer",
  },

  sidelogocontainer: {
    maxHeight: "100%",
    '@media (max-width: 600px)': {
      display: "none"
    }
  },
  sidelogo: {
    maxHeight: "85vh",
  },
  logo: {
    marginRight: "8px",
    maxWidth: "24px",
    width: "24px",
    height: "24px",
    '& .MuiButton-root': {
      backgroundColor: "red"
    }
  },
  img: {
    width: "24px",
  },
  swapcontainer: {
    // marginTop: "3vh",
    textAlign: "left"
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
    background: "linear-gradient(180deg, rgba(224, 224, 224, 0.7) -26.98%, rgba(255, 255, 255, 0) 176.46%)",
    minWidth: "30vw",
    margin: "1.4vw",
    borderRadius: "24px",
    "& h3": {
      fontSize: "2.1vw",
    },
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
      width: "100%",
      height: "56px",
      backgroundColor: "#000",
      margin: "1.5rem 1rem",
      color: "white",
      border: "1px solid black",
      borderRadius: "8px",
      fontWeight: "500",
      fontSize: "1.5rem",
      lineHeight: "29px",
      letterSpacing: "0.01em",
      textTransform: 'none',
      '&:hover': {
        background: '#000',
    },
    '@media (max-width: 600px)': {
      margin: "1rem .2rem",
      fontSize: "1.2rem",
    }
  },
},
  disabled: {
    "&.Element": {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      border: "0",
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
      padding: "1.2rem",
      color: "#4f4f4f",
      border: "1px solid transparent",
    },
  },
  feeDetails: {
    display: "flex",
    justifyContent: "space-between",
    fontStyle: "normal",
    fontWeight: "500",
    lineHeight: "19px",
    "& .MuiTypography-body1": {
      fontSize: "1rem",
      '@media (max-width: 600px)': {
        fontSize: ".9rem",
      },
      '@media (max-width: 376px)': {
        fontSize: ".8rem",
      }
    }
  },

  loaderContainer: {
    display: "flex",
    justifyContent: "start",
    alignItems: "center",
    flexDirection: "row",
    background: "#E0EFFF",
    borderRadius: "8px",
    padding: '0 1rem',
  },
  loader: {
    width: "32px",
    height: "32px",
  },

  warning: {
    textAlign: "center",
    marginBottom: "-.4rem",
    height: "1.5rem",
    marginTop: "3vh",
    '@media (max-width: 600px)': {
      fontSize: "0.875rem"
    },
    '@media (max-width: 321px)': {
      height: "3rem",
    },
  },

  warningImg: {
    width: "1rem",
    height: "1rem",
    margin: "0 4px -3px",
  },
  maxSwapLimitCon: {
    height: "2rem",
  },

  maxSwapLimit: {
    color: "#FF4E4E",
    fontSize: "0.875rem",
    lineHeight: "17px",
    padding: "0.1rem 0",
    '@media (max-width: 321px)': {
      fontSize: "0.75rem",
    },
  },
  redWarningImg: {
    margin: "0 3px -3px 0",
  },
}));

export default useStyles;
