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
      position: "relative",
    },
    cardContendGrid: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexDirection: "row",
    },
    recieveAssetIcon: {
      width: "6.1vw",
    },
    rightArrow: {
      width: "1.67vw",
    },
    sendAssetsIcon: {
      width: "7.1vw",
    },
    cardHeaderTypography: {
      fontSize: "1.4vw",
    },
    cardHeader: {
      paddingTop: "2.22vw",
      paddingRight: "2.22vw",
      fontSize: "1vw",
      textAlign: "left",
    },
    cardAction: {
      justifyContent: "space-between",
    },
    input: {
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
    },
    cardContent: {
      "&.MuiCardContent-root": {
        paddingTop: "4vw",

        paddingLeft: "2.22vw",
      },
      flexDirection: "column",
      paddingTop: "10vw",
      alignItems: "center",
      display: "flex",
    },
    card: {
      minHeight: "32.57vw",
      minWidth: "63.88vw",
      borderRadius: "20px",
      zIndex: 5,
      background: "#FFFFFF",
      border: ".28vw solid #E1E1E1",
      "& .MuiCardContent-root": {
        padding: "8px",
      },
    },
    paper: {
      background: "#F9F9F9",
      minHeight: "146px",
      position: "relative",
      bottom: "10%",
      borderRadius: "20px",
      zIndex: -1,
      marginBottom: "20px",
    },
    root: {
      position: "relative",
      justifyContent: "center",
    },
  };
};

export default style;
