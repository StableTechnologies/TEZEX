import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  container: {
    width: "fit-content",
    margin: "-2vw auto",
    fontSize: "1.4vw",
    marginBottom: "2.8vw",
  },
  stat: {
    fontWeight: "bold",
    fontSize: "1.2vw",
    border: "0.3vw solid black",
    padding: "0 1vw",
    borderRadius: "1vw",
  },
}));

export default useStyles;
