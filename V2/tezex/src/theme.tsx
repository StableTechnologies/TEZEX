import { createTheme } from "@mui/material/styles";
import { Breakpoints } from "./types/general";
import { adjustBreakpointsForDpr } from "./functions/util";

import { useDeviceSelectors } from "react-device-detect";
declare module "@mui/material/styles" {
  interface BreakpointOverrides {
    xs: true; // removes the `xs` breakpoint
    sm: true;
    md: true;
    lg: true;
    xl: true;
    mobile: true; // adds the `mobile` breakpoint
    tablet: true;
    laptop: true;
    desktop: true;
  }
  interface Palette {
    selectedHomeTab: Palette["primary"];
    tirtiary: Palette["primary"];
  }

  interface PaletteOptions {
    selectedHomeTab: PaletteOptions["primary"];

    tirtiary: PaletteOptions["primary"];
  }

  interface PaletteColor {
    darker?: string;
  }

  interface SimplePaletteColorOptions {
    darker?: string;
  }

  interface ScaleAtBreakPoints {
    xl: number;
    lg: number;
    md: number;
    sm: number;
    xs: number;
    mobile?: {
      xl: number;
      lg: number;
      md: number;
      sm: number;
      xs: number;
    };
    landscape?: {
      xl: number;
      lg: number;
      md: number;
      sm: number;
      xs: number;
    };
  }
  interface ThemeOptions {
    deviceType?: {
      isMobile: boolean;
      isDesktop: boolean;
    };
    scaling?: {
      default: ScaleAtBreakPoints;
      swap?: ScaleAtBreakPoints;
      removeLiquidity?: ScaleAtBreakPoints;
      addLiquidity?: ScaleAtBreakPoints;
      header?: ScaleAtBreakPoints;
      alert?: ScaleAtBreakPoints;
      navHome?: ScaleAtBreakPoints;
    };
  }
  interface Theme {
    scaling?: {
      default: ScaleAtBreakPoints;
      swap?: ScaleAtBreakPoints;
      removeLiquidity?: ScaleAtBreakPoints;
      addLiquidity?: ScaleAtBreakPoints;
      header?: ScaleAtBreakPoints;
      alert?: ScaleAtBreakPoints;
      navHome?: ScaleAtBreakPoints;
    };
  }
}

//const { palette } = createTheme();
const br: Breakpoints = {
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
      mobile: 0,
      tablet: 640,
      laptop: 1024,
      desktop: 1200,
    },
  },
};
const dprAdjustedBreakpoints = adjustBreakpointsForDpr(br);

// eslint-disable-next-line  @typescript-eslint/no-unused-vars
const [selectors, data] = useDeviceSelectors(window.navigator.userAgent);

const { isMobile, isDesktop } = selectors;
export const theme = createTheme({
  ...(isDesktop ? dprAdjustedBreakpoints : {}),
  deviceType: {
    isMobile: isMobile,
    isDesktop: isDesktop,
  },
  scaling: {
    default: {
      xl: 1,
      lg: 1,
      md: 1,
      sm: 1,
      xs: 1,
    },

    header: {
      xl: 1,
      lg: 1,
      md: 1.5,
      sm: 2,
      xs: 3,
    },
    swap: {
      xl: 1,
      lg: 1,
      md: 1.5,
      sm: 2,
      xs: 3,

      landscape: {
        xl: 1,
        lg: 1,
        md: 1.2,
        sm: 1,
        xs: 1,
      },
    },
    addLiquidity: {
      xl: 1,
      lg: 1,
      md: 1.5,
      sm: 1.5,
      xs: 2,
      mobile: {
        xl: 1,
        lg: 1,
        md: 1.5,
        sm: 1.8,
        xs: 2.5,
      },
      landscape: {
        xl: 1,
        lg: 1,
        md: 1.2,
        sm: 1,
        xs: 1,
      },
    },
    removeLiquidity: {
      xl: 1,
      lg: 1,
      md: 1.5,
      sm: 2,
      xs: 3,
    },

    alert: {
      xl: 1,
      lg: 1,
      md: 1.5,
      sm: 2,
      xs: 3,
    },

    navHome: {
      xl: 1,
      lg: 1,
      md: 1.5,
      sm: 2,
      xs: 3,
    },
  },
  typography: {
    fontFamily: "Inter",
  },
  palette: {
    selectedHomeTab: {
      main: "#E3F7FF",
      contrastText: "#fff",
    },
    action: {
      selected: "#E3F7FF",
    },
    text: {
      primary: "#000000",
      disabled: "#999999",
    },

    primary: {
      dark: "#FEFEFE",
      main: "#FFFFFF",
    },
    secondary: {
      light: "#F9F9F9",
      main: "#F4F4F4",
      dark: "#2D2D2D",
    },
    // primary: {
    //   dark: "#FEFEFE",
    //   main: "#000000",

    // },
    // secondary: {
    //   main: "#999999",
    //   dark: "#00A0E4",
    // },
    tirtiary: {
      light: "#E3F7FF",
      main: "#999999",
      dark: "#00A0E4",
    },
    background: {
      default: "#F9F9F9",
    },
  },
});

export default theme;
