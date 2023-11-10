// eslint-disable-next-line
const style = (theme, scale = 1) => {
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
        justifyContent: "flexend",
        display: "flex",
      },
    },
    appBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      alignContent: "center",
      height: `calc(5vw * ${scale})`,
      background: theme.palette.primary.main,
      "&.MuiPaper-root": {
        boxShadow: `calc(.28vw * ${scale}) calc(.28vw * ${scale}) calc(.28vw * ${scale}) rgba(204, 204, 204, 0.25)`,
      },
      mobile: {
        "&.MuiPaper-root": {
          boxShadow: "0px 0px 0px 0px",
        },
      },
    },
    toolbar: {
      alignItems: "center",
      alignContent: "center",
      height: "100%",
      display: "flex",
      justifyContent: "flex-start",
      mobile: {
        height: "100%",
        transition: "all 0.5s ease",
        [theme.breakpoints.down("sm")]: {
          height: "15vh",
        },
      },
    },
    logoLarge: {
      display: "flex",
      width: `calc(11.35vw * ${scale})`,
      //  "@media screen and (max-width: 768px)": {
      //    width: "164px",
      //  },
      "@media screen and (max-width: 246px)": {
        display: "none",
      },
    },
    logoSmall: {
      display: "none",
      //Width: "",
      "@media screen and (max-width: 246px)": {
        display: "flex",
      },
    },
    container: {
      alignItems: "center",
      justifyContent: "flex-start",
      alignContent: "center",
      flexGrow: 1,
    },
    headerBox: {
      fontSize: `calc(1.5vw * ${scale})`,
      display: "flex",
      alignItems: "center",
      width: "100%",
      //height: `calc(5vw * ${scale})`,
      left: "0px",
      top: "0px",
      background: "#FFFFFF",
      marginBottom: `calc(.28vw * ${scale})`,
      boxShadow: ".28vw .28vw .28vw rgba(204, 204, 204, 0.25)",
      [theme.breakpoints.down("sm")]: {
        boxShadow: "0px 0px 0px 0px",
      },
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
    hide: {
      display: "none",
    },
    menu: {
      display: { xs: "flex", sm: "flex", md: "none" },
      position: "absolute",
      right: "0px",
      //left: `calc(51vw * ${scale})`,
      alignContent: "end",
      justifyContent: "flex-end",
    },
  };
};

export default style;
