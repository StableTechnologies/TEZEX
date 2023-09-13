// eslint-disable-next-line
export const style = (theme) => {
  return {
    leftInput: {
      gridContainter: {
        flexDirection: "row",
        borderRadius: "0.55vw",
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
          marginRight: "0.28vw",
          height: "1.61vw",
        },
        typography: {
          fontSize: "1.11vw",
          marginRight: "1vw",
        },
      },
      balanceTypography: {
        padding: "0px 1.11vw",
        textAlign: "right",
      },
      input: {
        textAlign: "left",
        marginLeft: "1.11vw",
        fontSize: "1.25vw",
        lineHeight: "1.51vw",
      },
    },

    rightInput: {
      gridContainter: {
        darker: {
          flexDirection: "row",
          borderRadius: "1.11vw",
          backgroundColor: "#F4F4F4",
          [theme.breakpoints.down("md")]: {
            borderRadius: "16px",
          },
        },
        lighter: {
          flexDirection: "row",
          borderRadius: "1.11vw",
          backgroundColor: "#F9F9F9",
          [theme.breakpoints.down("md")]: {
            borderRadius: "16px",
          },
        },
      },
      label: {
        color: "#828282",
        fontWeight: "500",
        fontSize: ".97vw",
        textAlign: "right",
        marginLeft: "1vw",
        [theme.breakpoints.down("md")]: {
          //          fontSize: "14px",
          //          marginLeft: "16px",
        },
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
          right: "1vw",
          color: "#999999",
        },

        top: "0vw",

        justifyContent: "center",
        width: "80%",
        [theme.breakpoints.down("md")]: {
          right: "1vw",
        },
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
          right: "1vw",
        },

        top: "0vw",

        justifyContent: "center",
        width: "80%",
        [theme.breakpoints.down("md")]: {},
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
          right: "1vw",

          color: "#999999",
        },

        bottom: ".8vw",
        justifyContent: "center",
        [theme.breakpoints.down("md")]: {
          "& .MuiInputBase-input": {
            right: "14px",
          },
        },
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
          right: "1vw",
        },

        bottom: ".8vw",
        justifyContent: "center",
        [theme.breakpoints.down("md")]: {},
      },
      inputAdornmentStart: {
        boxLabel: {
          "&.MuiBox-root": {
            display: "flex",
            position: "absolute",
            paddingTop: "1.1vw",
            [theme.breakpoints.down("md")]: {},
          },

          fontSize: "1.2vw",

          paddingBottom: ".1vh",
        },
        boxToken: {
          display: "flex",
          flexDirection: "row",
          paddingTop: "0px",
          [theme.breakpoints.down("md")]: {},
        },
        imgLarger: {
          position: "relative",
          dislpay: "flex",
          width: "1.1vw",
          marginLeft: "1vw",
          marginRight: "1vw",
          height: "2.22vw",

          [theme.breakpoints.down("md")]: {
            height: "23px",
            width: "23px",
          },
        },
        img: {
          marginLeft: "1vw",
          marginRight: "1vw",
          height: "1.61vw",

          marginTop: ".1vw",
          [theme.breakpoints.down("md")]: {},
        },
        typographyForLargerLogo: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: "1.25vw",
          marginTop: ".15vw",
          [theme.breakpoints.down("md")]: {},
        },
        typography: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: "1.25vw",
          [theme.breakpoints.down("md")]: {},
        },
      },
      inputAdornmentEnd: {
        adornmentLabelAbove: {
          display: "block",
          flexDirection: "row",
          justifyContent: "flex-end",
          width: "100%",
          bottom: "4.1vw",
          padding: 0,
          zIndex: 0,
          right: "1vw",

          "& .MuiBox-root": {
            minHeight: "2vw",
            maxHeight: "2vw",
          },
          "&.MuiInputAdornment-root": {
            position: "absolute",
          },
          [theme.breakpoints.down("md")]: {},
        },
        adornment: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          width: "100%",
          padding: 0,
          zIndex: 0,

          position: "relative",
          bottom: "3vw",
          [theme.breakpoints.down("md")]: {},
        },

        button: {
          padding: "0px 0px 0px 0px",
          position: "absolute",
          top: "1.11vw",
          right: ".3vw",
          justifyContent: "flex-end",

          "&.MuiButtonBase-root": {
            "&:hover": {
              backgroundColor: "transparent",
            },
            minWidth: "3vw",
            maxWidth: "3vw",
          },
          [theme.breakpoints.down("md")]: {},
        },
        img: {
          width: ".66vw",
          [theme.breakpoints.down("md")]: {},
        },
        typography: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: "1.25vw",
          [theme.breakpoints.down("md")]: {},
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
          top: "4vw",
          [theme.breakpoints.down("md")]: {},
        },
        typography: {
          color: "#999999",
          fontWeight: "400",
          fontSize: ".97vw",
          textAlign: "right",
          [theme.breakpoints.down("md")]: {},
        },
      },

      input: {
        textAlign: "right",
        fontSize: "2.2vw",
        [theme.breakpoints.down("md")]: {},
      },
    },

    slippageInput: {
      box: {
        "&.MuiBox-root": {
          paddingTop: ".28vw",
          paddingRight: "0vw",
          paddingLeft: "0vw",

          display: "flex",
          position: "relative",
          flexDirection: "row",
          width: "4.5ch",
          alignItems: "center",
          justifyContent: "space-between",
          [theme.breakpoints.down("md")]: {},
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
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",
        fontSize: ".83vw",
        lineHeight: "1vw",
        display: "flex",
        justifyContent: "center",
        textAlign: "center",

        zIndex: 1,

        color: "palette.text.primary",
        textTransform: "initial",
        [theme.breakpoints.down("md")]: {},
      },
    },
  };
};
