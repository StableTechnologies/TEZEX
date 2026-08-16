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
    drawerAccountButtonReset: {
      width: "100%",
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
      color: "var(--tezex-text)",
      background: "var(--tezex-panel)",
      border: "1px solid var(--tezex-line)",
      display: "flex",
      gap: "10px",
      alignItems: "center",
      justifyContent: "flex-start",
      height: "36px",
      minHeight: "36px",
      maxHeight: "36px",
      minWidth: "188px",
      padding: "0 14px",
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
    walletConnectedDrawer: {
      width: "100%",
      minWidth: 0,
      padding: "0 12px",
    },
    walletLogo: {
      width: "18px",
      height: "18px",
      flexShrink: 0,
      filter: "var(--tezex-wallet-logo-filter)",
    },
    walletAddress: {
      minWidth: 0,
      flex: 1,
      overflow: "hidden",
      color: "inherit",
      fontFamily: '"Red Hat Mono", monospace',
      fontSize: "12px",
      fontWeight: 600,
      lineHeight: 1,
      textAlign: "left",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    walletAddressDrawer: {
      fontSize: "11px",
    },
    accountChevron: {
      width: "6px",
      height: "6px",
      flexShrink: 0,
      borderRight: "1px solid currentColor",
      borderBottom: "1px solid currentColor",
      transition: "transform 160ms ease",
      "@media (prefers-reduced-motion: reduce)": { transition: "none" },
    },
    accountPopover: {
      width: "min(300px, calc(100vw - 32px))",
      marginTop: "8px",
      overflow: "hidden",
      color: "var(--tezex-text)",
      background: "var(--tezex-panel)",
      border: "1px solid var(--tezex-line)",
      borderRadius: "18px",
      boxShadow: "var(--tezex-menu-shadow)",
    },
    accountHeader: {
      padding: "16px",
      background: "var(--tezex-panel-subtle)",
      borderBottom: "1px solid var(--tezex-line-soft)",
    },
    accountLabel: {
      marginBottom: "9px",
      color: "var(--tezex-muted)",
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.15em",
    },
    accountAddressRow: {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    },
    accountFullAddress: {
      minWidth: 0,
      flex: 1,
      overflowWrap: "anywhere",
      color: "var(--tezex-text)",
      fontFamily: '"Red Hat Mono", monospace',
      fontSize: "11px",
      fontWeight: 500,
      lineHeight: 1.45,
    },
    copyAddressButton: {
      minWidth: "auto",
      padding: "5px 8px",
      flexShrink: 0,
      color: "var(--tezex-muted)",
      border: "1px solid var(--tezex-line)",
      borderRadius: "999px",
      fontSize: "10px",
      fontWeight: 700,
      lineHeight: 1,
      textTransform: "none",
      "&:hover": {
        color: "var(--tezex-text)",
        background: "var(--tezex-hover)",
      },
    },
    accountActions: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
    },
    accountAction: {
      minHeight: "46px",
      padding: "0 14px",
      color: "var(--tezex-text-secondary)",
      borderRadius: 0,
      fontSize: "11px",
      fontWeight: 700,
      textTransform: "none",
      "&:hover": {
        color: "var(--tezex-text)",
        background: "var(--tezex-hover)",
      },
      "&:focus-visible": {
        outline: "2px solid var(--tezex-text-secondary)",
        outlineOffset: "-3px",
      },
    },
    disconnectAction: {
      borderLeft: "1px solid var(--tezex-line-soft)",
      "&:hover": {
        color: "#c94c4c",
        background: "rgba(201, 76, 76, 0.08)",
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
