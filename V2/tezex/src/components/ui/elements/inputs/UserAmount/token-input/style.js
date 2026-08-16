// eslint-disable-next-line
export const style = (theme, scale = 1) => {
  return {
    tezex: {
      root: {
        width: "100%",
        minHeight: { xs: "108px", sm: "116px" },
        padding: { xs: "16px", sm: "17px 18px" },
        border: "1px solid var(--tezex-line)",
        borderRadius: "17px",
        background: "var(--tezex-field)",
        transition: "border-color 160ms ease, background-color 160ms ease",
        "&:focus-within": {
          borderColor: "var(--tezex-line-strong)",
          background: "var(--tezex-field)",
        },
      },
      header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: "18px",
        marginBottom: "12px",
      },
      label: {
        color: "var(--tezex-muted)",
        fontSize: "11px",
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
      },
      balance: {
        color: "var(--tezex-muted)",
        fontFamily: '"Red Hat Mono", monospace',
        fontSize: "11px",
        fontWeight: 400,
      },
      validationMessage: {
        color: "#c94c4c",
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.04em",
        lineHeight: 1.2,
      },
      amountRow: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
      },
      textField: {
        minWidth: 0,
        flex: 1,
        "& .MuiInputBase-root": {
          color: "var(--tezex-text)",
        },
        "& .MuiInputBase-input": {
          padding: 0,
          color: "var(--tezex-text)",
          fontFamily: '"Red Hat Mono", monospace',
          fontSize: { xs: "25px", sm: "29px" },
          fontWeight: 500,
          lineHeight: 1.15,
          letterSpacing: "-0.03em",
          textAlign: "left",
          textOverflow: "ellipsis",
        },
        "& .MuiInputBase-input[readonly]": { cursor: "default" },
      },
      tokenPill: {
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
        gap: "8px",
        minHeight: "38px",
        padding: "5px 12px 5px 7px",
        background: "var(--tezex-panel-subtle)",
        border: "1px solid var(--tezex-line)",
        borderRadius: "999px",
      },
      tokenLabel: {
        color: "var(--tezex-text)",
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.02em",
      },
    },
    leftInput: {
      gridContainter: {
        flexDirection: "row",
        borderRadius: `calc(0.55vw * ${scale})`,
        backgroundColor: "background.default",
      },
      textField: {
        justifyContent: "center",
        width: "100%",
      },
      inputAdornment: {
        box: {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        },
        img: {
          marginRight: `calc(0.28vw * ${scale})`,
          height: `calc(1.61vw * ${scale})`,
        },
        typography: {
          fontSize: `calc(1.11vw * ${scale})`,
          marginRight: `calc(1vw * ${scale})`,
        },
      },
      balanceTypography: {
        padding: "0px 1.11vw",
        textAlign: "right",
      },
      input: {
        textAlign: "left",
        marginLeft: `calc(1.11vw * ${scale})`,
        fontSize: `calc(1.25vw * ${scale})`,
        lineHeight: `calc(1.51vw * ${scale})`,
      },
    },
    noScroll: {
      position: "fixed",
      width: "100%",
      overflow: "hidden",
    },
    gridContainter: {
      darker: {
        flexDirection: "row",
        borderRadius: `calc(1.11vw * ${scale})`,
        backgroundColor: "#F4F4F4",
        /*[theme.breakpoints.down("md")]: {
          borderRadius: "16px",
        },*/
      },
      lighter: {
        flexDirection: "row",
        borderRadius: `calc(1.11vw * ${scale})`,
        backgroundColor: "#F9F9F9",
        /*[theme.breakpoints.down("md")]: {
          borderRadius: "16px",
        },*/
      },
    },
    label: {
      color: "#828282",
      fontWeight: "500",
      fontSize: `calc(.97vw * ${scale})`,
      textAlign: "right",
      marginLeft: `calc(1vw * ${scale})`,
      /*[theme.breakpoints.down("md")]: {
        //          fontSize: "14px",
        //          marginLeft: "16px",
      },*/
    },
    textFieldTextAboveGrey: {
      "&.MuiFormControl-root": {
        display: "flex",
        width: "100%",
      },
      "& .MuiInputBase-input": {
        position: "absolute",
        zIndex: 5,
        width: "100%",
        right: `calc(1vw * ${scale})`,
        color: "#999999",
      },

      top: `calc(0vw * ${scale})`,

      justifyContent: "center",
      width: "80%",
      /*[theme.breakpoints.down("md")]: {
        right: `calc(1vw * ${scale})`,
      },*/
    },
    textFieldTextAbove: {
      "&.MuiFormControl-root": {
        display: "flex",
        width: "100%",
      },
      "& .MuiInputBase-input": {
        position: "absolute",
        zIndex: 5,
        width: "100%",
        right: `calc(1vw * ${scale})`,
      },

      top: `calc(0vw * ${scale})`,

      justifyContent: "center",
      width: "80%",
      /*[theme.breakpoints.down("md")]: {},*/
    },
    textFieldGrey: {
      "&.MuiFormControl-root": {
        display: "flex",
        width: "100%",
      },
      "& .MuiInputBase-input": {
        position: "absolute",
        zIndex: 5,
        width: "80%",
        right: `calc(1vw * ${scale})`,

        color: "#999999",
      },

      bottom: `calc(.8vw * ${scale})`,
      justifyContent: "center",
      /*[theme.breakpoints.down("md")]: {
        "& .MuiInputBase-input": {
          right: "14px",
        },
      },*/
    },
    textField: {
      "&.MuiFormControl-root": {
        display: "flex",
        width: "100%",
      },
      "& .MuiInputBase-input": {
        position: "absolute",
        zIndex: 5,
        width: "80%",
        right: `calc(1vw * ${scale})`,
      },

      bottom: `calc(.8vw * ${scale})`,
      justifyContent: "center",
      /*[theme.breakpoints.down("md")]: {},*/
    },
    inputAdornmentStart: {
      boxLabel: {
        "&.MuiBox-root": {
          display: "flex",
          position: "absolute",
          paddingTop: `calc(1.1vw * ${scale})`,
          /*[theme.breakpoints.down("md")]: {
            paddingTop: "16px",
          },*/
        },
        fontSize: `calc(1.2vw * ${scale})`,
        paddingBottom: ".1vh",
        /*[theme.breakpoints.down("md")]: {
          fontSize: "18px",
          paddingBottom: "1px",
        },*/
      },
      boxToken: {
        display: "flex",
        flexDirection: "row",
        paddingTop: "0px",
        /*[theme.breakpoints.down("md")]: {},*/
      },
      imgLarger: {
        position: "relative",
        alignSelf: "center",
        alignContent: "center",
        justifyContent: "center",
        alignItems: "center",
        display: "flex",
        // width: `calc(1.1vw * ${scale})`,
        marginLeft: `calc(1vw * ${scale})`,
        marginRight: `calc(1vw * ${scale})`,
        height: `calc(2.22vw * ${scale})`,
        /*[theme.breakpoints.down("md")]: {
          width: "32px",
          marginLeft: "16px",
          marginRight: "16px",
          height: "32px",
        },*/
      },
      img: {
        position: "relative",
        display: "flex",
        alignSelf: "center",
        alignContent: "center",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: `calc(1vw * ${scale})`,
        marginRight: `calc(1vw * ${scale})`,
        height: `calc(1.61vw * ${scale})`,
        marginTop: `calc(.1vw * ${scale})`,
        /*[theme.breakpoints.down("md")]: {
          marginLeft: "16px",
          marginRight: "16px",
          height: "24px",
          marginTop: "1px",
        },*/
      },

      typographyForLargerLogo: {
        color: "#1E1E1E",
        fontWeight: "500",
        fontSize: `calc(1.25vw * ${scale})`,
        marginTop: `calc(.15vw * ${scale})`,
        /*[theme.breakpoints.down("md")]: {},*/
      },
      typography: {
        color: "#1E1E1E",
        fontWeight: "500",
        fontSize: `calc(1.25vw * ${scale})`,
        /*[theme.breakpoints.down("md")]: {},*/
      },
    },
    inputAdornmentEnd: {
      adornmentLabelAbove: {
        display: "block",
        flexDirection: "row",
        justifyContent: "flex-end",
        width: "100%",
        bottom: `calc(4.1vw * ${scale})`,
        padding: 0,
        zIndex: 0,
        right: `calc(1vw * ${scale})`,

        "& .MuiBox-root": {
          minHeight: `calc(2vw * ${scale})`,
          maxHeight: `calc(2vw * ${scale})`,
        },
        "&.MuiInputAdornment-root": {
          position: "absolute",
        },
        /*[theme.breakpoints.down("md")]: {},*/
      },
      adornment: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
        width: "100%",
        padding: 0,
        zIndex: 0,

        position: "relative",
        bottom: `calc(3vw * ${scale})`,
        /*[theme.breakpoints.down("md")]: {},*/
      },

      button: {
        padding: "0px 0px 0px 0px",
        position: "absolute",
        top: `calc(1.11vw * ${scale})`,
        right: `calc(.3vw * ${scale})`,
        justifyContent: "flex-end",

        "&.MuiButtonBase-root": {
          "&:hover": {
            backgroundColor: "transparent",
          },
          minWidth: `calc(3vw * ${scale})`,
          maxWidth: `calc(3vw * ${scale})`,
        },
        /*[theme.breakpoints.down("md")]: {},*/
      },
      img: {
        width: `calc(.66vw * ${scale})`,
        /*[theme.breakpoints.down("md")]: {},*/
      },
      typography: {
        color: "#1E1E1E",
        fontWeight: "500",
        fontSize: `calc(1.25vw * ${scale})`,
        /*[theme.breakpoints.down("md")]: {},*/
      },
    },
    balance: {
      grid: {
        padding: "0px, 0px",
        display: "flex",
        justifyContent: "flex-end",
        width: "100%",
        height: "100%",

        position: "relative",
        top: `calc(4vw * ${scale})`,
        /*[theme.breakpoints.down("md")]: {},*/
      },
      typography: {
        color: "#999999",
        fontWeight: "400",
        fontSize: `calc(.97vw * ${scale})`,
        textAlign: "right",
        /*[theme.breakpoints.down("md")]: {},*/
      },
    },

    input: {
      textAlign: "right",
      fontSize: `calc(2.2vw * ${scale})`,
      /*[theme.breakpoints.down("md")]: {},*/
    },
  };
};
