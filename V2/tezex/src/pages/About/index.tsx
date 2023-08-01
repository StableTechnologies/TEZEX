import React, { FC, useEffect } from "react";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2

import style from "./style";
import useStyles from "../../hooks/styles";

export const About: FC = (props) => {
  const styles = useStyles(style);

  useEffect(() => {
    // Redirect logic here
    window.location.href = "https://docs.tezex.io/about";
  }, []);

  return (
    <Grid2 sx={styles.homeContainer} container>
      <Grid2>redirecting....</Grid2>
    </Grid2>
  );
};
