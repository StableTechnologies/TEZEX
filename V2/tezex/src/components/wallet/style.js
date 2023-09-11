// eslint-disable-next-line
const style = (theme) => {
  return {
    transactionStatus: {
      fontWeight: "500",
      fontSize: "1.66vw",
      lineHeight: "2.01vw",
    },

    spinnerBox: {
      position: "absolute",
      left: "3.38vw",
      top: "1.11vw",
    },
    spinner: {
      maxWidth: "1.85vw",
      maxHeight: "1.85vw",
      color: "#A1E3FF",
    },
    walletBox: {
      width: "20vw",
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },

    walletConnectedHeader: {
      logo: {
        minHeight: "1.39vw",
        maxHeight: "1.39vw",
      },
      background:
        "linear-gradient(92.04deg, rgba(171, 240, 255, 0.2) 4.41%, #F9FEFF 84.62%)",

      border: "0.035vw solid #C4C4C4",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",

      minHeight: "2.7vw",
      minWidth: "10.24vw",

      borderRadius: ".55vw",
      fontWeight: "500",
      fontSize: "1.11vw",
      lineHeight: "1.34vw",

      textTransform: "none",
    },

    transactDisabled: {
      "&.MuiButtonBase-root": {
        display: "flex",
      },

      "&.MuiButton-root.Mui-disabled": {
        color: "white",
      },

      display: "flex",
      fontFamily: "Inter",
      width: "100%",
      height: "4.16vw",
      background: "rgba(45, 45, 45, 0.5)",
      color: "white",
      borderRadius: "1.11vw",
      fontWeight: "500",
      fontSize: "1.66vw",
      lineHeight: "2.01vw",
      letterSpacing: "0.01em",
      textTransform: "none",
      "&:hover": {
        background: "rgba(45, 45, 45, 0.5)",
      },

      [theme.breakpoints.down("md")]: {
        borderRadius: "16px",
        fontWeight: "500",
        fontSize: "24px",
        lineHeight: "29px",
        width: "408px",
        height: "60px",
      },
    },
    transact: {
      "&.MuiButton-root.Mui-disabled": {
        color: "white",
      },

      fontFamily: "Inter",
      width: "100%",

      height: "4.16vw",
      backgroundColor: "#000",
      color: "white",

      borderRadius: "1.11vw",
      fontWeight: "500",
      fontSize: "1.66vw",
      lineHeight: "2.01vw",
      letterSpacing: "0.01em",
      textTransform: "none",
      "&:hover": {
        background: "#000",
      },
    },
    walletDisconnectedHeader: {
      "&.MuiButton-root.Mui-disabled": {
        color: "white",
      },

      "& .MuiButtonBase-root": {
        display: "block",
        flexWrap: "nowrap",
      },

      background: "#1E1E1E",
      color: "white",
      //minHeight: "2.7vw",
      //minWidth: "10.24vw",
      minWidth: "144px",

      border: "1px solid black",
      borderRadius: ".55vw",
      fontWeight: "500",
      // fontSize: "1.11vw",
      // lineHeight: "1.34vw",

      textTransform: "none",
      "&:hover": {
        background: "#000",
      },
    },
    walletDisconnectedCard: {
      "&.MuiButton-root.Mui-disabled": {
        color: "white",
      },

      opacity: "0.5",
      height: "56px",
      width: "100%",
      backgroundColor: "#000",
      color: "white",
      border: "1px solid black",
      borderRadius: "16px",
      fontWeight: "500",
      fontSize: "24px",
      lineHeight: "29px",
      letterSpacing: "0.01em",
      textTransform: "none",
      "&:hover": {
        background: "#000",
      },
    },
  };
};

export default style;
