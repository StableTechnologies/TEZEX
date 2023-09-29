// eslint-disable-next-line
const style = (theme) => {
  return {
    root: {
      display: "flex",
      width: "100%",
      height: "100%",
      justifyContent: "space-between",
      flexDirection: "row",
    },
    header: {
      flexgrow: 1,
      display: "flex",
      "@media (max-width: 900px) and (orientation: landscape)": {
        display: "none",
      },
    },
    mainWindow: {
      height: "100%",
      width: "100%",
      position: "relative",
      alignContent: "space-between",
      flexDirection: "column",
      justifyContent: "space-between",
      display: "flex",
    },
    sideBar: {
      display: "flex",
      "@media (max-width: 900px) and (orientation: landscape)": {
        display: "flex",
        height: "100%",
        zIndex: 1000,
      },
    },
    sideBarHidden: {
      display: "none",
      "@media (max-width: 900px) and (orientation: landscape)": {
        display: "flex",
        height: "100%",
        zIndex: 1000,
      },
    },
    bottomSpace: {
      position: "absolute",
      display: "flex",
      bottom: "0%",
      width: "100%",
    },
    headerAndMainWindow: {
      height: "100vh",
      width: "100%",
      alignContent: "flex-start",
      flexDirection: "column",
      justifyContent: "flex-start",
      display: "flex",
    },
  };
};

export default style;
