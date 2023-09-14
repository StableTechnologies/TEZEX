// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
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
    toolbar: {
      minHeight: "120px",
      [theme.breakpoints.down("sm")]: {
        boxShadow: "0px 0px 0px 0px",
      },
    },

    logo: {
      minWidth: "164px",
      position: "relative",
      [theme.breakpoints.up("md")]: {
        //  width: `calc(11.35vw * ${scale})`,
        //  marginLeft: `calc(11.39vw * ${scale})`,
        //  top: `calc(.17vw * ${scale})`,
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
