import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiIconButton-root': {
      '&:hover': {
        background: 'transparent',
    },
    },
  },
  paper: {
    display: "flex",
    margin: "0 1.5rem",
    borderRadius: ".5rem !important",
    border: "1px solid #61A9FD",
  },
  input: {
  },
  iconButton: {
    paddingLeft: "16px",
    paddingRight: "16px",
  },
}));

export default useStyles;
