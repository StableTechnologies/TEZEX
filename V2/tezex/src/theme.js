import { createMuiTheme } from '@mui/material';

const theme = createMuiTheme({
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

export default theme;
