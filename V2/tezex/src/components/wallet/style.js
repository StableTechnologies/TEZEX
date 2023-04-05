// eslint-disable-next-line
const style = (theme) => {
  return {
    transactionStatus: {
      fontWeight: "500",
      fontSize: "1.66vw",
      lineHeight: "2.01vw",
    },

    spinner: {
      maxWidth: "1.85vw",
      maxHeight: "1.85vw",
      color: "#A1E3FF",
    },
    walletBox: {
      width: "100%",
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },

    walletConnectedHeader: {
      background:
        "linear-gradient(92.04deg, rgba(171, 240, 255, 0.2) 4.41%, #F9FEFF 84.62%)",

      border: "0.5px solid #C4C4C4",
      borderRadius: "4px",
      display: "inline-flex",
      alignItems: "center",
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

      background: "rgba(45, 45, 45, 0.5)",
      color: "white",
      borderRadius: "16px",
      fontWeight: "500",
      fontSize: "1.66vw",
      lineHeight: "2.01vw",
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

      backgroundColor: "#000",
      color: "white",
      border: "1px solid black",
      borderRadius: "16px",
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
      background: "#1E1E1E",
      color: "white",
      minHeight: "2.7vw",
      minWidth: "10.24vw",

      border: "1px solid black",
      borderRadius: ".55vw",
      fontWeight: "500",
      fontSize: "1.11vw",
      lineHeight: "1.34vw",

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
