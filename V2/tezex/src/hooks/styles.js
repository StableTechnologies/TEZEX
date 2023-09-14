import React, { useState, useMemo, useEffect } from "react";
import { css } from "@emotion/css";
import { theme } from "../theme";
import useMediaQuery from "@mui/material/useMediaQuery";
/*
 * mui useStyles is depreciated
 * default : for use in  sx props
 * toCSS : outputs css classes as the old mui useStyles
 */
const useStyles = (style, sscale = 1, toCSS = false) => {
  const [scale, setScale] = useState(1);
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isLg = useMediaQuery(theme.breakpoints.only("lg"));
  // setscale to custom theme compoenet scales at breakpoint
  useEffect(() => {
    if (isLg && scale != 1) setScale(1);
    if (isMd && scale != 2) setScale(1.5);
    if (isSm && scale != 3) setScale(3);
  }, [isLg, isMd, isSm, scale]);

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
