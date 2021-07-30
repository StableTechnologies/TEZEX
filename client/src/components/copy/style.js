import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiButton-text": {
      padding: "4px 8px",
      minWidth: "0",
      marginTop: "-.3rem",
     },
  },

  copyImg: {
    width: "20px",
    height: "20px",
  }
}));

export default useStyles;