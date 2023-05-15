// eslint-disable-next-line
const style = (theme) => {
  return {
    infoRecieve: {
      marginLeft: ".37vw",
      marginRight: ".37vw",
      fontSize: ".97vw",
      fontWeight: "700",
      lineHeight: "1.18vw",
    },
    infoText: {
      display: "inline-flex",
      fontSize: ".97vw",
      fontWeight: "400",
      lineHeight: "1.18vw",
    },
    infoGrid: {
      flexDirection: "row",
      display: "inline-flex",
      alignItems: "flex-start",
    },
    plusIcon: {
      width: ".97vw",
    },
    plusIconGrid: {
      position: "relative",
    },
    cardContendGrid: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexDirection: "row",
    },
    cardHeaderTypography: {
      fontSize: "1.4vw",
    },
    cardHeader: {
      paddingTop: "2.22vw",
      paddingBottom: "0vw",
      paddingRight: "2.22vw",
      fontSize: "1vw",
      textAlign: "left",
    },
    cardAction: {
      justifyContent: "space-between",

      "&.MuiCardActions-root": {
        paddingTop: "3.54vw",
      },
    },
    input: {
      width: "28.34vw",
      height: "8.61vw",
      "& .MuiFormControl-root": {
        width: "28.34vw",
        height: "8.61vw",
      },
    },
    slippageContainer: {
      display: "flex",
      width: "100%",
      alignItems: "center",
      flexDirection: "row",
      "& .MuiGrid2-root": {},
    },

    slippageComponent: {
      "& .MuiGrid2-root": {},
    },
    slippage: {
      text: {},
    },

    slippageInfo: {
      icon: {
        height: ".925vw",
        width: ".925vw",
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
    tokens: {
      display: "flex",
      width: "100%",
      paddingTop: "1.16vw",
      paddingLeft: "2.22vw",
    },
    cardContent: {
      "&.MuiCardContent-root": {
        paddingTop: "2.22vw",
        paddingBottom: "0vw",

        paddingLeft: "2.22vw",
        paddingRight: "2.22vw",
      },
      flexDirection: "column",
      paddingTop: "10vw",
      alignItems: "center",
      display: "flex",
    },
    card: {
      display: "block",
      minHeight: "32.57vw",
      maxHeight: "32.57vw",
      minWidth: "63.88vw",
      maxWidth: "63.88vw",
      borderRadius: "1.38vw",
      zIndex: 5,
      background: "#FFFFFF",
      border: ".069vw solid #E1E1E1",
      "&.MuiPaper-root": {
        boxShadow: "0",
      },
      "& .MuiCardContent-root": {},
    },
    root: {
      position: "relative",
      justifyContent: "center",
    },
  };
};

export default style;
