// eslint-disable-next-line
const style = (theme) => {
  return {
    navLiquidity: {
      padding: 0,
      "& .MuiTabs-indicator": {
        display: "flex",
        alignItems: "flex-start",
        backgroundColor: "transparent",
      },
      "& .MuiTabs-indicatorSpan-add": {
        // maxWidth: 40,
        height: ".1vw",
        width: "7.92vw",
        backgroundColor: "#000000",
      },
      "& .MuiTabs-indicatorSpan-remove": {
        // maxWidth: 40,
        height: ".1vw",
        width: "10vw",
        backgroundColor: "#000000",
      },
      justifyContent: "flex-start",

      "&.MuiTabs-root": {
        display: "flex",
        justifiyContent: "center",
        alignItems: "center",
        padding: "0px 0px 0px 0px ",
        minHeight: "2.6vw",
        maxHeight: "2.6vw",
      },
      "& .MuiTabs-scroller": {
        display: "flex",
        justifiyContent: "center",
        alignItems: "center",
        padding: "0px 0px 0px 0px ",
        height: "2.6vw",
      },
      "&.MuiButton-root.Mui-disabled": {
        color: "#999999",
      },

      "& .MuiButtonBase-root": {
        padding: "0px 0px 0px 0px",
        display: "flex",

        alignItems: "flex-start",
        "&.Mui-selected": {
          color: "#000000",
        },
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: "1.25vw",
        lineHeight: "1.52vw",
        minWidth: "11vw",
        maxWidth: "11vw",
        "&:not(first-child)": {
          // padding: "0px 4vw ",
        },
        "&:first-child": {
          // paddingLeft: "0px 3.1vw ",
        },

        color: "#999999",
        background: "white",
        textTransform: "initial",
      },
    },
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
        "&:not(first-child)": {
          padding: "0px 4vw ",
        },
        "&:first-child": {
          paddingLeft: "0px 3.1vw ",
        },

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

          border: "0.07vw solid #EDEDED",
          borderRadius: ".28vw",
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
            borderRadius: ".28vw",
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
