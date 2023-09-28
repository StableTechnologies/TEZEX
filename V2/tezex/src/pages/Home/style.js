// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    nav: {
      "&.MuiGrid2-root": {
        position: "relative",
        marginTop: `calc(3.89vw * ${scale})`,
        marginBottom: `calc(2.22vw * ${scale})`,
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
