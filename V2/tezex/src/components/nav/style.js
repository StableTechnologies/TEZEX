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
        "& .MuiTabs-flexContainer": {
          justifyContent: "space-between",
          minWidth: "15.34vw",
          maxWidth: "15.34vw",
          border: "0.07vw solid #EDEDED",
          borderRadius: ".28vw",
          display: "flex",
          position: "relative",
        },
        ".MuiTabs-indicator": {
          top: 0,

          minHeight: "2.91vw",

          background: "none",
          "&:after": {
            content: '""',
            display: "flex",
            position: "absolute",

            top: "0.28vw",
            bottom: "0.28vw",
            left: ".28vw",
            right: ".28vw",
            borderRadius: ".48vw",
            backgroundColor: "selectedHomeTab.main",
          },
        },
      },
      tab: {
        "&.MuiButtonBase-root": {
          fontSize: "1.11vw",
          minHeight: "2.91vw",
          minWidth: "3.0vw",
          padding: ".56vw 1.66vw .56vw 1.66vw ",
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
