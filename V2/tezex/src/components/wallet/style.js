// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    transactionStatus: {
      fontWeight: "500",
      fontSize: `calc(1.66vw * ${scale})`,
      lineHeight: `calc(2.01vw * ${scale})`,
    },

    spinnerBox: {
      position: "absolute",
      left: `calc(3.38vw * ${scale})`,
      top: `calc(1.11vw * ${scale})`,
    },
    spinner: {
      maxWidth: `calc(1.85vw * ${scale})`,
      maxHeight: `calc(1.85vw * ${scale})`,
      color: "#A1E3FF",
    },
    walletBox: {
      width: `calc(20vw * ${scale})`,
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },

    walletConnectedHeader: {
      logo: {
        minHeight: `calc(1.39vw * ${scale})`,
        maxHeight: `calc(1.39vw * ${scale})`,
      },
      background:
        "linear-gradient(92.04deg, rgba(171, 240, 255, 0.2) 4.41%, #F9FEFF 84.62%)",

      border: "0.035vw solid #C4C4C4",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-around",

      minHeight: `calc(2.7vw * ${scale})`,
      minWidth: `calc(10.24vw * ${scale})`,

      borderRadius: `calc(.55vw * ${scale})`,
      fontWeight: "500",
      fontSize: `calc(1.11vw * ${scale})`,
      lineHeight: `calc(1.34vw * ${scale})`,

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
      height: `calc(4.16vw * ${scale})`,
      background: "rgba(45, 45, 45, 0.5)",
      color: "white",
      borderRadius: `calc(1.11vw * ${scale})`,
      fontWeight: "500",
      fontSize: `calc(1.66vw * ${scale})`,
      lineHeight: `calc(2.01vw * ${scale})`,
      letterSpacing: "0.01em",
      textTransform: "none",
      "&:hover": {
        background: "rgba(45, 45, 45, 0.5)",
      },
    },
    transact: {
      "&.MuiButton-root.Mui-disabled": {
        color: "white",
      },

      fontFamily: "Inter",
      width: "100%",

      height: `calc(4.16vw * ${scale})`,
      backgroundColor: "#000",
      color: "white",

      borderRadius: `calc(1.11vw * ${scale})`,
      fontWeight: "500",
      fontSize: `calc(1.66vw * ${scale})`,
      lineHeight: `calc(2.01vw * ${scale})`,
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
      background: "#1E1E1E",
      color: "white",
      minHeight: `calc(2.7vw * ${scale})`,
      minWidth: `calc(10.24vw * ${scale})`,

      border: "1px solid black",
      borderRadius: `calc(.55vw * ${scale})`,
      fontWeight: "500",
      fontSize: `calc(1.11vw * ${scale})`,
      lineHeight: `calc(1.34vw * ${scale})`,

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
