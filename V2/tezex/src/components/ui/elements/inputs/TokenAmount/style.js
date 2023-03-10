export const style = {
  leftInput: {
    gridContainter: {
      flexDirection: "row",
      borderRadius: "16px",
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
      padding: "0px 16px",
      textAlign: "right",
    },
    input: {
      //textAlign: "left",
      marginLeft: "2vw",
      fontSize: "1.25vw",
      lineHeight: "1.51vw",
    },
  },

  rightInput: {
    gridContainter: {
      darker: {
        flexDirection: "row",
        borderRadius: "16px",
        backgroundColor: "#F4F4F4",
      },
      lighter: {
        flexDirection: "row",
        borderRadius: "16px",
        backgroundColor: "#F9F9F9",
      },
    },
    textField: {
      "& .MuiInputBase-input": {
        position: "absolute",
        zIndex: 5,
        width: "100%",
      },
      justifyContent: "center",
      width: "100%",
      //height: "75px",
    },
    inputAdornmentStart: {
      box: {
        display: "flex",
        flexDirection: "column",
      },
      boxLabel: {
        fontSize: "1.2vw",
        marginLeft: "1vw",
        marginRight: "1vw",
        position: "relative",
        bottom: "1vw",
      },
      boxToken: {
        display: "flex",
        flexDirection: "row",
      },
      img: {
        marginLeft: "1vw",
        marginRight: "1vw",
        height: "1.61vw",
      },
      typography: {
        color: "#1E1E1E",
        fontWeight: "500",
        fontSize: "1.25vw",
      },
    },
    inputAdornmentEnd: {
      adornment: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "flex-end",
        width: "100%",
        padding: 0,
        zIndex: 0,

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
        position: "relative",
        bottom: "2vw",
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
