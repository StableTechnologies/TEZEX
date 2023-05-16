// eslint-disable-next-line
const style = (theme) => {
  return {
    wallet: {
      width: "28.33vw",
      height: "4.16vw",

      position: "absolute",
      bottom: "0%",
      justifyContent: "center",
      paddingBottom: "2.22vw",
    },
    useMax: {
      "&.MuiButtonBase-root": {
        marginLeft: "0px",

        justifyContent: "flex-start",
        paddingLeft: "1.11vw",
      },
      "&.MuiTouchRipple-root": {
        width: "2vw",
      },
    },
    useMaxTypographyDisabled: {
      fontSize: ".97vw",
      lineHeight: "1.176vw",
      color: "#999999;",
    },
    useMaxTypographyEnabled: {
      fontSize: ".97vw",
      lineHeight: "1.176vw",
      color: "#00A0E4",
    },
    cardContentBox: {
      display: "flex",

      paddingLeft: "0vw",
      position: "absolute",
      top: "33%",
      justifyContent: "flex-start",
      alignItems: "center",
      flexDirection: "row",
      "&.MuiBox-root": {
        justifyContent: "flex-start",
        alignItems: "center",
        flexDirection: "row",
      },
    },
    headerTypography: {
      fontSize: "1.4vw",
    },
    cardHeader: {
      paddingLeft: "2.22vw",
      paddingTop: "2.22vw",
      fontSize: "1vw",
      textAlign: "left",
    },
    cardcontent: {
      "&.MuiCardContent-root": {
        display: "flex",
        justifyContent: "flex-start",
        paddingLeft: "2.22vw",
        //paddingTop: "0px",
      },
      "& .MuiFormControl-root": {
        // width: "28.34vw",
        //  height: "6.94vw",
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

    input1: {
      position: "relative",

      "& .MuiFormControl-root": {
        width: "21.45vw",
        height: "3.8vw",
      },
    },
    card: {
      overflow: "hidden",
      position: "relative",
      height: "26.04vw",
      width: "30.56vw",
      borderRadius: "1.38vw",
      zIndex: 999,
      background: "#FFFFFF",
      border: "0.07vw solid #E1E1E1",

      "&.MuiPaper-root": {
        boxShadow: "0",
      },
      "& .MuiCardContent-root": {
        padding: "8px",
      },
    },
    paper: {
      background: "#F9F9F9",
      borderRadius: "20px",
      border: "1px solid #E1E1E1",
      minHeight: "146px",
      position: "relative",
      bottom: "10%",
      zIndex: -1,
      marginBottom: "20px",
    },
    root: {
      display: "flex",
      position: "relative",
      justifyContent: "center",
    },
  };
};

export default style;
