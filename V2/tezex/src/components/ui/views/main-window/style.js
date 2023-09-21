// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    header: {
      headerBox: {
        fontSize: `calc(1.5vw * ${scale})`,
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: `calc(5vw * ${scale})`,
        left: "0px",
        top: "0px",
        background: "#FFFFFF",
        marginBottom: `calc(.28vw * ${scale})`,
        boxShadow: ".28vw .28vw .28vw rgba(204, 204, 204, 0.25)",
        [theme.breakpoints.down("sm")]: {
          boxShadow: "0px 0px 0px 0px",
        },
      },

      logo: {
        position: "relative",
        [theme.breakpoints.up("md")]: {
          width: `calc(11.35vw * ${scale})`,
          marginLeft: `calc(11.39vw * ${scale})`,
          top: `calc(.17vw * ${scale})`,
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
        display: { xs: "none", sm: "none", md: "flex" },
        position: "absolute",
        right: "0px",
        //left: `calc(51vw * ${scale})`,
        alignContent: "end",
        justifyContent: "flex-end",
      },
    },
    layout: {
      layoutBox: {
        height: "100vh",
        width: "100%",
        alignContent: "flex-start",
        flexDirection: "column",
        justifyContent: "flex-start",
        display: "flex",
      },
      layoutMainwindow: {},
    },

    mainWindowBackground: {
      position: "absolute",
      zindex: "-1",
      top: `calc(6.9vw * ${scale})`,
      display: "flex",
      maxWidth: `calc(1vw * ${scale})`,
      minWidth: `calc(1vw * ${scale})`,
      maxHeight: `calc(51.66vw * ${scale})`,
      minHeight: `calc(51.66vw * ${scale})`,
      marginLeft: `calc(2.05vw * ${scale})`,
    },
    mainWindow: {
      height: "100%",
      width: "100%",
      background: "#FEFEFE",
    },
  };
};

export default style;
