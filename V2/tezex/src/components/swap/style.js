// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    paperTypography: {
      marginLeft: `calc(1vw * ${scale})`,
      fontSize: `calc(.972vw * ${scale})`,
      lineHeighr: `calc(1.176vw * ${scale})`,
    },
    paperBox: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: `calc(5.2vw * ${scale})`,
      paddingLeft: `calc(1.6vw * ${scale})`,
      paddingRight: `calc(1.11vw * ${scale})`,
    },
    paper: {
      position: "absolute",
      top: "89.4%",
      zindex: "-9",

      "&.MuiPaper-root": {
        boxShadow: "0",
        border: "0px",
      },
      borderRadius: `calc(1.38vw * ${scale})`,
      background: "#F9F9F9",

      width: `calc(30.5vw * ${scale})`,
      height: `calc(10.14vw * ${scale})`,
    },
    transact: {
      position: "absolute",
      top: "77.5%",
      width: `calc(28.33vw * ${scale})`,
      justifyContent: "center",
    },
    swapToggle: {
      display: "flex",
      position: "absolute",
      top: "38.3%",
      zIndex: 5,
      height: `calc(1vw * ${scale})`,
    },
    cardHeaderTypography: {
      fontSize: `calc(1.4vw * ${scale})`,
    },
    cardHeader: {
      paddingTop: `calc(1.59vw * ${scale})`,
      paddingBottom: `calc(0vw * ${scale})`,
      paddingLeft: `calc(1.59vw * ${scale})`,
      fontSize: `calc(1vw * ${scale})`,
      textAlign: "left",
    },
    input1: {
      position: "absolute",
      top: "16.87%",
      "& .MuiFormControl-root": {
        width: `calc(28.34vw * ${scale})`,
        height: `calc(6.94vw * ${scale})`,
      },
    },
    input2: {
      position: "absolute",
      top: "43.27%",
      "& .MuiFormControl-root": {
        width: `calc(28.34vw * ${scale})`,
        height: `calc(6.94vw * ${scale})`,
      },
    },
    cardcontent: {
      "&.MuiCardContent-root": {},
      "& .MuiFormControl-root": {
        width: `calc(28.34vw * ${scale})`,
        height: `calc(6.94vw * ${scale})`,
      },
    },
    cardAction: {
      justifyContent: "center",
    },
    slippageContainer: {
      background: "black",
      flexDirection: "row",
      position: "absolute",
      zIndex: 5,
      display: "flex",
      alignItems: "center",
      minWidth: 408,
      bottom: "17%",
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
        height: `calc(.925vw * ${scale})`,
        width: `calc(.925vw * ${scale})`,
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
    card: {
      overflow: "hidden",
      position: "relative",
      height: `calc(28.49vw * ${scale})`,
      width: `calc(30.56vw * ${scale})`,
      borderRadius: `calc(1.38vw * ${scale})`,
      zIndex: 9,
      background: "#FFFFFF",
      border: "0.069vw solid #E1E1E1",

      "&.MuiPaper-root": {
        boxShadow: "0",
      },
      "& .MuiCardContent-root": {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    root: {
      display: "flex",
      position: "relative",
      justifyContent: "center",

      //marginTop: "10px"

      "@media not all and (max-width: 900px) and (orientation: landscape)": {
        [theme.breakpoints.down("md")]: {
          marginTop: "10%",
        },
      },
    },
  };
};

export default style;
