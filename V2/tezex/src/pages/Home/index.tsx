import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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

interface ModeTransitionState {
  modeTransitionDirection?: ModeTransitionDirection;
}

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
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const exitAnimationRef = useRef<Animation | null>(null);
  const navigationSequenceRef = useRef(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionDirection = (location.state as ModeTransitionState | null)
    ?.modeTransitionDirection;

  useEffect(() => {
    const panel = panelRef.current;

    if (!transitionDirection || !panel?.animate || prefersReducedMotion()) {
      setIsTransitioning(false);
      return;
    }

    setIsTransitioning(true);
    let isCurrentAnimation = true;
    const offset = transitionDirection === "forward" ? "18px" : "-18px";
    const animation = panel.animate(
      [
        { opacity: 0.35, transform: `translate3d(${offset}, 0, 0)` },
        { opacity: 1, transform: "translate3d(0, 0, 0)" },
      ],
      {
        duration: 220,
        easing: "cubic-bezier(.22,.8,.24,1)",
      }
    );

    void animation.finished
      .catch(() => undefined)
      .then(() => isCurrentAnimation && setIsTransitioning(false));

    return () => {
      isCurrentAnimation = false;
      animation.cancel();
    };
  }, [location.key, transitionDirection]);

  useEffect(
    () => () => {
      navigationSequenceRef.current += 1;
      exitAnimationRef.current?.cancel();
    },
    []
  );

  const navigateBetweenModes = useCallback(
    (href: string) => {
      const targetPath = href.split("/").pop() ?? "swap";
      const currentIsLiquidity = isLiquidityRoute(props.path);
      const targetIsLiquidity = isLiquidityRoute(targetPath);

      if (currentIsLiquidity === targetIsLiquidity || isTransitioning) return;

      const direction: ModeTransitionDirection = targetIsLiquidity
        ? "forward"
        : "backward";
      const panel = panelRef.current;
      const completeNavigation = () =>
        navigate(href, { state: { modeTransitionDirection: direction } });

      if (!panel?.animate || prefersReducedMotion()) {
        completeNavigation();
        return;
      }

      const sequence = navigationSequenceRef.current + 1;
      navigationSequenceRef.current = sequence;
      setIsTransitioning(true);

      const offset = direction === "forward" ? "-18px" : "18px";
      const animation = panel.animate(
        [
          { opacity: 1, transform: "translate3d(0, 0, 0)" },
          { opacity: 0.35, transform: `translate3d(${offset}, 0, 0)` },
        ],
        {
          duration: 140,
          easing: "cubic-bezier(.4,0,.7,.2)",
        }
      );
      exitAnimationRef.current = animation;

      void animation.finished
        .catch(() => undefined)
        .then(() => {
          if (navigationSequenceRef.current !== sequence) return;
          completeNavigation();
        });
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
        <Box ref={panelRef} sx={styles.modePanel}>
          {Comp}
        </Box>
      </Grid2>
    </Grid2>
  );
};
