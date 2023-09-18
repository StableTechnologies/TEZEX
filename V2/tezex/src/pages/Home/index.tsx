import React, { FC } from "react";

import { NavHome } from "../../components/nav";
import { Swap } from "../../components/swap";
import { AddLiquidity } from "../../components/addLiquidity";
import { RemoveLiquidity } from "../../components/removeLiquidity";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2

import style from "./style";
import useStyles from "../../hooks/styles";

type HomePaths = "swap" | "add" | "remove";

export interface IHome {
  path: HomePaths;
}
export const Home: FC<IHome> = (props) => {
  const styles = useStyles(style);
  const Comp = (() => {
    switch (props.path) {
      case "add":
        return AddLiquidity;
      case "remove":
        return RemoveLiquidity;
      case "swap":
        return Swap;
    }
  })();

  return (
    <Grid2 sx={styles.homeContainer} container>
      <Grid2 sx={styles.nav}>
        <NavHome scalingKey="navHome" />
      </Grid2>
      <Grid2>
        <Comp />
      </Grid2>
    </Grid2>
  );
};
