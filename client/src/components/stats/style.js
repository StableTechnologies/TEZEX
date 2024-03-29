import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiTypography-h2": {
      fontSize: "2.5rem",
      fontStyle: "normal",
      fontWeight: "700",
      lineHeight: "48px",
      letterSpacing: "0.1rem",
      margin: "3rem 1rem 1rem",
      textAlign: "left",
      '@media(max-width: 600px)': {
        fontSize: "1.2rem",
        margin: ".3rem"
      },
    },
    "& .MuiTypography-h3": {
      fontSize: "1.5rem",
      fontStyle: "normal",
      fontWeight: "500",
      lineHeight: "29px",
      letterSpacing: "0.1rem",
      margin: "1rem 1rem 3rem",
      textAlign: "left",
      '@media(max-width: 600px)': {
        fontSize: "1rem",
        margin: ".3rem"
      },
    },
    "& .MuiTableCell-root": {
      "& :nth-last-of-type(1)": {
        border: "1px solid transparent",
      },
      fontSize: "1rem",
      '@media(max-width: 600px)': {
        fontSize: ".6rem",
        padding: "16px .3rem"
      },
    },
    "& .MuiTableCell-head ": {
      fontWeight: "600",
      color: "#828282",
      border: "0",
    },
  },

  statsCon: {
    width: "723px",
    marginLeft: "1rem",
    marginBottom: "5rem",
    '@media(max-width: 1024px)': {
      maxWidth: "723px",
    },
    '@media(min-width: 1024px)': {
      marginLeft: "3rem",
    },
  },

  imgArrow: {
    width: "22px",
    height: "22px",
    margin: "0 0rem -8px",
    '@media (max-width: 768px)': {
      width: "22px",
      height: "22px",
      marginBottom: "-6px",
    },
    '@media (max-width: 600px)': {
      width: "14px",
      height: "14px",
      marginBottom: "-4px",
    },
    '@media (max-width: 321px)': {
      width: "12px",
      height: "12px",
    }
  },
  img: {
    width: "22px",
    height: "22px",
    margin: "0 0rem -6px",
    '@media (max-width: 768px)': {
      width: "22px",
      height: "22px",
      marginBottom: "-6px",
    },
    '@media (max-width: 600px)': {
      width: "14px",
      height: "14px",
      marginBottom: "-4px",
    },
    '@media (max-width: 321px)': {
      width: "12px",
      height: "12px",
    }
  },
  currencyPairTop: {
    margin: "0rem 0 .8rem",
  },
  currencyPairBottom: {
    margin: ".8rem 0 0rem",
  },

  infoImg: {
    margin: "0 3px -3px",
    '@media (max-width: 600px)': {
      width: "10px",
      height: "10px",
      marginBottom: "-3px",
    }
  },
}));

export default useStyles;
