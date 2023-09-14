// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    slippageTabsRoot: {
      "&.MuiBox-root": {
        background: "#FFFFFF",
        display: "flex",
        position: "relative",
        flexDirection: "row",
        height: `calc(3vw * ${scale})`,
        alignItems: "center",
        justifyContent: "space-between",
        width: `calc(15.2vw * ${scale})`,
        maxHeight: `calc(2.7vw * ${scale})`,
        minHeight: `calc(2.7vw * ${scale})`,
        borderRadius: `calc(.55vw * ${scale})`,

        "&:first-child": {
          paddingLeft: ".28vw ",
        },
      },
      border: "0.07vw solid #EDEDED",
    },
    slippageTab: {
      box: {
        "&.MuiBox-root": {
          background: "#FFFFFF",
          display: "flex",
          position: "relative",
          alignItems: "center",
          justifyContent: "center",

          minWidth: `calc(4.2vw * ${scale})`,
          maxWidth: `calc(4.2vw * ${scale})`,
        },
      },
      "&.MuiButton-root.Mui-disabled": {
        backgroundColor: "transparent",

        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: `calc(.83vw * ${scale})`,
        lineHeight: `calc(1vw * ${scale})`,
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",

        minHeight: `calc(2.2vw * ${scale})`,
        maxHeight: `calc(2.2vw * ${scale})`,

        zIndex: 1,
      },
      "&.MuiButtonBase-root": {
        position: "relative",

        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: `calc(.83vw * ${scale})`,
        lineHeight: `calc(1vw * ${scale})`,
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",
        minHeight: `calc(2.2vw * ${scale})`,
        maxHeight: `calc(2.2vw * ${scale})`,

        minWidth: `calc(4.2vw * ${scale})`,
        maxWidth: `calc(4.2vw * ${scale})`,
        zIndex: 1,

        backgroundColor: "selectedHomeTab.main",
        textTransform: "initial",
      },
      wrapper: {
        textTransform: "initial",
      },
    },

    slippageInput: {
      box: {
        "&.MuiBox-root": {
          paddingTop: `calc(.28vw * ${scale})`,
          display: "flex",
          position: "relative",
          flexDirection: "row",
          width: "3ch",
          alignItems: "center",
          justifyContent: "space-between",
        },
      },
      "& .MuiButtonBase-root": {
        zIndex: 3,
      },
      "& .MuiInputAdornment-root": {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        bottom: `calc(.13vw * ${scale})`,

        paddingRight: `calc(0vw * ${scale})`,
      },

      "& .MuiTypography-root": {
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",

        fontSize: `calc(.83vw * ${scale})`,
        lineHeight: `calc(1vw * ${scale})`,
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",
      },

      "& .MuiFormControl-root": {
        display: "flex",

        alignItems: "center",
        justifyContent: "center",
      },

      "& .MuiInputBase-root": {
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: `calc(.83vw * ${scale})`,
        lineHeight: `calc(1vw * ${scale})`,
        display: "flex",
        justifyContent: "center",
        textAlign: "center",

        zIndex: 1,

        color: "palette.text.primary",
        textTransform: "initial",
      },
    },
  };
};

export default style;
