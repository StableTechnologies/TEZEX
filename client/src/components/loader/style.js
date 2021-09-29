import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  loader: {
    color: "black",
    fontSize: "2vw",
  },
  msg: {
    margin: "2vw",
    fontSize: "1rem",
    color: "#828282",
    '@media(max-width: 376px)': {
      fontSize: ".8rem",
      margin: " 0 0 0 .7rem",
      padding: " .5rem 0",
    },
  },
  container: {
    height: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
  },
}));

export default useStyles;
