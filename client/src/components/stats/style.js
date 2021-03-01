import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  container: {
    width: "70%",
    margin: "-2vw auto",
    fontSize: "1.4vw",
    lineHeight: "2.8vw",
    marginBottom: "2.8vw",
  },
  stat: {
    fontWeight: "bold",
    fontSize: "1.2vw",
    border: "0.3vw solid black",
    padding: "2vw",
    borderRadius: "1vw",
    width: "fit-content",
    margin: "4vw auto",
    textAlign: "left",
  },
  indented: {
    paddingLeft: "2vw",
  },
}));

export default useStyles;
