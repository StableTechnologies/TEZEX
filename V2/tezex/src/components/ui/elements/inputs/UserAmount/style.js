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
        },
        img: {
          marginRight: "1vw",
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
        marginLeft: "2vw",
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
        },
        lighter: {
          flexDirection: "column",
          borderRadius: "1.11vw",
          backgroundColor: "#F9F9F9",
        },
      },
      label: {
        color: "#828282",
        fontWeight: "500",
        fontSize: ".97vw",
        textAlign: "right",
        marginLeft: "1vw",
      },
      textFieldTextAboveGrey: {
        "& .MuiInputBase-input": {
          position: "absolute",
          zIndex: 5,
          width: "100%",
          right: "1vw",
          color: "#999999",
          //marginTop: "10px",
        },

        //	bottom: "1.5vw",

        top: "0vw",
        //	right: "2vw",
        justifyContent: "center",
        width: "80%",
        // height: "75px",
      },
      textFieldTextAbove: {
        "& .MuiInputBase-input": {
          position: "absolute",
          zIndex: 5,
          width: "100%",
          right: "1vw",

          //marginTop: "10px",
        },

        //	bottom: "1.5vw",

        top: "0vw",
        //	right: "2vw",
        justifyContent: "center",
        width: "80%",
        // height: "75px",
      },
      textFieldGrey: {
        "& .MuiInputBase-input": {
          position: "absolute",
          zIndex: 5,
          width: "80%",
          right: "1vw",

          color: "#999999",
        },

        bottom: ".8vw",
        justifyContent: "center",
        //	height: "75px",
      },
      textField: {
        "& .MuiInputBase-input": {
          position: "absolute",
          zIndex: 5,
          width: "80%",
          right: "1vw",
        },

        bottom: ".8vw",
        justifyContent: "center",
        //	height: "75px",
      },
      inputAdornmentStart: {
        boxLabel: {
          "&.MuiBox-root": {
            display: "flex",
            position: "absolute",
            paddingTop: "1.1vw",

            // width: "100%",
          },

          fontSize: "1.2vw",
          //marginLeft: "1vw",
          //marginRight: "1vw",

          //marginBottom: "10vw",
          //	marginTop: "1.56vh",
          paddingBottom: ".1vh",
          //position: "relative",
          //bottom: "1vw",
        },
        boxToken: {
          display: "flex",
          flexDirection: "row",
          paddingTop: "0px",
        },
        imgLarger: {
          marginLeft: "1vw",
          marginRight: "1vw",
          height: "2.22vw",
        },
        img: {
          marginLeft: "1vw",
          marginRight: "1vw",
          height: "1.61vw",

          marginTop: ".1vw",
        },
        typographyForLargerLogo: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: "1.25vw",
          marginTop: ".15vw",
        },
        typography: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: "1.25vw",
          //	paddingBottom: "1vw",
        },
      },
      inputAdornmentEnd: {
        adornmentLabelAbove: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          width: "100%",
          padding: 0,
          zIndex: 0,
          right: "1vw",

          position: "relative",
          bottom: "3vw",
        },
        adornment: {
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          width: "100%",
          padding: 0,
          zIndex: 0,
          //right: "1vw",

          position: "relative",
          bottom: "3vw",
        },
        button: {
          justifyContent: "flex-end",
          width: "100%",
        },
        img: {
          width: ".66vw",
        },
        typography: {
          color: "#1E1E1E",
          fontWeight: "500",
          fontSize: "1.25vw",
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
          //right: "1vw",
        },
        typography: {
          color: "#999999",
          fontWeight: "400",
          fontSize: ".97vw",
          textAlign: "right",
        },
      },

      input: {
        textAlign: "right",
        fontSize: "2.2vw",
      },
    },
  };
};
