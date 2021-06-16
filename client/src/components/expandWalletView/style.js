import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    MuiDialog: {
     "& $paper": {
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
}));

export default useStyles;