import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  container: {
    width: "100%",
  },
  button: {
    color: "white",
    cursor: "pointer",
    padding: "0.4vw",
    background: "black",
    fontWeight: "bold",
    borderRadius: "0.4vw",
    fontSize: "1.2vw",
    outline: "none",
    border: "0.2vw black solid",
    "&:hover": {
      backgroundColor: "white",
      color: "black",
    },
  },
  form: {
    display: "flex",
    flexDirection: "column",
    width: "31%",
    margin: "0 auto",
    padding: "2vw 3vw 1vw 3vw",
    border: "0.3vw black solid",
    borderRadius: "1vw",
  },
  input: { margin: "1vw", fontSize: "1.2vw" },
  submit: {
    color: "white",
    width: "fit-content",
    margin: "1vw auto",
    padding: "0.5vw",
    fontWeight: "bold",
    borderRadius: "0.3vw",
    backgroundColor: "black",
    cursor: "pointer",
    fontSize: "1.2vw",
    outline: "none",
    border: "0.2vw black solid",
    "&:hover": {
      backgroundColor: "white",
      color: "black",
    },
  },
  intro: {
    margin: "3vw 0",
    fontSize: "1.5vw",
  },
  logo: {
    width: "36vw",
    display: "block",
    margin: "5vw auto",
    padding: "0 4vw",
  },
}));

export default useStyles;
