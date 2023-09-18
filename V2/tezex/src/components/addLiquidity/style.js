// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    infoRecieve: {
      marginRight: `calc(.37vw * ${scale})`,
      fontSize: `calc(.97vw * ${scale})`,
      fontWeight: "700",
      lineHeight: `calc(1.18vw * ${scale})`,
    },
    infoTextIcon: {
      width: `calc(1.11vw * ${scale})`,
      marginLeft: `calc(.27vw * ${scale})`,
      marginRight: `calc(.27vw * ${scale})`,
    },
    infoText: {
      display: "inline-flex",
      fontSize: `calc(.97vw * ${scale})`,
      fontWeight: "400",
      lineHeight: `calc(1.18vw * ${scale})`,
    },
    infoGrid: {
      marginTop: `calc(0.694vw * ${scale})`,
      flexDirection: "row",
      display: "inline-flex",
      alignItems: "flex-start",
    },
    plusIcon: {
      width: `calc(.97vw * ${scale})`,
    },
    plusIconGrid: {
      position: "relative",
    },
    cardContendGrid: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexDirection: "row",

      [theme.breakpoints.down("md")]: {
        flexDirection: "column",
      },
    },
    cardHeaderTypography: {
      fontSize: `calc(1.4vw * ${scale})`,
    },
    cardHeader: {
      paddingTop: `calc(2.22vw * ${scale})`,
      paddingBottom: `calc(0vw * ${scale})`,
      paddingLeft: `calc(2.22vw * ${scale})`,
      fontSize: `calc(1vw * ${scale})`,
      textAlign: "left",
    },

    input: {
      width: `calc(28.34vw * ${scale})`,
      height: `calc(8.61vw * ${scale})`,
      "& .MuiFormControl-root": {
        width: `calc(28.34vw * ${scale})`,
        height: `calc(8.61vw * ${scale})`,
      },
    },
    slippageBox: {
      "& .MuiGrid2-root": {},
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
    },

    slippageComponent: {
      "&.MuiGrid2-root": {
        position: "relative",
        paddingTop: `calc(1.46vw * ${scale})`,
      },
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
    tokens: {
      display: "flex",
      width: "100%",
      paddingTop: `calc(1.16vw * ${scale})`,
      paddingLeft: `calc(2.22vw * ${scale})`,
    },
    cardContent: {
      "&.MuiCardContent-root": {
        paddingTop: `calc(2.22vw * ${scale})`,
        paddingBottom: `calc(0vw * ${scale})`,

        paddingLeft: `calc(1.597vw * ${scale})`,
        paddingRight: `calc(1.597vw * ${scale})`,
      },
      flexDirection: "column",
      paddingTop: `calc(10vw * ${scale})`,
      alignItems: "center",
      display: "flex",
    },
    card: {
      display: "block",
      minHeight: `calc(32.57vw * ${scale})`,
      maxHeight: `calc(32.57vw * ${scale})`,
      minWidth: `calc(63.88vw * ${scale})`,
      maxWidth: `calc(63.88vw * ${scale})`,
      borderRadius: `calc(1.38vw * ${scale})`,
      zIndex: 5,
      background: "#FFFFFF",
      border: ".069vw solid #E1E1E1",
      "&.MuiPaper-root": {
        boxShadow: "0",
      },
      "& .MuiCardContent-root": {},

      [theme.breakpoints.down("md")]: {
        minHeight: `calc(45.57vw * ${scale})`,
        maxHeight: `calc(45.57vw * ${scale})`,
        minWidth: `calc(32.88vw * ${scale})`,
        maxWidth: `calc(32.88vw * ${scale})`,
        // minHeight: `calc(32.57vw * ${scale})`,
        //  height: `calc(28.49vw * ${scale})`,
        //  maxWidth: `calc(30.56vw * ${scale})`,
        //  maxWidth: `calc(63.88vw * ${scale})`,
      },
    },
    cardAction: {
      justifyContent: "space-between",

      "&.MuiCardActions-root": {
        paddingTop: `calc(3.54vw * ${scale})`,

        paddingRight: `calc(1.597vw * ${scale})`,
        paddingLeft: `calc(1.597vw * ${scale})`,
      },
      [theme.breakpoints.down("md")]: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        "&.MuiCardActions-root": {
          paddingTop: `calc(1.54vw * ${scale})`,

          paddingRight: `calc(0 * ${scale})`,
          paddingLeft: `calc(0 * ${scale})`,
        },
      },
    },
    root: {
      position: "relative",
      justifyContent: "center",
    },
  };
};

export default style;
