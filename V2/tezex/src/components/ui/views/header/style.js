// eslint-disable-next-line
const style = (theme) => {
  return {
    appBar: {
      "&.MuiPaper-root": {
        boxShadow: ".28vw .28vw .28vw rgba(204, 204, 204, 0.25)",
      },
      "@media screen and (max-width: 768px)": {
        "&.MuiPaper-root": {
          boxShadow: "0px 0px 0px 0px",
        },
      },
    },
    toolbar: {
      height: "100%",
      transition: "height 0.3s ",
      "@media screen and (max-width: 768px)": {
        height: "10vh",
      },
    },
    logoLarge: {
      display: "flex",
      width: "11.35vw",
      "@media screen and (max-width: 768px)": {
        width: "164px",
      },
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
      fontSize: "1.5vw",
      display: "flex",
      alignItems: "center",
      width: "100%",
      //height: "5vw",
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
      minWidth: "164px",
      position: "relative",
      [theme.breakpoints.up("md")]: {
        //  width: "11.35vw",
        //  marginLeft: "11.39vw",
        //  top: ".17vw",
        //  boxShadow: "0px 0px 0px 0px",
      },
      [theme.breakpoints.down("sm")]: {
        minWidth: "164px",
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
      //left: "51vw",
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
      //left: "51vw",
      alignContent: "end",
      justifyContent: "flex-end",
    },
  };
};

export default style;
