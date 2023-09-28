// eslint-disable-next-line
const style = (theme) => {
  return {
    nav: {
      "&.MuiGrid2-root": {
        position: "relative",
        marginTop: "3.89vw",
        marginBottom: "2.22vw",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "0px 0px 0px 0px ",

        [theme.breakpoints.down("md")]: {
          display: "none",
        },
      },
    },

    homeContainer: {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
    },
  };
};

export default style;
