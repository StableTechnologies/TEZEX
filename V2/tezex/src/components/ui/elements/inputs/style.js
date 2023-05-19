// eslint-disable-next-line
const style = (theme) => {
  return {
    slippageTabsRoot: {
      "&.MuiBox-root": {
        background: "#FFFFFF",
        display: "flex",
        position: "relative",
        flexDirection: "row",
        height: "3vw",
        alignItems: "center",
        justifyContent: "space-between",
        width: "15.2vw",
        maxHeight: "2.7vw",
        minHeight: "2.7vw",
        borderRadius: ".55vw",

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

          minWidth: "4.2vw",
          maxWidth: "4.2vw",
        },
      },
      "&.MuiButton-root.Mui-disabled": {
        backgroundColor: "transparent",

        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: ".83vw",
        lineHeight: "1vw",
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",
        //paddingTop: "2px",

        minHeight: "2.2vw",
        maxHeight: "2.2vw",
        // minWidth: "4.2vw",
        // maxWidth: "4.2vw",
        zIndex: 1,
      },
      "&.MuiButtonBase-root": {
        position: "relative",
        //top: "0px",
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: ".83vw",
        lineHeight: "1vw",
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",
        minHeight: "2.2vw",
        maxHeight: "2.2vw",
        // minWidth: "4.2vw",
        // maxWidth: "4.2vw",
        minWidth: "4.2vw",
        maxWidth: "4.2vw",
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
          paddingTop: ".28vw",
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
        bottom: ".13vw",

        paddingRight: "0vw",
      },

      "& .MuiTypography-root": {
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",

        fontSize: ".83vw",
        lineHeight: "1vw",
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
        // top: ".5vw",
        //paddingTop: ".5vw",
        // paddingLeft: "1vw",
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: ".83vw",
        lineHeight: "1vw",
        display: "flex",
        justifyContent: "center",
        textAlign: "center",
        //minHeight: "3.03vh",
        //minWidth: "4.26vw",
        zIndex: 1,

        color: "palette.text.primary",
        textTransform: "initial",
      },
    },
  };
};

export default style;
