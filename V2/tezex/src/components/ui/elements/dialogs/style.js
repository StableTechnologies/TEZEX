// eslint-disable-next-line
const style = (theme) => {
  return {
    dialog: {
      "& .MuiModal-root": {
        display: "flex",
        alignItems: "center",
      },
      "& .MuiPaper-root": {
        position: "absolute",
        display: "flex",
        borderRadius: "1.38vw",

        alignItems: "center",
        height: "21.04vw",
        width: "29.51vw",
        minHeight: "21.04vw",
        minWidth: "29.51vw",

        maxHeight: "21.04vw",
        maxWidth: "29.51vw",
        padding: "0px 0px 0px 0px",
        margin: "0px",
      },
      "& .MuiDialog-container": {
        alignItems: "flex-start",
      },

      top: "19vw",
    },
    dialogContent: {
      "&.MuiDialogContent-root": {
        zindex: "3",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 0 0 0",
        display: "flex",
        alignText: "center",
      },
    },
    alertIconBox: {},
    errorContentBox: {
      flexDirection: "column",
      display: "flex",
      alignItems: "center",

      justifyContent: "center",
      textalign: "center",
    },
    errorText: {
      "&.MuiTypography-root": {
        display: "flex",

        padding: ".5vw 6.3vw 2.6vw 5.3vw ",
        fontFamily: "Inter",
        fontSize: " 1.11vw",
        fontWeight: "400vw",
        lineHeight: "1.319vw",
        letterSpacing: "0em",
        textalign: "center",
      },
    },
    titleBox: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",

      "& .MuiTypography-root": {
        color: "#000000",
        padding: "1.9vw 2vw 1.1vw 2vw",
        fontFamily: "Inter",
        fontSize: " 1.66vw",
        fontWeight: "500",
        lineHeight: "2vw",
      },
    },
    title: {
      justifyContent: "space-between",
      display: "flex",
      flexDirection: "row",
    },
    titleTypography: {
      padding: "0px 0px 0px 0px",
      "&.MuiTypography-root": {
        padding: "0px 0px 0px 0px",
        fontFamily: "Inter",
        fontSize: " 1.66vw",
        fontWeight: "500",
        lineHeight: "2vw",
      },
    },
    closeIcon: {
      height: ".61vw",

      width: ".61vw",
    },
    alertIcon: {
      height: " 2.55vw",

      alignItems: "center",
      width: " 2.86vw",

      left: " .37vw",

      top: " .60vw",
    },

    button: {
      height: "2.70vw",

      width: "8.54vw",

      borderRadius: ".55vw",

      "&.MuiButton-root.Mui-disabled": {
        color: "white",
      },
      background: "#1E1E1E",
      color: "white",

      fontWeight: "500",
      fontSize: "1.11vw",
      lineHeight: "1.34vw",

      textTransform: "none",
      "&:hover": {
        background: "#000",
      },
    },
    action: {
      paddingBottom: "2.22vw",
    },
  };
};
export default style;
