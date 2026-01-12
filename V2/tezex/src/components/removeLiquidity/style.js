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
      flexDirection: "row",
      alignItems: "center",

      paddingTop: `calc(4vw * ${scale})`,
      paddingRight: `calc(1vw * ${scale})`,

      // spacing between input and button
      gap: `calc(0.5vw * ${scale})`,
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
        flexDirection: "column",
        paddingLeft: `calc(2.22vw * ${scale})`,
        paddingRight: `calc(2.22vw * ${scale})`,
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
        width: `calc(21.45vw * ${scale})`,
        height: `calc(3.8vw * ${scale})`,
      },
    },
    card: {
      overflow: "hidden",
      position: "relative",
      height: `calc(32.04vw * ${scale})`,
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
    },
    poolSelectorContainer: {
      display: "flex",
      width: "100%",
      justifyContent: "center",
      paddingLeft: `calc(2.22vw * ${scale})`,
      paddingRight: `calc(2.22vw * ${scale})`,
    },

    poolSelector: {
      minWidth: `calc(10.5vw * ${scale})`,
      width: "100%",

      "& .MuiSelect-select": {
        fontSize: `calc(0.75vw * ${scale})`,
        paddingY: `calc(0.6vw * ${scale})`,
        paddingX: `calc(0.9vw * ${scale})`,
      },

      "& .MuiOutlinedInput-root": {
        height: `calc(2.6vw * ${scale})`,
        backgroundColor: "#FAFAFA",
        border: "1px solid #E1E1E1",
        transition: "all 0.2s ease",
        textAlign: "start",

        "&:hover": {
          backgroundColor: "#F5F5F5",
          borderColor: "#CCCCCC",
        },

        "&.Mui-focused": {
          backgroundColor: "#FFFFFF",
          borderColor: "#999999",
        },
      },

      // Mobile
      [theme.breakpoints.down("md")]: {
        width: "100%",
        maxWidth: "100%",

        "& .MuiSelect-select": {
          fontSize: `calc(2vw * ${scale})`,
          paddingY: `calc(1.5vw * ${scale})`,
          paddingX: `calc(2vw * ${scale})`,
        },

        "& .MuiOutlinedInput-root": {
          minHeight: `calc(3vw * ${scale})`,
        },
      },
    },
    receiveInfo: {
      marginTop: `calc(0.6vw * ${scale})`,
      paddingLeft: `calc(0.3vw * ${scale})`,
      paddingRight: `calc(2.22vw * ${scale})`,
      display: "flex",
      justifyContent: "flex-start",
      flexDirection: "column",
    },

    receiveText: {
      display: "inline-flex",
      fontSize: `calc(0.97vw * ${scale})`,
      fontWeight: "400",
      lineHeight: `calc(1.18vw * ${scale})`,
      color: "#666",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: `calc(0.3vw * ${scale})`,
      marginBottom: `calc(0.5vw * ${scale})`,
      receiveAmountGap: `calc(0.4vw * ${scale})`,
      flexDirection: "column",
      receiveTokenGap: `calc(0.5vw * ${scale})`,
    },
    receiveTokenAmount: {
      fontSize: "0.8rem",
      [theme.breakpoints.up("lg")]: {
        fontSize: "1rem",
      },
    },

    receiveIcons: {
      width: `calc(1.2vw * ${scale})`,
      height: `calc(1.2vw * ${scale})`,
      marginLeft: `calc(0.3vw * ${scale})`,
      marginRight: `calc(0.1vw * ${scale})`,
      maxWidth: 24,
      maxHeight: 24,
      minWidth: 16,
      minHeight: 16,
    },
    receivePlus: {
      paddingLeft: `calc(0.3vw * ${scale})`,
      paddingRight: `calc(0.1vw * ${scale})`,
    },

    [theme.breakpoints.down("md")]: {
      receiveInfo: {
        marginTop: `calc(3vw * ${scale})`,
      },

      receiveText: {
        fontSize: `calc(2vw * ${scale})`,
        lineHeight: `calc(2.5vw * ${scale})`,
      },

      receiveAmount: {
        fontSize: `calc(2vw * ${scale})`,
        lineHeight: `calc(2.5vw * ${scale})`,
      },
    },
  };
};

export default style;
