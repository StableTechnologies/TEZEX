const style = {
  wallet: {
    width: "28.33vw",
    height: "4.16vw",
    position: "absolute",
    top: "79.4%",
    justifyContent: "center",
  },
  useMaxTypographyDisabled: {
    fontSize: ".97vw",
    lineHeight: "1.176vw",
    color: "#999999;",
  },
  useMaxTypographyEnabled: {
    fontSize: ".97vw",
    lineHeight: "1.176vw",
    color: "#00A0E4",
  },
  cardContentBox: {
    display: "flex",

    position: "absolute",
    top: "16.87%",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
  },
  headerTypography: {
    fontSize: "1.4vw",
  },
  cardHeader: {
    paddingBottom: "0px",
    fontSize: "1vw",
    textAlign: "left",
  },
  cardcontent: {
    "&.MuiCardContent-root": {
      paddingTop: "0px",
    },
    "& .MuiFormControl-root": {
      width: "28.34vw",
      height: "6.94vw",
    },
  },
  cardAction: {
    justifyContent: "center",
  },
  slippageContainer: {
    background: "black",
    flexDirection: "row",
    position: "absolute",
    zIndex: 5,
    display: "flex",
    alignItems: "center",
    minWidth: 408,
    bottom: "17%",
    "& .MuiGrid2-root": {},
  },

  slippageComponent: {
    "& .MuiGrid2-root": {},
  },
  slippage: {
    text: {},
  },

  input1: {
    position: "relative",

    "& .MuiFormControl-root": {
      width: "21.45vw",
      height: "3.8vw",
    },
  },
  card: {
    overflow: "hidden",
    position: "relative",
    height: "26.04vw",
    width: "30.56vw",
    borderRadius: "1.38vw",
    zIndex: 999,
    background: "#FFFFFF",
    border: "1px solid #E1E1E1",
    "& .MuiCardContent-root": {
      padding: "8px",
    },
  },
  paper: {
    background: "#F9F9F9",
    borderRadius: "20px",
    border: "1px solid #E1E1E1",
    minHeight: "146px",
    position: "relative",
    bottom: "10%",
    zIndex: -1,
    marginBottom: "20px",
  },
  root: {
    display: "flex",
    position: "relative",
    justifyContent: "center",
  },
};

export default style;
