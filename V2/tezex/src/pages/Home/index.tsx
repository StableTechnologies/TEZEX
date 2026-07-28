import React, { FC, useCallback, useState } from "react";
import { flushSync } from "react-dom";
import { useNavigate } from "react-router-dom";

import { NavHome } from "../../components/nav";
import { Swap } from "../../components/swap";
import { AddLiquidity } from "../../components/addLiquidity";
import { RemoveLiquidity } from "../../components/removeLiquidity";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
import Box from "@mui/material/Box";

import style from "./style";
import useStyles from "../../hooks/styles";
import {
  BrowserView,
  MobileView,
  useMobileOrientation,
} from "react-device-detect";

type HomePaths = "swap" | "add" | "remove";
type ModeTransitionDirection = "forward" | "backward";

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const isLiquidityRoute = (path: HomePaths | string) => path !== "swap";

export interface IHome {
  path: HomePaths;
}
export const Home: FC<IHome> = (props) => {
  const { orientation } = useMobileOrientation();
  const styles = useStyles(style);
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const navigateBetweenModes = useCallback(
    (href: string) => {
      const targetPath = href.split("/").pop() ?? "swap";
      const currentIsLiquidity = isLiquidityRoute(props.path);
      const targetIsLiquidity = isLiquidityRoute(targetPath);

      if (currentIsLiquidity === targetIsLiquidity || isTransitioning) return;

      const direction: ModeTransitionDirection = targetIsLiquidity
        ? "forward"
        : "backward";
      const completeNavigation = () => navigate(href);
      const startViewTransition = document.startViewTransition?.bind(document);

      if (!startViewTransition || prefersReducedMotion()) {
        completeNavigation();
        return;
      }

      setIsTransitioning(true);
      document.documentElement.dataset.modeTransition = direction;

      try {
        const transition = startViewTransition(() => {
          flushSync(completeNavigation);
        });

        void transition.finished
          .catch(() => undefined)
          .then(() => {
            delete document.documentElement.dataset.modeTransition;
            setIsTransitioning(false);
          });
      } catch {
        delete document.documentElement.dataset.modeTransition;
        setIsTransitioning(false);
        completeNavigation();
      }
    },
    [isTransitioning, navigate, props.path]
  );

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
          <NavHome
            scalingKey="navHome"
            onNavigate={navigateBetweenModes}
            isTransitioning={isTransitioning}
          />
        </Grid2>
      </MobileView>

      <BrowserView>
        <Grid2 sx={styles.nav}>
          <NavHome
            scalingKey="navHome"
            onNavigate={navigateBetweenModes}
            isTransitioning={isTransitioning}
          />
        </Grid2>
      </BrowserView>
      <Grid2 sx={styles.contentViewport}>
        <Box sx={styles.modePanel}>{Comp}</Box>
      </Grid2>
    </Grid2>
  );
};
