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
        height: ".1vw",
        width: "7.92vw",
        backgroundColor: "#000000",
      },
      "& .MuiTabs-indicatorSpan-remove": {
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
        "&:not(first-child)": {},
        "&:first-child": {},

        color: "#999999",
        background: "white",
        textTransform: "initial",
      },
    },
    navApp: {
      "&.MuiButton-root.Mui-disabled": {
        color: "#999999",
      },

      "&.MuiTabs-root": {
        display: "flex",
        justifiyContent: "center",
        alignItems: "center",

        height: "2.6vw",
      },
      "& .MuiTabs-scroller": {
        display: "flex",
        justifiyContent: "center",
        alignItems: "center",

        height: "2.6vw",
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
        minHeight: "4vw",
        maxHeight: "4vw",
        minWidth: "3.7vw",
        maxWidth: "7.7vw",
        paddingTop: "0vw",
        paddingBottom: "0vw",
        "&:not(first-child)": {},
        //   "&:first-child": {
        //     paddingLeft: "3.1vw ",
        //   },

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
          height: "2.98vw",
          minWidth: "15.34vw",
          maxWidth: "15.34vw",
          border: "0.07vw solid #EDEDED",
          borderRadius: ".48vw",
          display: "flex",
          position: "relative",
        },

        "&.MuiTabs-root": {
          minHeight: "3.2vw",
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
            bottom: "0.1vw",
            left: ".28vw",
            right: ".28vw",
            borderRadius: ".48vw",
            backgroundColor: "selectedHomeTab.main",
          },
        },
      },
      tab: {
        "&.MuiButtonBase-root": {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.11vw",
          minHeight: "2.91vw",
          minWidth: "3.0vw",
          padding: ".0vw 1.66vw .0vw 1.66vw ",
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
