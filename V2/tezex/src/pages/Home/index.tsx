import React, { FC, useCallback, useEffect, useRef, useState } from "react";
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

const MODE_TRANSITION_DURATION = 420;
const MODE_TRANSITION_EASING = "cubic-bezier(0.65, 0, 0.35, 1)";

const prefersReducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

const isLiquidityRoute = (path: HomePaths | string) => path !== "swap";

const createWorkspaceSnapshot = (panel: HTMLDivElement) => {
  const snapshot = panel.cloneNode(true) as HTMLDivElement;

  snapshot.removeAttribute("data-testid");
  snapshot.querySelectorAll<HTMLElement>("[id]").forEach((element) => {
    element.removeAttribute("id");
  });
  snapshot.dataset.workspaceSnapshot = "true";
  snapshot.setAttribute("aria-hidden", "true");
  snapshot.inert = true;
  Object.assign(snapshot.style, {
    position: "absolute",
    inset: "0 auto auto 0",
    width: "100%",
    pointerEvents: "none",
    zIndex: "2",
    willChange: "transform",
  });

  return snapshot;
};

export interface IHome {
  path: HomePaths;
}
export const Home: FC<IHome> = (props) => {
  const { orientation } = useMobileOrientation();
  const styles = useStyles(style);
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedPath, setDisplayedPath] = useState<HomePaths>(props.path);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const cleanupTransitionRef = useRef<() => void>(() => undefined);

  useEffect(() => () => cleanupTransitionRef.current(), []);
  useEffect(() => {
    if (!isTransitioning) setDisplayedPath(props.path);
  }, [isTransitioning, props.path]);

  const navigateBetweenModes = useCallback(
    (href: string) => {
      const targetPath = href.split("/").pop() ?? "swap";
      const currentIsLiquidity = isLiquidityRoute(displayedPath);
      const targetIsLiquidity = isLiquidityRoute(targetPath);

      if (currentIsLiquidity === targetIsLiquidity || isTransitioning) return;

      const direction: ModeTransitionDirection = targetIsLiquidity
        ? "forward"
        : "backward";
      const completeNavigation = () => navigate(href);
      const viewport = viewportRef.current;
      const outgoingPanel = panelRef.current;

      if (!viewport || !outgoingPanel?.animate || prefersReducedMotion()) {
        completeNavigation();
        return;
      }

      const outgoingSnapshot = createWorkspaceSnapshot(outgoingPanel);
      const outgoingHeight = outgoingPanel.getBoundingClientRect().height;
      const previousOverflowX = document.documentElement.style.overflowX;
      const animations: Animation[] = [];
      let incomingPanel: HTMLDivElement | null = null;
      let cleanedUp = false;
      let shouldFinishNavigation = true;

      const cleanup = () => {
        if (cleanedUp) return;
        cleanedUp = true;

        animations.forEach((animation) => animation.cancel());
        outgoingSnapshot.remove();
        viewport.style.height = "";
        incomingPanel?.style.removeProperty("transform");
        incomingPanel?.style.removeProperty("will-change");
        document.documentElement.style.overflowX = previousOverflowX;
        delete document.documentElement.dataset.modeTransition;
        setIsTransitioning(false);
        cleanupTransitionRef.current = () => undefined;
      };

      cleanupTransitionRef.current = () => {
        shouldFinishNavigation = false;
        cleanup();
      };
      document.documentElement.dataset.modeTransition = direction;
      document.documentElement.style.overflowX = "hidden";
      viewport.appendChild(outgoingSnapshot);
      if (outgoingHeight > 0) viewport.style.height = `${outgoingHeight}px`;

      try {
        flushSync(() => {
          setIsTransitioning(true);
          setDisplayedPath(targetPath as HomePaths);
        });
        incomingPanel = panelRef.current;
        if (!incomingPanel) throw new Error("Trading workspace is unavailable");

        const incomingHeight = incomingPanel.getBoundingClientRect().height;
        const incomingOffset = direction === "forward" ? "100%" : "-100%";
        const outgoingOffset = direction === "forward" ? "-100%" : "100%";
        const options: KeyframeAnimationOptions = {
          duration: MODE_TRANSITION_DURATION,
          easing: MODE_TRANSITION_EASING,
          fill: "both",
        };

        incomingPanel.style.transform = `translate3d(${incomingOffset}, 0, 0)`;
        incomingPanel.style.willChange = "transform";

        animations.push(
          outgoingSnapshot.animate(
            [
              { transform: "translate3d(0, 0, 0)" },
              { transform: `translate3d(${outgoingOffset}, 0, 0)` },
            ],
            options
          ),
          incomingPanel.animate(
            [
              { transform: `translate3d(${incomingOffset}, 0, 0)` },
              { transform: "translate3d(0, 0, 0)" },
            ],
            options
          )
        );

        if (
          outgoingHeight > 0 &&
          incomingHeight > 0 &&
          Math.abs(outgoingHeight - incomingHeight) > 1
        ) {
          animations.push(
            viewport.animate(
              [
                { height: `${outgoingHeight}px` },
                { height: `${incomingHeight}px` },
              ],
              options
            )
          );
        }

        void Promise.all(
          animations.map((animation) =>
            animation.finished.catch(() => undefined)
          )
        ).then(() => {
          if (!shouldFinishNavigation) return;
          flushSync(completeNavigation);
          cleanup();
        });
      } catch {
        shouldFinishNavigation = false;
        completeNavigation();
        cleanup();
      }
    },
    [displayedPath, isTransitioning, navigate]
  );

  const Comp = (() => {
    switch (displayedPath) {
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
      <Grid2 ref={viewportRef} sx={styles.contentViewport}>
        <Box
          ref={panelRef}
          data-testid="trading-workspace"
          sx={styles.modePanel}
        >
          {Comp}
        </Box>
      </Grid2>
    </Grid2>
  );
};
