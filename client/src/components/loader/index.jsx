import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import useStyles from "./style";

const Loader = (props) => {
  const classes = useStyles();
  const {message, size, loader, loaderContainer} = props;
  return (
    <div className={loaderContainer || classes.container}>
      <CircularProgress className={loader || classes.loader} size={size || 60} />
      <p className={classes.msg}>{message}</p>
    </div>
  );
};

export default Loader;
