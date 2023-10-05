// eslint-disable-next-line
const style = (theme, scale = 1) => {
  return {
    dialog: {
      "& .MuiModal-root": {
        display: "flex",
        alignItems: "center",
      },
      "& .MuiPaper-root": {
        position: "relative",
        display: "flex",
        borderRadius: `calc(1.38vw * ${scale})`,
        alignItems: "center",
        alignContent: "center",
        justifyContent: "space-around",
        height: `calc(21.04vw * ${scale})`,
        width: `calc(29.51vw * ${scale})`,
        minHeight: `calc(21.04vw * ${scale})`,
        minWidth: `calc(29.51vw * ${scale})`,
        maxHeight: `calc(21.04vw * ${scale})`,
        maxWidth: `calc(29.51vw * ${scale})`,
        padding: "0px 0px 0px 0px",
        margin: "0px",
      },
      "& .MuiDialog-container": {
        alignItems: "flex-start",
      },
      top: `calc(19vw * ${scale})`,
    },
    dialogContentBox: {
      width: "100%",
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
    dialogContentSuccess: {
      "&.MuiDialogContent-root": {
        width: "100%",
        zindex: "3",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 0 calc(4vw * ${scale}) 0",
        display: "flex",
        alignText: "center",
      },
    },
    successIconBox: {},
    alertIconBox: {},

    successContentBox: {
      width: "100%",
      flexDirection: "column",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    },
    successContentTextBox: {
      "& .MuiDialogContent-root": {
        padding: "0 0 calc(4.16vw * ${scale}) 0",
      },
      flexDirection: "row",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
    },
    successText: {
      "&.MuiTypography-root": {
        position: "absolute",
        display: "flex",
        left: "0px",
        padding: `calc(2vw * ${scale}) calc(1vw * ${scale}) 0 calc(2vw * ${scale}) `,
        fontFamily: "Inter",
        color: "#000000",
        fontSize: ` calc(1.11vw * ${scale})`,
        fontWeight: `calc(400vw * ${scale})`,
        lineHeight: `calc(1.319vw * ${scale})`,
        letterSpacing: "0em",
        textalign: "right",
        alignText: "center",
        alignItems: "center",
        justifyContent: "flex-start",
      },
    },
    errorContentBox: {
      width: "100%",
      flexDirection: "column",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      textalign: "center",
    },
    errorText: {
      "&.MuiTypography-root": {
        display: "flex",
        padding: `calc(.5vw * ${scale}) calc(6.3vw * ${scale}) calc(2.6vw * ${scale}) calc(5.3vw * ${scale}) `,
        fontFamily: "Inter",
        fontSize: " calc(1.11vw * ${scale})",
        fontWeight: `calc(400vw * ${scale})`,
        lineHeight: `calc(1.319vw * ${scale})`,
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
        padding: `calc(1.9vw * ${scale}) calc(2vw * ${scale}) calc(1.1vw * ${scale}) calc(2vw * ${scale})`,
        fontFamily: "Inter",
        fontSize: ` calc(1.66vw * ${scale})`,
        fontWeight: "500",
        lineHeight: `calc(2vw * ${scale})`,
      },
    },
    title: {
      justifyContent: `space-between`,
      display: "flex",
      flexDirection: "row",
    },
    titleTypography: {
      padding: "0px 0px 0px 0px",
      "&.MuiTypography-root": {
        padding: "0px 0px 0px 0px",
        color: "#000000",
        fontFamily: "Inter",
        fontSize: ` calc(1.66vw * ${scale})`,
        fontWeight: "500",
        lineHeight: `calc(2vw * ${scale})`,
      },
    },
    closeIcon: {
      height: `calc(.61vw * ${scale})`,
      width: `calc(.61vw * ${scale})`,
    },
    tickIcon: {
      height: " calc(4.16vw * ${scale})",
      alignItems: "center",
      width: " calc(4.16vw * ${scale})",
    },
    copyButton: {
      marginLeft: `calc(.42vw * ${scale})`,
      "&.MuiButtonBase-root": {
        minHeight: ` calc(.79vw * ${scale})`,
        minWidth: ` calc(.92vw * ${scale})`,
      },
      maxHeight: ` calc(.79vw * ${scale})`,
      maxWidth: ` calc(.92vw * ${scale})`,
      height: ` calc(.79vw * ${scale})`,
      width: ` calc(.92vw * ${scale})`,
      alignItems: "center",
    },
    copyIcon: {
      marginTop: `calc(.2vw * ${scale})`,
      height: " calc(.79vw * ${scale})",
      width: " calc(.92vw * ${scale})",
      alignItems: "center",
    },
    alertIcon: {
      height: ` calc(2.55vw * ${scale})`,
      alignItems: "center",
      width: ` calc(2.86vw * ${scale})`,
      left: ` calc(.37vw * ${scale})`,
      top: ` calc(.60vw * ${scale})`,
    },

    button: {
      height: `calc(2.70vw * ${scale})`,
      width: `calc(8.54vw * ${scale})`,
      borderRadius: `calc(.55vw * ${scale})`,
      "&.MuiButton-root.Mui-disabled": {
        color: "white",
      },
      background: "#1E1E1E",
      color: "white",
      fontWeight: "500",
      fontSize: `calc(1.11vw * ${scale})`,
      lineHeight: `calc(1.34vw * ${scale})`,
      textTransform: "none",
      "&:hover": {
        background: "#000",
      },
    },
    action: {
      paddingBottom: `calc(2.22vw * ${scale})`,
    },
  };
};
export default style;
