import { createMuiTheme } from '@material-ui/core/styles';

const theme = createMuiTheme({
  typography: {
    fontFamily: "Inter",
   },
   overrides: {
    MuiCardContent: {
      root: {
        padding: '2rem 2rem .5rem',
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
    }
  },
})

export default theme;
