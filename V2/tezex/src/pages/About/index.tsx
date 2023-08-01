import React, { FC, useEffect } from "react";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2

import style from "./style";
import useStyles from "../../hooks/styles";

import { useSession } from "../../hooks/session";
export const About: FC = () => {
  const styles = useStyles(style);
  const appConfig = useSession().appConfig;

  useEffect(() => {
    // Redirect logic here
    window.location.href = appConfig.aboutRedirectUrl; //"https://docs.tezex.io/about";
  }, []);

  return (
    <Grid2 sx={styles.aboutContainer} container>
      <Grid2>redirecting....</Grid2>
    </Grid2>
  );
};
