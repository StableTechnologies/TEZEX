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
        left: "0px",
        top: "0px",
        background: "#FFFFFF",
        boxShadow: "4px 4px 4px rgba(204, 204, 204, 0.25)",
      },

      logo: {
        maxWidth: "11.35vw",
      },

      nav: {
        alignContent: "center",
      },

      wallet: {
        position: "relative",
        left: "51vw",
        justifyContent: "flexend",
        display: "flex",
      },
    },
    layout: {
      layoutBox: { height: "100%" },
      layoutMainwindow: {
        height: "100vh",
      },
    },

    mainWindow: {
      height: "100vh",
      background: "#FEFEFE",
    },
  };
};

export default style;
