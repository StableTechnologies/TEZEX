// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    navLiquidity: {
      padding: 0,
      "& .MuiTabs-indicator": {
        display: "flex",
        alignItems: "flex-start",
        backgroundColor: "transparent",
      },
      "& .MuiTabs-indicatorSpan-add": {
        height: `calc(.1vw * ${scale})`,
        width: `calc(7.92vw * ${scale})`,
        backgroundColor: "#000000",
      },
      "& .MuiTabs-indicatorSpan-remove": {
        height: `calc(.1vw * ${scale})`,
        width: `calc(10vw * ${scale})`,
        backgroundColor: "#000000",
      },
      justifyContent: "flex-start",

      "&.MuiTabs-root": {
        display: "flex",
        justifiyContent: "center",
        alignItems: "center",
        padding: "0px 0px 0px 0px ",
        minHeight: `calc(2.6vw * ${scale})`,
        maxHeight: `calc(2.6vw * ${scale})`,
      },
      "& .MuiTabs-scroller": {
        display: "flex",
        justifiyContent: "center",
        alignItems: "center",
        padding: "0px 0px 0px 0px ",
        height: `calc(2.6vw * ${scale})`,
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
        fontSize: `calc(1.25vw * ${scale})`,
        lineHeight: `calc(1.52vw * ${scale})`,
        minWidth: `calc(11vw * ${scale})`,
        maxWidth: `calc(11vw * ${scale})`,
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

        height: `calc(2.6vw * ${scale})`,
      },
      "& .MuiTabs-scroller": {
        display: "flex",
        justifiyContent: "center",
        alignItems: "center",

        height: `calc(2.6vw * ${scale})`,
      },

      "& .MuiButtonBase-root": {
        "&.Mui-selected": {
          color: "#000000",
        },
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        // fontSize: `calc(1.11vw * ${scale})`,
        lineHeight: `calc(1.34vw * ${scale})`,
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",
        minHeight: `calc(4vw * ${scale})`,
        maxHeight: `calc(4vw * ${scale})`,
        minWidth: `calc(3.7vw * ${scale})`,
        maxWidth: `calc(7.7vw * ${scale})`,
        paddingTop: `calc(0vw * ${scale})`,
        paddingBottom: `calc(0vw * ${scale})`,
        fontSize: `calc(1.11vw * ${scale})`,
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
      fontSize: `calc(1.5vw * ${scale})`,
      justifyContent: "center",
    },
    navHome: {
      root: {
        "& .MuiTabs-flexContainer": {
          justifyContent: "space-between",
          height: `calc(2.98vw * ${scale})`,
          minWidth: `calc(15.34vw * ${scale})`,
          maxWidth: `calc(15.34vw * ${scale})`,
          border: "0.07vw solid #EDEDED",
          borderRadius: `calc(.48vw * ${scale})`,
          display: "flex",
          position: "relative",
        },

        "&.MuiTabs-root": {
          minHeight: `calc(3.2vw * ${scale})`,
        },
        ".MuiTabs-indicator": {
          top: 0,

          minHeight: `calc(2.91vw * ${scale})`,

          background: "none",
          "&:after": {
            content: '""',
            display: "flex",
            position: "absolute",

            top: `calc(0.28vw * ${scale})`,
            bottom: `calc(0.1vw * ${scale})`,
            left: `calc(.28vw * ${scale})`,
            right: `calc(.28vw * ${scale})`,
            borderRadius: `calc(.48vw * ${scale})`,
            backgroundColor: "selectedHomeTab.main",
          },
        },
      },
      tab: {
        "&.MuiButtonBase-root": {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: `calc(1.11vw * ${scale})`,
          minHeight: `calc(2.91vw * ${scale})`,
          minWidth: `calc(3.0vw * ${scale})`,
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
