import React, { FC, useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      //To be adjusted
      if (screenWidth > 1024) {
        setOpenMenu(false);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <Box sx={styles.root}>
      <Box sx={styles.headerAndMainWindow}>
        <header>
          <Box sx={styles.header}>
            <Header openMenu={openMenu} toggleMenu={toggleMenu} />
          </Box>
        </header>

        <Box sx={styles.mainWindow}>
          <MainWindow>{props.children}</MainWindow>

          {/* Bottom space for bars or notification */}
          <Box sx={styles.bottomSpace}></Box>
        </Box>
      </Box>

      <Box sx={openMenu ? styles.sideBar : styles.sideBarHidden}>
        <SideBar openMenu={openMenu} toggleMenu={toggleMenu} />
      </Box>
    </Box>
  );
};
