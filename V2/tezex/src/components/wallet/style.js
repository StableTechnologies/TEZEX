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
      width: "100%",
      display: "flex",
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
    },
    headerButtonReset: {
      minWidth: 0,
      height: "36px",
      minHeight: "36px",
      maxHeight: "36px",
      padding: 0,
      borderRadius: "999px",
    },

    walletConnectedHeader: {
      logo: {
        minHeight: `calc(1.39vw * ${scale})`,
        maxHeight: `calc(1.39vw * ${scale})`,
      },
      color: "#000000",
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
    walletConnectedHeaderDark: {
      logo: {
        height: "18px",
        filter: "var(--tezex-wallet-logo-filter)",
      },
      color: "var(--tezex-text)",
      background: "var(--tezex-panel)",
      border: "1px solid var(--tezex-line)",
      display: "flex",
      gap: "10px",
      alignItems: "center",
      justifyContent: "center",
      height: "36px",
      minHeight: "36px",
      maxHeight: "36px",
      minWidth: "150px",
      padding: "0 18px",
      borderRadius: "999px",
      fontWeight: 600,
      fontSize: "13px",
      lineHeight: 1,
      textTransform: "none",
      transition: "border-color 160ms ease, background-color 160ms ease",
      "&:hover": {
        background: "var(--tezex-hover)",
        borderColor: "var(--tezex-line-strong)",
      },
      "&.Mui-focusVisible": {
        outline: "2px solid var(--tezex-text-secondary)",
        outlineOffset: "-3px",
      },
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
    transactDark: {
      width: "100%",
      minHeight: "54px",
      background: "var(--tezex-action)",
      color: "var(--tezex-action-text)",
      border: "1px solid var(--tezex-action)",
      borderRadius: "999px",
      fontFamily: "Inter",
      fontWeight: 700,
      fontSize: "15px",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      transition: "background-color 160ms ease, transform 160ms ease",
      "&:hover": {
        background: "var(--tezex-action-hover)",
        transform: "translateY(-1px)",
      },
    },
    transactDisabledDark: {
      width: "100%",
      minHeight: "54px",
      background: "var(--tezex-panel-subtle)",
      color: "var(--tezex-muted)",
      border: "1px solid var(--tezex-line)",
      borderRadius: "999px",
      fontFamily: "Inter",
      fontWeight: 700,
      fontSize: "15px",
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      "&.Mui-disabled": {
        color: "var(--tezex-muted)",
        background: "var(--tezex-panel-subtle)",
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
    walletDisconnectedHeaderDark: {
      height: "36px",
      minHeight: "36px",
      maxHeight: "36px",
      minWidth: "150px",
      padding: "0 18px",
      background: "transparent",
      color: "var(--tezex-text)",
      border: "1px solid var(--tezex-text)",
      borderRadius: "999px",
      fontWeight: 600,
      fontSize: "13px",
      lineHeight: 1,
      textTransform: "none",
      transition: "background-color 160ms ease, color 160ms ease",
      "&:hover": {
        background: "var(--tezex-action)",
        color: "var(--tezex-action-text)",
      },
      "&.Mui-focusVisible": {
        outline: "2px solid var(--tezex-text-secondary)",
        outlineOffset: "-3px",
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
