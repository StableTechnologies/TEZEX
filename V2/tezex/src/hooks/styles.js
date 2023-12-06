import { useState, useEffect } from "react";
import { css } from "@emotion/css";
import { theme } from "../theme";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useMobileOrientation, useDeviceSelectors } from "react-device-detect";
/*
 * mui useStyles is depreciated
 * default : for use in  sx props
 * toCSS : outputs css classes as the old mui useStyles
 */

const useStyles = (style, scalingKey = "default", toCSS = false) => {
  const { isLandscape } = useMobileOrientation();
  // eslint-disable-next-line  @typescript-eslint/no-unused-vars
  const [selectors, data] = useDeviceSelectors(window.navigator.userAgent);

  const { isMobile, isDesktop } = selectors;

  // fetch scaling factors from theme
  const scalingBreakpoints = theme.scaling[scalingKey];
  const [scale, setScale] = useState(1);

  const breakpointSizes = ["xs", "sm", "md", "lg", "xl"];

  // breakpointSizes indexes as a boolean array of exact current breakpoint match
  const breakpointMatches = breakpointSizes.map((size) =>
    useMediaQuery(theme.breakpoints.only(size))
  );

  // first breakpointSizes index that is true
  const matchedIndex = breakpointMatches.findIndex((match) => match);

  // current breakpoint that is an exact match, -1 for no match
  const currentBreakpoint =
    matchedIndex !== -1 ? breakpointSizes[matchedIndex] : null;

  // breakpointSizes indexes as a  boolean array of matches below current breakpoint match
  const breakpointMatchesDown = breakpointSizes.map((size) =>
    useMediaQuery(theme.breakpoints.down(size))
  );

  // first breakpointSizes index that is true for a match below current breakpoint
  const matchedIndexDown = breakpointMatchesDown.findIndex((match) => match);
  // breakpoint that is a match below current breakpoint, -1 for no match

  const currentBreakpointDown =
    matchedIndexDown !== -1 ? breakpointSizes[matchedIndexDown] : null;

  const breakpointSizesReverse = breakpointSizes.reverse();

  // breakpointSizes indexes as a  boolean array of matches above  current breakpoint match
  const breakpointMatchesUp = breakpointSizes.map((size) =>
    useMediaQuery(theme.breakpoints.up(size))
  );
  // first breakpointSizes index that is true for a match above current breakpoint
  const matchedIndexUp = breakpointMatchesUp.findIndex((match) => match);

  // breakpoint that is a match above current breakpoint, -1 for no match
  const currentBreakpointUp =
    matchedIndexUp !== -1 ? breakpointSizesReverse[matchedIndexUp] : null;

  // update scaling factor
  useEffect(() => {
    // get closest breakpoint,  dealing with edge cases
    const getBreakpoint = () => {
      return currentBreakpoint || currentBreakpointUp || currentBreakpointDown;
    };

    // get scaling factor from theme
    const scalingFactor =
      theme.deviceType.isMobile && !isLandscape && scalingBreakpoints.mobile
        ? scalingBreakpoints.mobile[getBreakpoint()]
        : isLandscape && scalingBreakpoints.landscape
        ? scalingBreakpoints.landscape[getBreakpoint()]
        : scalingBreakpoints[getBreakpoint()];

    const timer = setTimeout(() => {
      // update scaling factor if changed
      if (scale !== scalingFactor) {
        setScale(scalingFactor);
      }
    }, 10);
    return () => clearTimeout(timer);
  }, [
    isLandscape,
    currentBreakpoint,
    currentBreakpointDown,
    currentBreakpointUp,
    scale,
    scalingBreakpoints,
  ]);

  const classes = typeof style === "function" ? style(theme, scale) : style;

  if (toCSS) {
    const prepared = {};

    Object.entries(classes).forEach(([key, value]) => {
      prepared[key] = css(value);
    });

    return prepared;
  } else {
    return {
      ...classes,
      isLandScape: isLandscape,
      isMobile: isMobile,
      isMobileLandscape: isLandscape,
      isDesktop: isDesktop,
      hide: { display: "none" },
    };
  }
};
export default useStyles;
