import { makeStyles } from "@material-ui/core/styles";

export const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paper": {
      textAlign: "center",
      borderRadius: "24px",
    },
  },

  close: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1)
  },

  completed: {
    width: "160px",
    width: "160px",
  },

}));

