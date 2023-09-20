// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    mainWindowBackground: {
      position: "absolute",
      zindex: "-1",
      top: `calc(6.9vw * ${scale})`,
      display: "flex",
      maxWidth: `calc(1vw * ${scale})`,
      minWidth: `calc(1vw * ${scale})`,
      maxHeight: `calc(51.66vw * ${scale})`,
      minHeight: `calc(51.66vw * ${scale})`,
      marginLeft: `calc(2.05vw * ${scale})`,
    },
    mainWindow: {
      height: "100%",
      width: "100%",
      position: "relative",
      alignContent: "flex-start",
      alignItems: "flex-start",

      flexDirection: "row",
      justifyContent: "center",
      display: "flex",

      [theme.breakpoints.down("sm")]: {
        height: "100vh",
        width: "100vw",
        position: "relative",
        alignContent: "flex-start",
        alignItems: "flex-start",

        flexDirection: "row",
        justifyContent: "center",
        display: "flex",
      },
    },
  };
};

export default style;
