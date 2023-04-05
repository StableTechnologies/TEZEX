// eslint-disable-next-line
const style = (theme) => {
  return {
    slippageTabsRoot: {
      display: "inline-flex",
      position: "relative",
      width: "100%",
      alignItems: "center",
      justifyContent: "space-between",
      minHeight: "3.8vh",

      maxWidth: "15vw",
      paddingRight: "0px",
      border: "1px solid #EDEDED",
    },
    slippageTab: {
      "&.MuiButton-root.Mui-disabled": {
        backgroundColor: "transparent",
        "&:after": {
          zindex: 0,

          display: "flex",
          position: "absolute",
          top: 0,
          left: 4,
          right: 4,
          bottom: 0,

          borderRadius: "8px",
          backgroundColor: "transparent",
        },
      },
      "&.MuiButtonBase-root": {
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: ".83vw",
        lineHeight: "1vw",
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",

        minWidth: "4.2vw",
        zIndex: 1,

        backgroundColor: "selectedHomeTab.main",
        color: "palette.text.primary",
        textTransform: "initial",

        "&:after": {
          display: "flex",

          alignItems: "center",
          justifyContent: "center",
          position: "absolute",
          top: 0,
          left: 4,
          right: 4,
          bottom: 0,

          borderRadius: "8px",
          backgroundColor: "selectedHomeTab.main",
        },
      },
      wrapper: {
        color: "palette.text.primary",
        textTransform: "initial",
      },
    },

    slippageInput: {
      "& .MuiButtonBase-root": {
        zIndex: 3,
      },
      "& .MuiInputAdornment-root": {
        display: "flex",
        paddingTop: ".5vw",

        paddingRight: "2.5vw",
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
        minHeight: "3.03vh",
      },

      "& .MuiFormControl-root": {
        display: "inline-flex",

        alignItems: "center",
        justifyContent: "center",
      },

      "& .MuiInputBase-root": {
        paddingTop: ".5vw",
        paddingLeft: "1vw",
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: ".83vw",
        lineHeight: "1vw",
        display: "inline-flex",
        justifyContent: "center",
        textAlign: "center",
        minHeight: "3.03vh",

        minWidth: "4.26vw",
        zIndex: 1,

        color: "palette.text.primary",
        textTransform: "initial",
      },
    },
  };
};

export default style;
