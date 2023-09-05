import React, { FC, useState, useCallback } from "react";
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
  const [openMenu, setOpenMenu] = useState(false);
  const toggleMenu = useCallback(() => {
    setOpenMenu(!openMenu);
  }, [openMenu]);

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "100%",
        justifyContent: "space-between",
        flexDirection: "row",
      }}
    >
      <Box sx={styles.layout.layoutBox}>
        <header>
          <Box
            sx={{
              display: "flex",
              "@media (max-width: 900px) and (orientation: landscape)": {
                display: "none",
              },
            }}
          >
            <Header toggleMenu={toggleMenu} />
          </Box>
        </header>

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

      <Box
        sx={{
          display: openMenu ? "flex" : "none",
          "@media (max-width: 900px) and (orientation: landscape)": {
            display: "flex",
            height: "100%",
            zIndex: 1000,
          },
        }}
      >
        <SideBar openMenu={openMenu} toggleMenu={toggleMenu} />
      </Box>
    </Box>
  );
};
