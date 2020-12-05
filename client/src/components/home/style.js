import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
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
  swaps: {
    margin: "1.4vw",
    "& h3": {
      fontSize: "2.1vw",
    },
  },
  swap: {
    color: "white",
    width: "fit-content",
    border: "0.2vw black solid",
    margin: "3vw auto",
    padding: "0.5vw 2vw",
    lineHeight: "1.7vw",
    borderRadius: "2vw",
    backgroundColor: "black",
  },
  noSwap: {
    fontSize: "1.2vw",
  },
  error: {
    display: "flex",
    justifyContent: "space-around",
    backgroundColor: "red",
    padding: "0 0.5vw",
    borderRadius: "2vw",
    width: "50%",
    margin: "0 auto",
  },
  errorBtn: {
    height: "fit-content",
    padding: "0.5vw",
    borderRadius: "0.7vw",
    marginTop: "4%",
    cursor: "pointer",
    background: "white",
    borderStyle: "none",
    fontSize: "1vw",
  },
}));

export default useStyles;
