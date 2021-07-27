import { makeStyles } from "@material-ui/core/styles";

export const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiDialog-paper": {
      textAlign: "center",
      borderRadius: "24px",
    },
  },

  img: {
    marginBottom: "-4px"
  },

  p1: {
    margin: "2rem auto",
    fontWeight: "500",
    color: "#000"
  },

  p2: {
    color: "#828282",
  },

  close: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1)
  },

  button: {
    "&.Element": {
      width: "152px",
      height: "48px",
      backgroundColor: "#000",
      margin: "1.5rem 1rem",
      color: "white",
      border: "1px solid black",
      borderRadius: "8px",
      fontWeight: "500",
      fontSize: "1.5rem",
      lineHeight: "29px",
      letterSpacing: "0.01em",
      textTransform: 'none',
    '@media (max-width: 600px)': {
      margin: "1rem .2rem",
    }
  },
},

}));

