// eslint-disable-next-line
const style = (theme) => {
  return {
    header: {
      headerBox: {
        fontSize: "1.5vw",
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: "5vw",
        left: "0px",
        top: "0px",
        background: "#FFFFFF",
        marginBottom: ".28vw",
        boxShadow: ".28vw .28vw .28vw rgba(204, 204, 204, 0.25)",
        [theme.breakpoints.down("sm")]: {
          boxShadow: "0px 0px 0px 0px",
        },
      },

      logo: {
        position: "relative",
        [theme.breakpoints.up("md")]: {
          width: "11.35vw",
          marginLeft: "11.39vw",
          top: ".17vw",
          boxShadow: "0px 0px 0px 0px",
        },
        [theme.breakpoints.down("sm")]: {},
      },

      nav: {
        [theme.breakpoints.down("md")]: {
          display: "none",
        },

        alignContent: "center",
      },

      wallet: {
        display: { sm: "none", md: "flex" },
        position: "relative",
        //left: "51vw",
        alignContent: "end",
        justifyContent: "flex-end",
      },
    },
    layout: {
      layoutBox: {
        height: "100%",
        alignContent: "space-between",

        justifyContent: "space-between",
        display: "flex",
      },
      layoutMainwindow: {},
    },

    mainWindowBackground: {
      position: "absolute",
      zindex: "-1",
      top: "6.9vw",
      display: "flex",
      maxWidth: "1vw",
      minWidth: "1vw",
      maxHeight: "51.66vw",
      minHeight: "51.66vw",
      marginLeft: "2.05vw",
    },
    mainWindow: {
      height: "100%",
      width: "100%",
      background: "#FEFEFE",
    },
  };
};

export default style;
