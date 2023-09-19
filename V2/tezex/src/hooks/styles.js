import React, { useState, useMemo, useEffect } from "react";
import { css } from "@emotion/css";
import { theme } from "../theme";
import useMediaQuery from "@mui/material/useMediaQuery";
/*
 * mui useStyles is depreciated
 * default : for use in  sx props
 * toCSS : outputs css classes as the old mui useStyles
 */
const useStyles = (style, scalingKey = "default", toCSS = false) => {
  const [isLandScape, setIsLandScape] = useState(
    window.matchMedia("(orientation: landscape)").matches
  );
  const scalingBreakpoints = theme.scaling[scalingKey];
  const [scale, setScale] = useState(1);
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isLg = useMediaQuery(theme.breakpoints.only("lg"));
  const isXl = useMediaQuery(theme.breakpoints.only("xl"));
  //setscale to custom theme compoenet scales at breakpoint
  useEffect(() => {
    const handelOrientationChange = () => {
      setIsLandScape(window.matchMedia("(orientation: landscape)").matches);
    };
    window.addEventListener("resize", handelOrientationChange);
    return () => {
      window.removeEventListener("resize", handelOrientationChange);
    };
  }, []);
  useEffect(() => {
    console.log(scalingBreakpoints);
    if (isLandScape && scalingBreakpoints.landscape) {
      if (isXl && scale != scalingBreakpoints.landscape.xl)
        setScale(scalingBreakpoints.landscape.xl);
      if (isLg && scale != scalingBreakpoints.landscape.lg)
        setScale(scalingBreakpoints.landscape.lg);
      if (isMd && scale != scalingBreakpoints.landscape.md)
        setScale(scalingBreakpoints.landscape.md);
      if (isSm && scale != scalingBreakpoints.landscape.sm)
        setScale(scalingBreakpoints.landscape.sm);
      if (isXs && scale != scalingBreakpoints.landscape.xs)
        setScale(scalingBreakpoints.landscape.xs);
    } else if (!isLandScape || !scalingBreakpoints.landscape) {
      if (isXl && scale != scalingBreakpoints.xl)
        setScale(scalingBreakpoints.xl);
      if (isLg && scale != scalingBreakpoints.lg)
        setScale(scalingBreakpoints.lg);
      if (isMd && scale != scalingBreakpoints.md)
        setScale(scalingBreakpoints.md);
      if (isSm && scale != scalingBreakpoints.sm)
        setScale(scalingBreakpoints.sm);
      if (isXs && scale != scalingBreakpoints.xs)
        setScale(scalingBreakpoints.xs);
    }
    // if (isLg && scale != scalingBreakpoints.xl) setScale(1);
    // if (isMd && scale != 2) setScale(1.5);
    // if (isSm && scale != 3) setScale(3);
  }, [isLandScape, isXl, isLg, isMd, isSm, scale]);

  return useMemo(() => {
    const classes = typeof style === "function" ? style(theme, scale) : style;

    if (toCSS) {
      const prepared = {};

      Object.entries(classes).forEach(([key, value]) => {
        prepared[key] = css(value);
      });

      return prepared;
    } else return classes;
  }, [style, theme, scale]);
};

export default useStyles;
