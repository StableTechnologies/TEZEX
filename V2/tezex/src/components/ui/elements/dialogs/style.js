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
        //top: "19vw",
        maxHeight: "21.04vw",
        maxWidth: "29.51vw",
        padding: "0px 0px 0px 0px",
        margin: "0px",
      },
      "& .MuiDialog-root": {
        height: "100%",
        width: "29.51vw",
        padding: "0px 0px 0px 0px",
        margin: "0px",
      },

      top: "19vw",
    },
    dialogContent: {
      "&.MuiDialogContent-root": {
        display: "flex",
        alignText: "center",
        alignItems: "center",
      },
    },
    alertIconBox: {},
    errorContentBox: {
      flexDirection: "column",
      display: "flex",
      alignItems: "center",

      textalign: "center",
    },
    errorText: {
      "&.MuiTypography-root": {
        display: "flex",

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
      width: "80%",
    },
    title: {
      "&.MuiTypography-root": {
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

      display: "flex",

      alignItems: "center",
      width: " 2.86vw",

      left: " .37vw",

      top: " .60vw",
    },
  };
};
export default style;
