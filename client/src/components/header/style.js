import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  header: {
    display: "flex",
    padding: "1.5vw",
    fontSize: "1.5vw",
    justifyContent: "space-between",
    marginBottom: "1vw",
  },
  account: {
    padding: "0.6vw",
    border: "0.2vw black solid",
    borderRadius: "2vw",
    height: "fit-content",
    width: "28vw",
    marginTop: "1vw",
  },
  button: {
    color: "white",
    border: "0.2vw black solid",
    cursor: "pointer",
    margin: "1.5vw 0.7vw",
    outline: "none",
    padding: "0.4vw 0.2vw",
    fontSize: "1.2vw",
    fontWeight: "bold",
    borderRadius: "0.5vw",
    backgroundColor: "black",
    width: "8vw",
    "&:hover": {
      backgroundColor: "white",
      color: "black",
    },
  },
  logo: {
    width: "36vw",
    display: "block",
    margin: "1vw auto",
    padding: "0 4vw",
  },
  nav: {},
}));

export default useStyles;
