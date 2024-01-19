import React, { FC } from "react";

import { NavHome } from "../../components/nav";
import { Swap } from "../../components/swap";
import { AddLiquidity } from "../../components/addLiquidity";
import { RemoveLiquidity } from "../../components/removeLiquidity";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2

import style from "./style";
import useStyles from "../../hooks/styles";
import {
  BrowserView,
  MobileView,
  useMobileOrientation,
} from "react-device-detect";

type HomePaths = "swap" | "add" | "remove";

export interface IHome {
  path: HomePaths;
}
export const Home: FC<IHome> = (props) => {
  const { orientation } = useMobileOrientation();
  const styles = useStyles(style);
  const Comp = (() => {
    switch (props.path) {
      case "add":
        return <AddLiquidity orientation={orientation} />;
      case "remove":
        return <RemoveLiquidity orientation={orientation} />;
      case "swap":
        return <Swap orientation={orientation} />;
    }
  })();

  return (
    <Grid2 sx={styles.homeContainer} container>
      <MobileView>
        <Grid2 sx={styles.nav.mobile}>
          <NavHome scalingKey="navHome" />
        </Grid2>
      </MobileView>

      <BrowserView>
        <Grid2 sx={styles.nav}>
          <NavHome scalingKey="navHome" />
        </Grid2>
      </BrowserView>
      <Grid2>{Comp}</Grid2>
    </Grid2>
  );
};
