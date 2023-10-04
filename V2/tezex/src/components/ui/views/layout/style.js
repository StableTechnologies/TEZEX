// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    root: {
      display: "flex",
      minWidth: "100vw",
      maxWidth: "100vw",
      height: "100%",
      justifyContent: "space-between",
      flexDirection: "row",
    },

    header: {
      flexGrow: 1,
      display: "flex",
    },
    headerMobile: {
      flexGrow: 1,
      display: "flex",
      // "@media screen and (max-width: 900px) and (orientation: landscape)": {
      //   display: "none",
      // },
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
      zIndex: 10,
      display: "flex",
      position: "absolute",
      right: "0px",
      height: "100%",
      "@media screen and (max-width: 900px) and (orientation: landscape)": {
        display: "flex",
        height: "100%",
        zIndex: 1000,
      },
    },
    sideBarShow: {
      display: "flex",
      height: "100%",
      zIndex: 1000,
    },
    sideBarHidden: {
      display: "none",
      // "@media screen  and (max-width: 1400px) and (orientation: landscape)": {
      //   display: "none",
      //   height: "100%",
      //   zIndex: 1000,
      // },
      // "@media screen  and (max-width: 900px) and (orientation: landscape)": {
      //   display: "flex",
      //   height: "100%",
      //   zIndex: 1000,
      // },
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
