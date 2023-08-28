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
    <Box
      sx={{
        height: "100vh",
        width: "100%",
        display: "flex",
      }}
    >
      <Grid2 container sx={styles.layout.layoutBox}>
        <Grid2 xs={12} sx={{ display: "block" }}>
          <Header />
        </Grid2>

        <Grid2
          xs={12}
          sx={{
            height: "97%",
            alignContent: "space-between",
            flexDirection: "column",
            justifyContent: "space-between",
            display: "flex",
          }}
        >
          <Grid2
            xs={12}
            sx={{
              width: "100%",
              alignContent: "flex-start",
              justifyContent: "space-between",
              display: "flex",
            }}
          >
            <Box
              sx={{
                width: "100%",
                justifyContent: "space-between",
                display: "flex",
              }}
            >
              <MainWindow>{props.children}</MainWindow>

              <SideBar />
            </Box>
          </Grid2>

          <Grid2
            xs={12}
            sx={{
              alignContent: "flex-end",
              flexDirection: "column",
              justifyContent: "flex-end",
              display: "flex",
            }}
          >
            <ResponsiveAppBar />
          </Grid2>
        </Grid2>
      </Grid2>

      <SideBar />
    </Box>
  );
};
