// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    addLiquidityTokens: {
      "&.MuiBox-root": {
        width: `calc(18.9vw * ${scale})`,
        alignContent: "center",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
      },
      recieveAssetIcon: {
        width: `calc(6.1vw * ${scale})`,
      },
      rightArrow: {
        position: "relative",
        width: `calc(1.67vw * ${scale})`,
        bottom: `calc(0.7vw * ${scale})`,
      },
      sendAssetsIcon: {
        width: `calc(7.1vw * ${scale})`,
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
      padding: `calc(0vw * ${scale})`,
      height: `calc(1.33vw * ${scale})`,
    },

    box: {
      display: "flex",
      justifyContent: "center",

      minWidth: `calc(2.22vw * ${scale})`,
      minHeight: `calc(2.22vw * ${scale})`,
    },

    button: {
      minWidth: `calc(2.22vw * ${scale})`,
      minHeight: `calc(2.22vw * ${scale})`,
      padding: "0px 0px 0px 0px ",

      maxWidth: `calc(2.22vw * ${scale})`,
      maxHeight: `calc(2.22vw * ${scale})`,
      boxShadow: "0px 0.28vw 1.38vw rgba(181, 181, 181, 0.25)",
      background: "#FFFFFF",
      borderRadius: `calc(.55vw * ${scale})`,
    },
  };
};
export default style;
