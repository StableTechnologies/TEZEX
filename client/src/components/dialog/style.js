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

list: {
  border: "1px solid #e5e5e5",
  margin: "8px 0",
  width: "100%",
  borderRadius: "8px",
},
listItem: {
    margin: "0",
},
listTitle: {
  fontWeight: "500",
  lineHeight: "1.18",
  color: "#000",
},
listBanner: {
  fontWeight: "300",
  lineHeight: "1",
  color: "#828282",
},
}));

export default useStyles;
