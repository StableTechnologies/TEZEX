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
        // height: `calc(24.04vw * ${scale})`,
        width: `calc(26.51vw * ${scale})`,
        minHeight: `calc(24.04vw * ${scale})`,
        minWidth: `calc(26.51vw * ${scale})`,
        // maxHeight: `calc(24.04vw * ${scale})`,
        maxWidth: `calc(26.51vw * ${scale})`,
        boxShadow: "inset 0px 0px 5px 3px rgba(199, 199, 199, 0.9)",
        padding: "20px",
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
      padding: 0,
      width: "100%",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      overflow: "hidden",
    },
    successIconBox: {},
    alertIconBox: {
      paddingBottom: `calc(4.2vw * ${scale})`,
      paddingTop: `calc(3.5vw * ${scale})`,
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
        padding: `calc(.5vw * ${scale}) calc(2.3vw * ${scale}) 0 calc(2.3vw * ${scale}) `,
        fontFamily: "Inter",
        fontSize: ` calc(1.11vw * ${scale})`,
        fontWeight: 600,
        lineHeight: `calc(1.319vw * ${scale})`,
        letterSpacing: "0em",
        textalign: "center",
      },
    },
    tickIcon: {
      height: ` calc(4.4vw * ${scale})`,
      alignItems: "center",
      width: ` calc(4.4vw * ${scale})`,
    },
    copyButton: {
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
      height: ` calc(.9vw * ${scale})`,
      width: ` calc(1vw * ${scale})`,
      alignItems: "center",
    },
    alertIcon: {
      height: ` calc(4.4vw * ${scale})`,
      alignItems: "center",
      width: ` calc(4.4vw * ${scale})`,
    },
    button: {
      width: "100%",
      height: "100%",
      borderRadius: `calc(.9vw * ${scale})`,
      color: "white",
      fontWeight: "500",
      lineHeight: `calc(1.34vw * ${scale})`,
      textTransform: "none",
      padding: 0,
      fontSize: "large !important",
    },
    buttonSuccess: {
      backgroundColor: "#3949AB",
      "&.MuiButton-root.Mui-disabled": {
        color: "rgba(255, 255, 255, 0.7)",
        backgroundColor: "#9FA8DA",
      },
      "&:hover": {
        backgroundColor: "#303F9F",
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.2)",
      },
    },
    buttonError: {
      backgroundColor: "#E74C3C",
      "&:hover": {
        backgroundColor: "#C0392B",
      },
      "&.MuiButton-root.Mui-disabled": {
        color: "rgba(255, 255, 255, 0.7)",
        backgroundColor: "#F1A9A0",
      },
    },
    action: {
      width: "100%",
      height: `calc(3.4vw * ${scale})`,
      padding: 0,
    },
    assetIcon: {
      width: "16px",
      height: "16px",
      paddingRight: "3px",
    },
    title: {
      fontFamily: "Inter",
      fontWeight: 700,
      color: "#2C3E50",
    },
    description: {
      fontFamily: "Inter",
      fontWeight: 400,
      color: "#34495E",
      paddingRight: "3px",
    },
    descriptionHighlight: {
      fontFamily: "Inter",
      fontWeight: 600,
      color: "#34495E",
      paddingRight: "3px",
    },
    successLinks: {
      borderTop: "2px solid #E0E0E0",
      paddingTop: `calc(.5vw * ${scale})`,
      paddingBottom: `calc(.5vw * ${scale})`,
      width: "100%",
      alignItems: "center",
      display: "flex",
      flexDirection: "row",
      justifyContent: "space-between",
      alignContent: "center",
    },
    explorerLink: {
      color: "#00838F",
      textDecoration: "none",
      "&:hover": {
        textDecoration: "underline",
      },
    },
    transferResults: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      paddingBottom: "8px",
      paddingTop: "12px",
    },
    errorDetailsButton: {
      width: "100%",
      color: "text.secondary",
      textTransform: "none",
      display: "flex",
      justifyContent: "space-between",
      padding: `calc(0.5vw * ${scale}) 0`,
    },
    errorDetailsContent: {
      padding: `calc(1vw * ${scale})`,
      backgroundColor: "rgba(0, 0, 0, 0.03)",
      borderRadius: `calc(0.5vw * ${scale})`,
      marginBottom: `calc(0.5vw * ${scale})`,
    },
    errorDetails: {
      width: "100%",
      color: "text.secondary",
      textTransform: "none",
      display: "flex",
      justifyContent: "space-between",
      py: 1,
    },
    errorDetailsContainer: {
      width: "100%",
      mt: 3,
      borderTop: "2px solid #E0E0E0",
    },
  };
};
export default style;
