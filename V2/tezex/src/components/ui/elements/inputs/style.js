// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    slippageTabsRoot: {
      "&.MuiBox-root": {
        background: "#FFFFFF",
        display: "inline-flex",
        position: "relative",
        flexDirection: "row",
        height: `calc(3vw * ${scale})`,
        alignItems: "center",
        alignContent: "center",
        justifyContent: "space-between",
        width: `calc(15.2vw * ${scale})`,
        maxHeight: `calc(2.7vw * ${scale})`,
        minHeight: `calc(2.7vw * ${scale})`,
        borderRadius: `calc(.55vw * ${scale})`,
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
          alignContent: "center",
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
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center",
        textAlign: "center",

        minHeight: `calc(2.2vw * ${scale})`,
        maxHeight: `calc(2.2vw * ${scale})`,

        zIndex: 10,
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
        alignItems: "center",
        alignContent: "center",
        textAlign: "center",
        minHeight: `calc(2.2vw * ${scale})`,
        maxHeight: `calc(2.2vw * ${scale})`,

        minWidth: `calc(4.2vw * ${scale})`,
        maxWidth: `calc(4.2vw * ${scale})`,
        zIndex: 10,

        backgroundColor: "selectedHomeTab.main",
        color: "text.primary",
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
          display: "inline-flex",
          position: "relative",
          flexDirection: "row",
          // minWidth: "4ch",
          //maxWidth: "6ch",
          alignItems: "baseline",
          justifyContent: "center",
          alignContent: "center",
          //justifyContent: "space-between",
        },
      },
      inputProps: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      },
      endAdornment: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        right: `calc(.7vw * ${scale})`,
        padding: "0px 0px 0px 0px",
      },
      "& .MuiButtonBase-root": {
        zIndex: 3,
      },
      "& .MuiInputAdornment-root": {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center",
        position: "relative",
        bottom: `calc(.13vw * ${scale})`,

        //paddingRight: `calc(.13vw * ${scale})`,
        paddingLeft: "0%",
        marginRight: "2%", //`calc(.53vw * ${scale})`,
      },

      "& .MuiTypography-root": {
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",

        fontSize: `calc(.83vw * ${scale})`,
        lineHeight: `calc(1vw * ${scale})`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center",
        textAlign: "center",
      },

      "& .MuiFormControl-root": {
        display: "flex",

        alignItems: "center",
        justifyContent: "center",
        alignContent: "center",
        textAlign: "center",
      },

      "& .MuiInputBase-root": {
        paddingTop: "12%",
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: `calc(.83vw * ${scale})`,
        lineHeight: `calc(1vw * ${scale})`,
        width: "6ch",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        alignContent: "center",
        textAlign: "center",

        zIndex: 1,

        color: "text.primary",
        textTransform: "initial",
      },
    },
  };
};

export default style;
