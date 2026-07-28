// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    drawer: {
      width: "min(88vw, 360px)",
      flexShrink: 0,
      "& .MuiDrawer-paper": {
        width: "min(88vw, 360px)",
        boxSizing: "border-box",
        backgroundColor: "var(--tezex-panel)",
        color: "var(--tezex-text)",
        boxShadow: "var(--tezex-menu-shadow)",
        borderLeft: "1px solid var(--tezex-line)",
      },
    },
    drawerClosed: {
      width: 70,
      "& .MuiDrawer-paper": {
        width: 70,
      },
    },
    menuButton: {
      padding: 0,
      gap: 1,
      color: "var(--tezex-text)",
    },
    homeItem: {
      paddingTop: "8px",
    },
    utilityItem: {
      padding: "6px 16px 14px",
    },
    utilityPanel: {
      width: "100%",
      padding: "14px",
      background: "var(--tezex-panel-subtle)",
      border: "1px solid var(--tezex-line)",
      borderRadius: "16px",
    },
    utilityLabel: {
      marginBottom: "10px",
      color: "var(--tezex-muted)",
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.16em",
    },
    walletControl: {
      width: "100%",
      "& .MuiButtonBase-root": { width: "100%" },
    },
    listItem: {
      backgroundColor: "var(--tezex-panel)",
      "& .MuiButtonBase-root": {
        color: "var(--tezex-muted)",
        "&:hover": {
          backgroundColor: "var(--tezex-hover)",
          color: "var(--tezex-text)",
        },
        "&.Mui-selected": {
          backgroundColor: "var(--tezex-hover)",
          color: "var(--tezex-text)",
        },
      },
    },
    menuItemClosed: {
      justifyContent: "center",
    },
    menuItemOpened: {
      justifyContent: "flex-start",
    },
    listItemText: {
      textAlign: "right",
      "& .MuiTypography-root": {
        fontSize: "14px",
        fontWeight: 600,
      },
    },
    swapButton: {
      paddingLeft: 4,
    },
    swapText: {
      textAlign: "right",
      paddingRight: 4,
      "& .MuiTypography-root": {
        fontSize: "14px",
      },
    },
    liquidityButton: {
      paddingLeft: 4,
    },
    liquidityText: {
      textAlign: "right",
      paddingRight: 4,
      "& .MuiTypography-root": {
        fontSize: "14px",
      },
    },
    nestedButton: {
      paddingLeft: 6,
    },
    nestedText: {
      textAlign: "right",
      paddingRight: 7,
      "& .MuiTypography-root": {
        fontSize: "13px",
      },
    },
    logo: {
      display: "none",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      filter: "var(--tezex-logo-filter)",
      "@media (max-width: 900px) and (orientation: landscape)": {
        display: "flex",
      },
    },
    disconnectItem: {
      "& .MuiButtonBase-root": {
        color: "#FF4B55",
        borderTop: "1px solid rgba(255, 75, 85, 0.2)",
        "&:hover": {
          backgroundColor: "rgba(255, 75, 85, 0.08)",
          color: "#FF6B74",
        },
        "&.Mui-selected": {
          backgroundColor: "rgba(255, 75, 85, 0.12)",
          color: "#FF6B74",
        },
      },
    },
  };
};

export default style;
