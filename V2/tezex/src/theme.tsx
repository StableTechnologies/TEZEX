import { createTheme } from "@mui/material/styles";
declare module "@mui/material/styles" {
  interface Palette {
    selectedHomeTab: Palette["primary"];
  }

  interface PaletteOptions {
    selectedHomeTab: PaletteOptions["primary"];
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
  }
  interface ThemeOptions {
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

export const theme = createTheme({
  scaling: {
    default: {
      xl: 1,
      lg: 1,
      md: 1,
      sm: 1,
      xs: 1,
    },

    swap: {
      xl: 1,
      lg: 1,
      md: 1.5,
      sm: 2,
      xs: 3,
    },
    addLiquidity: {
      xl: 1,
      lg: 1,
      md: 1.5,
      sm: 2,
      xs: 3,
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
    primary: {
      main: "#1E1E1E",
    },
    secondary: {
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
  },
  typography: {
    fontFamily: "Inter",
   },
   overrides: {
    MuiCardContent: {
      root: {
        padding: '2rem 2rem .5rem',
        '@media (max-width: 600px)': {
          padding: ".8rem",
        }
      },
    },
    MuiCardHeader: {
      root: {
        padding: '0',
      },
    },
    MuiButton: {
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
