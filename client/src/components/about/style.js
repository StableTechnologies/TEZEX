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
    },
    '& .MuiIconButton-root': {
      '&:hover': {
        background: 'transparent',
      },
    },
    '& .MuiLink-root': {
      color: '#000',
      '&:hover': {
        textDecoration: 'none',
        cursor: 'pointer',
        opacity: '.8',
      },
    },

  },
  container: {
    textAlign: "justify",
    padding: "1rem",
  },
  subTitle: {
    fontSize: "1.5rem !important",
    fontWeight: "500 !important",
  },
  iconCon: {
    textAlign: "center",
  },
  icon: {
    width: "1.5rem",
    height: "1.5rem",
  },
  telegramLogo: {
    background: "#2AABEE",
    borderRadius: '50%',
  },
  tezexFlow: {
    width: "100%",
    marginTop: '1rem',
    boxShadow: '1px 1px 5px 2px #eee'
  },
  outlinedLink: {
    textDecoration: "underline !important",
    color: 'blue !important',
  },

}));

export default useStyles;
