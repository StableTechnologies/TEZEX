// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    root: {
      display: "flex",
      width: "100%",
      minHeight: "100vh",
      justifyContent: "space-between",
      flexDirection: "row",
      overflowX: "hidden",
      background: "var(--tezex-bg)",
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
      minHeight: "calc(100vh - 76px)",
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
      position: "relative",
      display: "flex",
      width: "100%",
      justifyContent: "center",
      padding: { xs: "24px 0 28px", md: "32px 0 36px" },
    },

    bottomSpaceText: {
      fontSize: { xs: "10px", md: "11px" },
      color: "var(--tezex-faint)",
      fontWeight: 400,
    },

    bottomSpaceLink: {
      fontSize: { xs: "10px", md: "11px" },
      color: "var(--tezex-muted)",
      fontWeight: 500,
      marginLeft: "4px",
      cursor: "pointer",
      textDecoration: "none",
      transition: "color 0.2s ease",
      "&:hover": {
        color: "var(--tezex-text)",
        textDecoration: "underline",
      },
    },
    headerAndMainWindow: {
      minHeight: "100vh",
      width: "100%",
      alignContent: "flex-start",
      flexDirection: "column",
      justifyContent: "flex-start",
      display: "flex",
      background: "var(--tezex-bg)",
    },
  };
};

export default style;
