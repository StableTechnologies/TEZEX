import React, { FC } from "react";
import { Header } from "./Header";
import ResponsiveAppBar from "../../app-bar-example/";

// } from "../../../app-bar-exa ";
import { MainWindow } from "./MainWindow";
import { SideBar } from "./sidebar";
import Box from "@mui/material/Box";

import style from "./style";
import useStyles from "../../../hooks/styles";
import Grid2 from "@mui/material/Unstable_Grid2/Grid2";
export interface ILayout {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
}

export const Layout: FC<ILayout> = (props) => {
  const styles = useStyles(style);
  return (
    <Box sx={styles.layout.layoutBox}>
      <Box sx={{ display: "flex" }}>
        <Header />
      </Box>

      <Box
        sx={{
          height: "100%",
          position: "relative",
          alignContent: "space-between",
          flexDirection: "column",
          justifyContent: "space-between",
          display: "flex",
        }}
      >
        <Box
          sx={{
            position: "relative",
            width: "100%",
            alignContent: "flex-start",

            flexDirection: "row",
            justifyContent: "space-between",
            display: "flex",
          }}
        >
          <MainWindow>{props.children}</MainWindow>

          <SideBar />
        </Box>

        <Box sx={{}}>
          <ResponsiveAppBar />
        </Box>
      </Box>
    </Box>
  );
};
