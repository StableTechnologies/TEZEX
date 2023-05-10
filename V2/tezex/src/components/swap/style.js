// eslint-disable-next-line
const style = (theme) => {
  return {
    paperTypography: {
      marginLeft: "1vw",
      fontSize: ".972vw",
      lineHeighr: "1.176vw",
    },
    paperBox: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      paddingTop: "6vw",
    },
    paper: {
      position: "absolute",
      top: "89.4%",
      zindex: "-999",

      borderRadius: "1.38vw",
      background: "#F9F9F9",

      width: "30.4vw",
      height: "10.14vw",
    },
    transact: {
      position: "absolute",
      top: "77.5%",
      width: "28.33vw",
      height: "4.16vw",
      justifyContent: "center",
    },
    swapToggle: {
      position: "absolute",
      top: "37.4%",
      zIndex: 5,
      height: "1vw",
    },
    cardHeaderTypography: {
      fontSize: "1.4vw",
    },
    cardHeader: {
      fontSize: "1vw",
      textAlign: "left",
    },
    input1: {
      position: "absolute",
      top: "16.87%",
      "& .MuiFormControl-root": {
        width: "28.34vw",
        height: "6.94vw",
      },
    },
    input2: {
      position: "absolute",
      top: "43.27%",
      "& .MuiFormControl-root": {
        width: "28.34vw",
        height: "6.94vw",
      },
    },
    cardcontent: {
      "&.MuiCardContent-root": {},
      "& .MuiFormControl-root": {
        width: "28.34vw",
        height: "6.94vw",
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
    card: {
      overflow: "hidden",
      position: "relative",
      height: "28.49vw",
      width: "30.56vw",
      borderRadius: "1.38vw",
      zIndex: 999,
      background: "#FFFFFF",
      border: "0.069vw solid #E1E1E1",
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
    },
  };
};

export default style;
