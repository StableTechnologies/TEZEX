import { makeStyles } from "@material-ui/core/styles";

export const useStyles = makeStyles((theme) => ({

  root: {
    "& .MuiPaper-root": {
      borderRadius: "1.5rem",
    },
    "& .MuiDialogContent-root": {
      overflow: "hidden",
    },
    "& .MuiDialogActions-root": {
      justifyContent: "flex-start",
    },
    "& .MuiStepConnector-lineVertical": {
      border: "0",
    },
    "& .MuiStepLabel-root": {
      flexFlow: "row-reverse",
      width: "fit-content",
    },
    "& .MuiStepLabel-labelContainer": {
      paddingRight: "8px",
      color: "#000 !important",
    },
    "& .MuiStepLabel-iconContainer": {
      paddingRight: "0",
    },

    "& .MuiTypography-body1": {
      fontSize: ".875rem",
    },
    "& .MuiTypography-body2": {
      fontSize: "1rem",
    },
    "& .MuiDialogContentText-root": {
      color: "#000",
      textAlign: "center",
      fontWeight: "500",
      lineHeight: "1.1rem",
    },
    '@media (max-width: 501px)': {
      "& .MuiTypography-body1": {
        fontSize: ".7rem",
      },
      "& .MuiTypography-body2": {
        fontSize: ".8rem",
      },
      "& .MuiDialogContent-root": {
        padding: "0 8px",
      },
    },
    "& .MuiStepContent-root": {
      padding: "0 0 0 1px",
      margin: "0",
      border: "0",
    },
  },
  stepText: {
    root: {
      "& .MuiStepLabel-labelContainer": {
        paddingLeft: "14px",
      },
    }
  },
  close: {
    position: 'absolute',
    right: theme.spacing(1),
    top: theme.spacing(1)
  },
  spinnerCon: {
    margin: "0 auto",
  },
  spinner: {
    width: "120px",
    width: "120px",
  },
  textImg: {
    marginBottom: "-4px",
  },
  '@media (max-width: 501px)': {
    spinner: {
      width: "103px",
      width: "102px",
    },
  }

}));

export const useStepIconStyles = makeStyles({
  root: {
    color: '#eaeaf0',
    display: 'flex',
    height: 22,
    alignItems: 'center',
  },
  active: {
    color: '#784af4',
  },

  completed: {
    color: '#784af4',
    zIndex: 1,
    fontSize: 18,
  },
});
