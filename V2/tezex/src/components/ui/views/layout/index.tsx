import React, { FC, useState, useEffect, useCallback } from "react";
import { Header } from "../header";

import { BrowserView, MobileView } from "react-device-detect";
import { MainWindow } from "../main-window";
import { SideBar } from "../sidebar";
import Box from "@mui/material/Box";

import style from "./style";
import useStyles from "../../../../hooks/styles";
export interface ILayout {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
  isLandScape: boolean;
  key?: string;
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
          <BrowserView>
            <Box sx={styles.header}>
              <Header openMenu={openMenu} toggleMenu={toggleMenu} />
            </Box>
          </BrowserView>
          <MobileView>
            <Box
              sx={styles.isMobileLandscape ? styles.hide : styles.headerMobile}
            >
              <Header openMenu={openMenu} toggleMenu={toggleMenu} />
            </Box>
          </MobileView>
        </header>

        <Box sx={styles.mainWindow}>
          <MainWindow>{props.children}</MainWindow>

          {/* Bottom space for bars or notification */}
          <Box sx={styles.bottomSpace}></Box>
        </Box>
      </Box>

      <MobileView>
        <Box
          sx={
            openMenu
              ? styles.sideBar
              : styles.isLandScape
              ? styles.sideBarShow
              : styles.sideBarHidden
          }
        >
          <SideBar openMenu={openMenu} toggleMenu={toggleMenu} />
        </Box>
      </MobileView>

      <BrowserView>
        <Box sx={openMenu ? styles.sideBar : styles.hide}>
          <SideBar openMenu={openMenu} toggleMenu={toggleMenu} />
        </Box>
      </BrowserView>
    </Box>
  );
};
