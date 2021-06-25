import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    MuiDialog: {
     "& paper": {
        position: "absolute",
        height:" 135px",
        width: "284px",
        borderRadius: "4px",
        right: "2.8%",
        top: "7%",
      }
    }
  },
  dialogContent: {
    display: "flex",
    justifyContent: "space-between",
  },
  container: {
    display: "flex",
    margin: "15px auto 10px",
    width: "90%",
  },
  walletAction: {
    fontSize: "12px",
    marginTop: ".5rem",
    "& .MuiTypography-body1": {
      fontSize: "12px",
    }
  },
  divider: {
    border: "1px solid #DFDFDF !important",
    width: "100%",
    margin: ".5rem 0 0"
  },
  tezStyle: {
    "&.Element": {
      position: "absolute",
      // height:" 135px",
      // width: "284px",
      // right: "2.8%",
      // top: "7%",
      borderRadius: "4px",
      height: "135px",
      width: "284px",
      left: "1141px",
      top: "65px",
      background: "linear-gradient(92.04deg, rgba(171, 240, 255, 0.4) 4.41%, #F9FEFF 84.62%)",
    },
  },
}));

export default useStyles;