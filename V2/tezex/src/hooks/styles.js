import { useMemo } from "react";
import { css } from "@emotion/css";
import { theme } from "../theme";
/*
 * mui useStyles is depreciated
 * default : for use in  sx props
 * toCSS : outputs css classes as the old mui useStyles
 */
const useStyles = (style, toCSS = false) => {
  return useMemo(() => {
    const classes = typeof style === "function" ? style(theme) : style;
    if (toCSS) {
      const prepared = {};

      Object.entries(classes).forEach(([key, value]) => {
        prepared[key] = css(value);
      });

      return prepared;
    } else return classes;
  }, [style, theme]);
};

export default useStyles;
