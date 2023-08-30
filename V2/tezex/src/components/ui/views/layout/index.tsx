import React, { FC } from "react";
import { Header } from "../header";
import ResponsiveAppBar from "../../../app-bar-example/";

// } from "../../../app-bar-exa ";
import { MainWindow } from "../main-window";
import { SideBar } from "../sidebar";
import Box from "@mui/material/Box";

import style from "./style";
import useStyles from "../../../../hooks/styles";
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
    <Box
      sx={{
        display: "flex",
        width: "100vw",
        height: "100%",
        justifyContent: "space-between",
        flexDirection: "row",
      }}
    >
      <Box sx={styles.layout.layoutBox}>
        <Box sx={{ display: "flex" }}>
          <Header />
        </Box>

        <Box
          sx={{
            height: "100%",
            width: "100%",
            position: "relative",
            alignContent: "space-between",
            flexDirection: "column",
            justifyContent: "space-between",
            display: "flex",
          }}
        >
          <MainWindow>{props.children}</MainWindow>

          <Box
            sx={{
              position: "absolute",
              display: "flex",
              bottom: "0%",
              width: "100%",
            }}
          ></Box>
        </Box>
      </Box>

      <SideBar />
    </Box>
  );
};
