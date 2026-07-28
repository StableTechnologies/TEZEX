// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    addLiquidityTokens: {
      "&.MuiBox-root": {
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: `calc(1vw * ${scale})`,
      },

      sendAssetsContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: `calc(0.3vw * ${scale})`,
      },

      sendAssetsIconsWrapper: {
        display: "flex",
        alignItems: "center",
        position: "relative",
      },

      sendAssetIcon: {
        width: `calc(2.2vw * ${scale})`,
        height: `calc(2.2vw * ${scale})`,
        borderRadius: "50%",
        border: `calc(0.12vw * ${scale}) solid #E1E1E1`,
        backgroundColor: "white",
        position: "relative",
        zIndex: 2,
      },

      sendAssetIcon2: {
        width: `calc(2.2vw * ${scale})`,
        height: `calc(2.2vw * ${scale})`,
        borderRadius: "50%",
        border: `calc(0.12vw * ${scale}) solid #E1E1E1`,
        backgroundColor: "white",
        marginLeft: `calc(-0.7vw * ${scale})`,
        position: "relative",
        zIndex: 1,
      },

      sendAssetsLabel: {
        fontSize: `calc(0.85vw * ${scale})`,
        color: "#383636ff",
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: "nowrap",
      },

      rightArrow: {
        width: `calc(1.5vw * ${scale})`,
        height: `calc(1.5vw * ${scale})`,
        paddingBottom: `calc(0.3vw * ${scale})`,
      },

      receiveAssetContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: `calc(0.3vw * ${scale})`,
      },

      receiveAssetIcon: {
        width: `calc(2.2vw * ${scale})`,
        height: `calc(2.2vw * ${scale})`,
        borderRadius: "50%",
        border: `calc(0.12vw * ${scale}) solid #E1E1E1`,
        backgroundColor: "white",
      },

      receiveAssetLabel: {
        fontSize: `calc(0.85vw * ${scale})`,
        color: "#383636ff",
        fontWeight: 500,
        lineHeight: 1,
        whiteSpace: "nowrap",
      },
    },

    slippageLabel: {
      typography: {
        fontSize: `calc(.972vw * ${scale})`,
        lineHeighr: `calc(1.176vw * ${scale})`,
      },
      box: {
        "&.MuiBox-root": {
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          alignContent: "center",
          height: `calc(2vw * ${scale})`,
        },
      },
      info: {
        icon: {
          height: `calc(.925vw * ${scale})`,
          width: `calc(.925vw * ${scale})`,
          paddingLeft: `calc(.21vw * ${scale})`,
        },
        tooltip: {
          color: "#1E1E1E",
          backgroundColor: "#FFFFFF",
          padding: "0px 0px 0px 0px ",
          fontSize: `calc(.83vw * ${scale})`,
          lineHeight: `calc(1.25vw * ${scale})`,

          display: "flex",
          alignItems: "center",

          textAlign: "center",
          justifyContent: "center",

          border: "0.069vw solid #E1E1E1",
          "&.MuiTooltip-tooltip": {
            minWidth: `calc(17.22vw * ${scale})`,
            maxWidth: `calc(17.22vw * ${scale})`,
            minHeight: `calc(4.166vw * ${scale})`,
            maxHeight: `calc(4.166vw * ${scale})`,
          },
        },
      },
    },
    icon: {
      padding: 0,
      width: "18px",
      height: "18px",
      filter: "var(--tezex-logo-filter)",
      opacity: 0.82,
      transition: "transform 180ms ease, opacity 180ms ease",
    },

    box: {
      display: "flex",
      justifyContent: "center",

      minWidth: `calc(2.22vw * ${scale})`,
      minHeight: `calc(2.22vw * ${scale})`,
    },

    button: {
      minWidth: "44px",
      minHeight: "44px",
      width: "44px",
      height: "44px",
      padding: 0,
      boxShadow: "none",
      background: "transparent",
      border: 0,
      borderRadius: 0,
      "&:hover": {
        background: "transparent",
        "& img": { transform: "rotate(180deg)", opacity: 1 },
      },
      "&:focus-visible": {
        outline: "2px solid var(--tezex-line-strong)",
        outlineOffset: "-6px",
        borderRadius: "10px",
      },
      "&.Mui-disabled": {
        opacity: 0.35,
      },
    },
  };
};
export default style;
