const style = {
  navApp: {},
  navHome: {
    root: {
      ".MuiTabs-flexContainer": {
        justifyContent: "space-between",

        border: "1px solid #EDEDED",
        borderRadius: 4,
        display: "inline-flex",
        position: "relative",
      },
      ".MuiTabs-indicator": {
        top: 0,

        minHeight: "5vw",

        background: "none",
        "&:after": {
          content: '""',
          display: "block",
          position: "absolute",

          top: ".5vw",
          bottom: "1.5vw",
          left: "1vw",
          right: "1vw",
          borderRadius: 3,
          backgroundColor: "selectedHomeTab.main",
        },
      },
    },
    tab: {
      "&.MuiButtonBase-root": {
        fontSize: "1.11vw",
        minHeight: "1.32vw",
        minWidth: "3.0vw",
        padding: "3% 3.9vw",
        zIndex: 2,

        color: "palette.text.primary",
        textTransform: "initial",
      },
      wrapper: {
        color: "palette.text.primary",
        textTransform: "initial",
      },
    },
  },
};

export default style;
