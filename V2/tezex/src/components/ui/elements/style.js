// eslint-disable-next-line
const style = (theme) => {
  return {
    slippageLabel: {
      typography: {
        marginLeft: "1vw",
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
      padding: ".2vw",
      width: "100%",
      height: "100%",
    },

    box: {
      display: "flex",
      justifyContent: "center",

      minWidth: "2.2vw",
      minHeight: "2.2vw",
    },

    button: {
      minWidth: "2.4vw",
      minHeight: "2.4vw",

      maxWidth: "2.4vw",
      maxHeight: "2.4vw",
      boxShadow: "0px 0.28vw 1.38vw rgba(181, 181, 181, 0.25)",
      background: "#FFFFFF",
      borderRadius: ".55vw",
    },
  };
};
export default style;
