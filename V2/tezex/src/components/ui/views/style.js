// eslint-disable-next-line
const style = (theme) => {
  return {
    header: {
      headerBox: {
        fontSize: "1.5vw",
        display: "flex",
        alignItems: "center",
        width: "100%",
        minHeight: "5vw",
        maxHeight: "5vw",
        left: "0px",
        top: "0px",
        background: "#FFFFFF",
        marginBottom: ".28vw",
        boxShadow: ".28vw .28vw .28vw rgba(204, 204, 204, 0.25)",
      },

      logo: {
        position: "relative",
        maxWidth: "11.35vw",
        marginLeft: "1.39vw",
        top: ".17vw",
      },

      nav: {
        alignContent: "center",
      },

      wallet: {
        position: "relative",
        left: "51vw",
        justifyContent: "lefflexend",
        display: "flex",
      },
    },
    layout: {
      layoutBox: { height: "100%" },
      layoutMainwindow: {
        height: "100vh",
      },
    },

    mainWindowBackground: {
      position: "absolute",
      zindex: "-1",
      top: "6.9vw",
      display: "flex",
      maxHeight: "51.66vw",
      minHeight: "51.66vw",
      marginLeft: "2.05vw",
    },
    mainWindow: {
      height: "100vh",
      width: "100%",
      background: "#FEFEFE",
    },
  };
};

export default style;
