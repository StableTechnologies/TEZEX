// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    wallet: {
      width: `calc(28.33vw * ${scale})`,
      height: `calc(4.16vw * ${scale})`,

      position: "absolute",
      bottom: "0%",
      justifyContent: "center",
      paddingBottom: `calc(2.22vw * ${scale})`,
    },
    useMax: {
      "&.MuiButtonBase-root": {
        marginLeft: "0px",

        justifyContent: "flex-start",
        paddingLeft: `calc(1.11vw * ${scale})`,
      },
      "&.MuiTouchRipple-root": {
        width: `calc(2vw * ${scale})`,
      },
    },
    useMaxTypographyDisabled: {
      fontSize: `calc(.97vw * ${scale})`,
      lineHeight: `calc(1.176vw * ${scale})`,
      color: "#999999;",
    },
    useMaxTypographyEnabled: {
      fontSize: `calc(.97vw * ${scale})`,
      lineHeight: `calc(1.176vw * ${scale})`,
      color: "#00A0E4",
    },
    cardContentBox: {
      display: "flex",

      paddingLeft: `calc(0vw * ${scale})`,
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
      fontSize: `calc(1.4vw * ${scale})`,
    },
    cardHeader: {
      paddingLeft: `calc(2.22vw * ${scale})`,
      paddingTop: `calc(2.22vw * ${scale})`,
      fontSize: `calc(1vw * ${scale})`,
      textAlign: "left",
    },
    cardcontent: {
      "&.MuiCardContent-root": {
        display: "flex",
        justifyContent: "flex-start",
        paddingLeft: `calc(2.22vw * ${scale})`,
      },
      "& .MuiFormControl-root": {},
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
        width: `calc(21.45vw * ${scale})`,
        height: `calc(3.8vw * ${scale})`,
      },
    },
    card: {
      overflow: "hidden",
      position: "relative",
      height: `calc(26.04vw * ${scale})`,
      width: `calc(30.56vw * ${scale})`,
      borderRadius: `calc(1.38vw * ${scale})`,
      zIndex: 5,
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

      "@media not all and (max-width: 900px) and (orientation: landscape)": {
        [theme.breakpoints.down("md")]: {
          marginTop: "15%",
        },
      },
    },
  };
};

export default style;
