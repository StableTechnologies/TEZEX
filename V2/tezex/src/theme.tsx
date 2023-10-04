import { Breakpoint, createTheme, ThemeProvider } from "@mui/material/styles";
import { Breakpoints } from "./types/general";
import { adjustBreakpointsForDpr } from "./functions/util";

import parser from "ua-parser-js";
import { UAParser } from "ua-parser-js";
import mediaQuery from "css-mediaquery";
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
const breakpoints: Breakpoints = {
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
const dpr: number = window.devicePixelRatio || 1;
const f = adjustBreakpointsForDpr(br);
//  const deviceType = parser(req.headers['user-agent']).device.type || 'desktop';
//  const ssrMatchMedia = (query: string) => ({
//    matches: mediaQuery.match(query, {
//      // The estimated CSS width of the browser.
//      width: deviceType === 'mobile' ? '0px' : '1024px',
//    }),
//  })
//}

const [selectors, data] = useDeviceSelectors(window.navigator.userAgent);

const { isMobile, isDesktop } = selectors;
console.log("isMobile", isMobile);
console.log("isDesktop", isDesktop);
export const theme = createTheme({
  ...(isDesktop ? f : {}),
  // components: {
  // Change the default options of useMediaQuery
  //      MuiUseMediaQuery: {
  //        defaultProps: {
  //          ssrMatchMedia,
  //        },
  //      },
  //    },
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
      sm: 2,
      xs: 3,
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
/*
const theme: Theme = createTheme({
  palette: {
    grey: {
      main: purple[500],
    }
            
        aphy: {
        Family: "Inter",
                         
          es: {
      iCardContent: {
      root: {
        padding: '2rem 2rem .5rem',
        '@media (max-width: 600px)': {
          padding: ".8rem",
        }
      },
              
          dHeader: {
        ot: {
        padding: '0',
        
      
      iButton: {
      root: {
        "& $label":{
          whiteSpace: "nowrap",
        }
      }
    },
    MuiList: {
      root: {
        padding: ".5rem 1.5rem",
      },
    },
    MuiCircularProgress: {
      colorPrimary: {
        color: "#000",
      }
    }
  },
})

*/
export default theme;
