// eslint-disable-next-line
const style = (theme) => {
  //all the view widths were set for a screen that is 1440 wide , convert all the vw's to pixels
  return {
    paperTypography: {
      marginLeft: "1vw",
      fontSize: ".972vw",
      lineHeighr: "1.176vw",
    },
    paperBox: {
      display: "flex",
      height: "100%",
      width: "100%",
      // justifyContent: "space-between",
      // alignItems: "center",
      // paddingTop: "5.2vw",
      // paddingLeft: "1.6vw",
      // paddingRight: "1.11vw",
    },
    paper: {
      //position: "absolute",
      //top: "89.4%",
      //bottom: "-20%",

      position: "relative",
      top: "-10%",
      zindex: "-999",
      width: "30.5vw",
      height: "10.14vw",
      [theme.breakpoints.down("md")]: {
        height: "146px",

        width: "439px",
      },

      "&.MuiPaper-root": {
        boxShadow: "0",
        border: "0px",
      },
      borderRadius: "1.38vw",
      background: "#F9F9F9",

      // width: "100%",
      // //width: "30.5vw",
      // height: "100%",
    },
    transact: {
      position: "absolute",
      top: "77.5%",
      width: "28.33vw",
      justifyContent: "center",
      [theme.breakpoints.down("md")]: {
        width: "408px",
      },
    },
    swapToggle: {
      display: "flex",
      position: "absolute",
      top: "38.3%",
      zIndex: 5,
      [theme.breakpoints.down("md")]: {
        height: "32px",
      },
    },
    cardHeaderTypography: {
      fontSize: "1.4vw",
      [theme.breakpoints.down("md")]: {
        fontSize: "18px",
      },
    },
    cardHeader: {
      paddingTop: "1.59vw",
      paddingBottom: "0vw",
      paddingLeft: "1.59vw",
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
        // width: "28.34vw",
        // height: "6.94vw",
        //height: "6.94vw",
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
    card: {
      overflow: "hidden",
      position: "relative",

      height: "28.49vw",

      width: "30.56vw",
      transition: "all 0.3s ease-in-out",
      [theme.breakpoints.down("md")]: {
        height: "409px",

        width: "439px",
      },

      //  [theme.breakpoints.down("sm")]: {
      //    height: "100%",

      //    width: "100%",
      //  },
      // height: "28.49vw",
      // height: `${(28.49 / 100) * 1440}px`,
      //width: "30.56vw",
      // width: `${(30.56 / 100) * 1440}px`,
      borderRadius: "1.38vw",
      zIndex: 999,
      background: "#FFFFFF",
      border: "0.069vw solid #E1E1E1",

      "&.MuiPaper-root": {
        boxShadow: "0",
      },
      "& .MuiCardContent-root": {
        display: "flex",
        //alignItems: "center",
        justifyContent: "center",
      },
    },
    root: {
      display: "flex",
      //position: "relative",
      justifyContent: "center",
      height: "100%",
      //width: "440px",
    },
  };
};

export default style;
