// eslint-disable-next-line
const style = (theme) => {
  return {
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
        //  width: "11.35vw",
        //  marginLeft: "11.39vw",
        //  top: ".17vw",
        //  boxShadow: "0px 0px 0px 0px",
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
      //left: "51vw",
      alignContent: "end",
      justifyContent: "flex-end",
    },
  };
};

export default style;
