// eslint-disable-next-line
const style = (theme) => {
  return {
    addLiquidityTokens: {
      "&.MuiBox-root": {
        width: "18.9vw",
        alignContent: "center",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
      },
      recieveAssetIcon: {
        width: "6.1vw",
      },
      rightArrow: {
        position: "relative",
        width: "1.67vw",
        bottom: "0.7vw",
      },
      sendAssetsIcon: {
        width: "7.1vw",
      },
    },
    slippageLabel: {
      typography: {
        fontSize: ".972vw",
        lineHeighr: "1.176vw",
      },
      box: {
        "&.MuiBox-root": {
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          alignContent: "center",
          height: "2vw",
        },
      },
      info: {
        icon: {
          height: ".925vw",
          width: ".925vw",
          paddingLeft: ".21vw",
        },
        tooltip: {
          color: "#1E1E1E",
          backgroundColor: "#FFFFFF",
          padding: "0px 0px 0px 0px ",
          fontSize: ".83vw",
          lineHeight: "1.25vw",

          display: "flex",
          alignItems: "center",

          textAlign: "center",
          justifyContent: "center",

          border: "0.069vw solid #E1E1E1",
          "&.MuiTooltip-tooltip": {
            minWidth: "17.22vw",
            maxWidth: "17.22vw",
            minHeight: "4.166vw",
            maxHeight: "4.166vw",
          },
        },
      },
    },
    icon: {
      padding: "0vw",
      height: "100%",
      //height: "4.33vw",
      //height: "62px",
      /*[theme.breakpoints.up("md")]: {

        height: "1.33vw",
      },
      [theme.breakpoints.down("md")]: {

        height: "62px",
      },
      */
    },

    box: {
      display: "flex",
      justifyContent: "center",

      minWidth: "2.22vw",
      minHeight: "2.22vw",
    },

    button: {
      /* minWidth: "2.22vw",
      minHeight: "2.22vw",
      padding: "0px 0px 0px 0px ",

      maxWidth: "2.22vw",
      maxHeight: "2.22vw",
      boxShadow: "0px 0.28vw 1.38vw rgba(181, 181, 181, 0.25)",
      background: "#FFFFFF",
      borderRadius: ".55vw",
*/
      [theme.breakpoints.down("md")]: {
        height: "32px",
        width: "32px",
      },
    },
  };
};
export default style;
