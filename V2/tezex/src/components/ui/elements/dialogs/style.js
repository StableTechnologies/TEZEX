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
        //t right bot left
        padding: "1vw 6.3vw 3.19vw 5.3vw ",
        fontFamily: "Inter",
        fontSize: " 1.11vw",
        fontWeight: "400vw",
        lineHeight: "1.319vw",
        letterSpacing: "0em",
        textalign: "center",
      },
    },
    titleBox: {
      // padding: "1.9vw 0 0 2.5vw",
      // paddingLeft: "3.2vw",
      //paddingRight: "1.9vw",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      width: "100%",

      "& .MuiTypography-root": {
        padding: "1.9vw 2vw",
        fontFamily: "Inter",
        fontSize: " 1.66vw",
        fontWeight: "500",
        lineHeight: "2vw",
      },
    },
    title: {
      //minWidth: "100%",
      justifyContent: "space-between",
      display: "flex",
      flexDirection: "row",
      // paddingLeft: "2.2vw", // 0 0 2.5vw",
      //:paddingRight: "1.9vw", // 0 0 2.5vw",

      //	    padding: "0 0 0 0",
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

      display: "flex",

      alignItems: "center",
      width: " 2.86vw",

      left: " .37vw",

      //top: " .60vw",
    },

    button: {
      height: "2.70vw",

      width: "8.54vw",

      // left  :"10.48vw",

      // top  :"16.11vw",

      borderRadius: ".55vw",

      //padding  :".69vw 1.11vw  .69vw 1.11vw",

      "&.MuiButton-root.Mui-disabled": {
        color: "white",
      },
      background: "#1E1E1E",
      color: "white",

      //border: "1px solid black",
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
