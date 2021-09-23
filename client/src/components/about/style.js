import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles((theme) => ({
  root: {
    '& .MuiGrid-item': {
      padding: '1rem 0',
    },
    "& .MuiTypography-root": {
      padding: '.5rem 0',
      fontSize: "1rem",
      lineHeight: "1.1875rem"
    }
  //   '& .MuiList-root, MuiListItem-gutters': {
  //     padding: '.5rem 0',
  //   },
  //   '& .MuiListItem-gutters': {
  //     padding: '.5rem 0',
  //   },
  //   "& .MuiTypography-h1": {
  //     fontSize: "2.5rem",
  //     fontWeight: "700",
  //     lineHeight: "4.2rem",
  //     letterSpacing: "0.1rem",
  //     margin: "1rem",
  //     textAlign: "center",
  //   },
  //   '& .MuiTypography-h4': {
  //     fontSize: '2rem',
  //     fontWeight: '500',
  //   },
  //   '& .MuiTypography-body1': {
  //     padding: '.5rem 0',
  //     lineHeight: "1.1rem",
  //   },
  // '@media (max-width: 501px)': {
  //   '& .MuiTypography-h1': {
  //     fontSize: '2rem',
  //   },
  //   '& .MuiTypography-h4': {
  //     fontSize: '1.2rem',
  //     fontWeight: '600',
  //   },
  // }
  },
  container: {
    textAlign: "justify",
    padding: "1rem",
  },
  // txtCon: {
  //   padding: ".5rem"
  // },
  // '@media (max-width: 769px)': {
  //   container: {
  //     width: "80%",
  //   }
  // },
  // '@media (max-width: 501px)': {
  //   container: {
  //     width: "85%",
  //   }
  // },
}));

export default useStyles;
