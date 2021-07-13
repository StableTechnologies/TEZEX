import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    "& .MuiPaper-root": {
      borderRadius: "1.5rem",
    }
  },
close: {
  position: 'absolute',
  right: theme.spacing(1),
  top: theme.spacing(1)
},
dialogCon: {
  borderRadius: "1.5rem",
  padding: "1rem",
},
list: {
  border: "1px solid #e5e5e5",
  margin: "8px 0",
  width: "100%",
  borderRadius: "8px",
},
}));

export default useStyles;
