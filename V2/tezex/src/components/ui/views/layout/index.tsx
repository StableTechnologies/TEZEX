import React, { FC, useState, useEffect, useCallback } from "react";
import { Header } from "../header";

import { BrowserView, MobileView } from "react-device-detect";
import { MainWindow } from "../main-window";
import { Footer } from "../footer";
import { SideBar } from "../sidebar";
import Box from "@mui/material/Box";

import style from "./style";
import useStyles from "../../../../hooks/styles";
import { Link, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
export interface ILayout {
  children:
    | JSX.Element[]
    | JSX.Element
    | React.ReactElement
    | React.ReactElement[]
    | string;
  isLandScape: boolean;
  orientation: string;
  key?: string;
}

export const Layout: FC<ILayout> = (props) => {
  const styles = useStyles(style);
  const location = useLocation();
  const isStezRoute = location.pathname.startsWith("/stez");
  const isTzktDataRoute =
    location.pathname === "/" ||
    location.pathname.startsWith("/liquidity") ||
    location.pathname.startsWith("/analytics");
  const [openMenu, setOpenMenu] = useState(false);
  const toggleMenu = useCallback(() => {
    setOpenMenu(!openMenu);
  }, [openMenu]);

  useEffect(() => {
    const handleResize = () => {
      const screenWidth = window.innerWidth;
      //To be adjusted
      if (screenWidth >= 1200) {
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

          {(isStezRoute || isTzktDataRoute) && (
            <Box sx={styles.bottomSpace}>
              <Typography sx={styles.bottomSpaceText}>
                {isStezRoute ? (
                  "sTEZ data read from the Snet RPC"
                ) : (
                  <>
                    Data provided by
                    <Link
                      href="https://tzkt.io"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={styles.bottomSpaceLink}
                    >
                      TzKT
                    </Link>
                    API
                  </>
                )}
              </Typography>
            </Box>
          )}
        </Box>

        <Footer />
      </Box>

      <MobileView>
        <Box
          sx={
            openMenu
              ? styles.sideBar
              : props.isLandScape
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
