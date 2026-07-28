// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    nav: {
      "&.MuiGrid2-root": {
        position: "relative",
        marginTop: { xs: "24px", md: "34px" },
        marginBottom: { xs: "20px", md: "26px" },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0px 0px 0px 0px ",
      },
      mobile: {
        "&.MuiGrid2-root": {
          position: "relative",
          marginTop: "22px",
          marginBottom: "18px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "0px 0px 0px 0px ",
        },
      },
    },

    homeContainer: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-start",
      width: "100%",
      padding: { xs: "0 16px", md: "0 28px" },
    },
    contentViewport: {
      width: "100%",
      position: "relative",
      isolation: "isolate",
    },
    modePanel: {
      width: "100%",
      position: "relative",
      zIndex: 1,
    },
  };
};

export default style;
