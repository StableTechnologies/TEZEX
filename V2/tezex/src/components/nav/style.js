// eslint-disable-next-line
const style = (theme) => {
  return {
    navApp: {
      "&.MuiButton-root.Mui-disabled": {
        color: "#999999",
      },

      "& .MuiButtonBase-root": {
        "&.Mui-selected": {
          color: "#000000",
        },
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: "1.11vw",
        lineHeight: "1.34vw",
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",

        minWidth: "3.7vw",
        maxWidth: "7.7vw",

        padding: "0px 4vw ",
        color: "#999999",
        background: "white",
        textTransform: "initial",
      },

      padding: 0,

      display: "flex",
      fontSize: "1.5vw",
      justifyContent: "center",
    },
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
};

export default style;
