import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({

  sidelogocontainer: {
    maxHeight: "100%",
    '@media (max-width: 600px)': {
      display: "none"
    }
  },
  sidelogo: {
    maxHeight: "85vh",
    // margin: "1rem 0",
  },

}));

export default useStyles;
