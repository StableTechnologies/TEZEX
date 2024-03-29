// eslint-disable-next-line
export const style = (theme, scale = 1) => {
  return {
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

    rightInput: {
      gridContainter: {
        darker: {
          flexDirection: "row",
          borderRadius: `calc(1.11vw * ${scale})`,
          backgroundColor: "#F4F4F4",
          [theme.breakpoints.down("md")]: {
            borderRadius: "16px",
          },
        },
        lighter: {
          flexDirection: "row",
          borderRadius: `calc(1.11vw * ${scale})`,
          backgroundColor: "#F9F9F9",
          [theme.breakpoints.down("md")]: {
            borderRadius: "16px",
          },
        },
      },
      label: {
        color: "#828282",
        fontWeight: "500",
        fontSize: `calc(.97vw * ${scale})`,
        textAlign: "right",
        marginLeft: `calc(1vw * ${scale})`,
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
          right: `calc(1vw * ${scale})`,
          color: "#999999",
        },

        top: `calc(0vw * ${scale})`,

        justifyContent: "center",
        width: "80%",
        [theme.breakpoints.down("md")]: {
          right: `calc(1vw * ${scale})`,
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
          right: `calc(1vw * ${scale})`,
        },

        top: `calc(0vw * ${scale})`,

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
          right: `calc(1vw * ${scale})`,

          color: "#999999",
        },

        bottom: `calc(.8vw * ${scale})`,
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
          right: `calc(1vw * ${scale})`,
        },

        bottom: `calc(.8vw * ${scale})`,
        justifyContent: "center",
        [theme.breakpoints.down("md")]: {},
      },
      inputAdornmentStart: {
        boxLabel: {
          "&.MuiBox-root": {
            display: "flex",
            position: "absolute",
            paddingTop: `calc(1.1vw * ${scale})`,
            [theme.breakpoints.down("md")]: {},
          },

          fontSize: `calc(1.2vw * ${scale})`,

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
          width: `calc(1.1vw * ${scale})`,
          marginLeft: `calc(1vw * ${scale})`,
          marginRight: `calc(1vw * ${scale})`,
          height: `calc(2.22vw * ${scale})`,

          [theme.breakpoints.down("md")]: {
            height: "23px",
            width: "23px",
          },
        },
        img: {
          marginLeft: `calc(1vw * ${scale})`,
          marginRight: `calc(1vw * ${scale})`,
          height: `calc(1.61vw * ${scale})`,

          marginTop: `calc(.1vw * ${scale})`,
          [theme.breakpoints.down("md")]: {},
        },
        typographyForLargerLogo: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: `calc(1.25vw * ${scale})`,
          marginTop: `calc(.15vw * ${scale})`,
          [theme.breakpoints.down("md")]: {},
        },
        typography: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: `calc(1.25vw * ${scale})`,
          [theme.breakpoints.down("md")]: {},
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
          bottom: `calc(3vw * ${scale})`,
          [theme.breakpoints.down("md")]: {},
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
          [theme.breakpoints.down("md")]: {},
        },
        img: {
          width: `calc(.66vw * ${scale})`,
          [theme.breakpoints.down("md")]: {},
        },
        typography: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: `calc(1.25vw * ${scale})`,
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
          top: `calc(4vw * ${scale})`,
          [theme.breakpoints.down("md")]: {},
        },
        typography: {
          color: "#999999",
          fontWeight: "400",
          fontSize: `calc(.97vw * ${scale})`,
          textAlign: "right",
          [theme.breakpoints.down("md")]: {},
        },
      },

      input: {
        textAlign: "right",
        fontSize: `calc(2.2vw * ${scale})`,
        [theme.breakpoints.down("md")]: {},
      },
    },

    slippageInput: {
      box: {
        "&.MuiBox-root": {
          paddingTop: `calc(.28vw * ${scale})`,
          paddingRight: `calc(0vw * ${scale})`,
          paddingLeft: `calc(0vw * ${scale})`,

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
        bottom: `calc(.13vw * ${scale})`,

        paddingRight: `calc(0vw * ${scale})`,
      },

      "& .MuiTypography-root": {
        fontFamily: "Inter",
        fontStyle: "normal",
        fontWeight: "500",

        fontSize: `calc(.83vw * ${scale})`,
        lineHeight: `calc(1vw * ${scale})`,
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
        fontSize: `calc(.83vw * ${scale})`,
        lineHeight: `calc(1vw * ${scale})`,
        display: "flex",
        justifyContent: "center",
        textAlign: "center",

        zIndex: 1,

        color: "text.primary",
        textTransform: "initial",
        [theme.breakpoints.down("md")]: {},
      },
    },
  };
};
