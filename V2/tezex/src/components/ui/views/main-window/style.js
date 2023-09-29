// eslint-disable-next-line
const style = (theme) => {
  return {
    root: {
      height: "100%",
      width: "100%",
      position: "relative",
      alignContent: "flex-start",
      alignItems: "flex-start",

      flexDirection: "row",
      justifyContent: "center",
      display: "flex",
    },
    sideLogo: {
      height: "70%",
      justifyContent: "center",
      display: "flex",
      alignContent: "center",
      position: "absolute",
      alignItems: "flex-start",
      left: "2%",
      top: "2%",

      "@media (max-width: 900px) and (orientation: landscape)": {
        display: "none",
      },

      "@media screen and (max-width: 768px)": {
        display: "none",
      },
    },
  };
};

export default style;
