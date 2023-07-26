import React, { FC } from "react";


import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2

import style from "./style";
import useStyles from "../../hooks/styles";


export const About: FC = (props) => {
  const styles = useStyles(style);
  return (
    <Grid2 sx={styles.homeContainer} container>
      <Grid2>
        <h1> About </h1>
      </Grid2>
    </Grid2>
  );
};
