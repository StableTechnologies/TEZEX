import React, { useState, useMemo, useEffect, useCallback } from "react";
import { css } from "@emotion/css";
import { theme } from "../theme";
import useMediaQuery from "@mui/material/useMediaQuery";
/*
 * mui useStyles is depreciated
 * default : for use in  sx props
 * toCSS : outputs css classes as the old mui useStyles
 */
/*const useStyles = (style, scalingKey = "default", toCSS = false) => {
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
  function debounce(fn, ms) {
    let timer;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn.apply(this, args);
      }, ms);
    };
  }
  //set scale to custom theme component scale at breakpoint
  const handleResize = useCallback(() => {
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
  }, [isLandScape, isXl, isLg, isMd, isSm, scale])

  const handelOrientationChange = () => {
    setIsLandScape(window.matchMedia("(orientation: landscape)").matches);
  };
  const debounceResize = debounce(function handleChange() {
    handleResize();
    handelOrientationChange();
  }, 100);
  useEffect(() => {


    console.log({
      isXl: isXl,
      isLg: isLg,
      isMd: isMd,
      isSm: isSm,
      isXs: isXs,
    });
    window.addEventListener("resize", debounceResize);
    return () => {
      window.removeEventListener("resize", debounceResize)
    };
  }, []);

  const classes = typeof style === "function" ? style(theme, scale) : style;

  if (toCSS) {
    const prepared = {};

    Object.entries(classes).forEach(([key, value]) => {
      prepared[key] = css(value);
    });

    return prepared;
  } else
    return {
      isLandScape: isLandScape,
      ...classes,
    };
}; */

const getWidth = () =>
  window.innerWidth ||
  document.documentElement.clientWidth ||
  document.body.clientWidth;

const determineBreakpoint = (width) => {
  if (width < theme.breakpoints.values.sm) return "xs";
  if (width < theme.breakpoints.values.md) return "sm";
  if (width < theme.breakpoints.values.lg) return "md";
  if (width < theme.breakpoints.values.xl) return "lg";
  return "xl";
};

const useStyles = (style, scalingKey = "default", toCSS = false) => {
  const [isLandScape, setIsLandScape] = useState(
    window.matchMedia("(orientation: landscape)").matches
  );

  const scalingBreakpoints = theme.scaling[scalingKey];
  const [scale, setScale] = useState(1);

  const breakpointSizes = ["xs", "sm", "md", "lg", "xl"];
  const breakpointMatches = breakpointSizes.map((size) =>
    useMediaQuery(theme.breakpoints.only(size))
  );
  const matchedIndex = breakpointMatches.findIndex((match) => match);
  const currentBreakpoint =
    matchedIndex !== -1 ? breakpointSizes[matchedIndex] : null;

  console.log(currentBreakpoint);
  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn.apply(this, args);
      }, ms);
    };
  }

  useEffect(() => {
    const handelOrientationChange = () => {
      setIsLandScape(window.matchMedia("(orientation: landscape)").matches);
    };

    const debouncedOrientationChange = debounce(handelOrientationChange, 100);

    window.addEventListener("resize", debouncedOrientationChange);

    return () => {
      window.removeEventListener("resize", debouncedOrientationChange);
    };
  }, [debounce]);

  useEffect(() => {
    const targetBreakpoint =
      isLandScape && scalingBreakpoints.landscape
        ? scalingBreakpoints.landscape[currentBreakpoint]
        : scalingBreakpoints[currentBreakpoint];

    if (scale !== targetBreakpoint) {
      setScale(targetBreakpoint);
    }
  }, [isLandScape, currentBreakpoint, scale, scalingBreakpoints]);

  const classes = typeof style === "function" ? style(theme, scale) : style;

  if (toCSS) {
    const prepared = {};

    Object.entries(classes).forEach(([key, value]) => {
      prepared[key] = css(value);
    });

    return prepared;
  } else {
    return {
      isLandScape: isLandScape,
      ...classes,
    };
  }
};
export default useStyles;
