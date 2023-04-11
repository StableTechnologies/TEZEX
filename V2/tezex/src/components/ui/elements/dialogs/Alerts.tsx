import React, { FC } from "react";

import Box from "@mui/material/Box";

import style from "./style";
import useStyles from "../../../../hooks/styles";
import {
  CompletionState,
  Errors,
  CompletionRecord,
  FailedRecord,
  SuccessRecord,
} from "../../../../types/general";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import alertIcon from "../../../../assets/alert.svg";
import closeIcon from "../../../../assets/closeIcon.svg";
export interface IAlert {
  completionRecord: CompletionRecord | undefined;
  clear: () => void;
}

export interface ISuccessAlert {
  successRecord: SuccessRecord;
}
export interface IErrorAlert {
  failureRecord: FailedRecord;
}

const SuccessAlert: FC<ISuccessAlert> = (props) => {
  return (
    <DialogContent>
      <DialogContentText id="alert-dialog-description">
        <Typography>
          Operation Hash : {props.successRecord.opHash as string}
        </Typography>
      </DialogContentText>
    </DialogContent>
  );
};

const ErrorAlert: FC<IErrorAlert> = (props) => {
  const styles = useStyles(style);
  return (
    <DialogContent sx={styles.dialogContent}>
      <Box sx={styles.errorContentBox}>
        <Box sx={styles.alertIconBox}>
          <img style={styles.alertIcon} src={alertIcon} alt="Alert Icon" />
        </Box>
        <DialogContentText
          sx={styles.errorContentBox}
          id="alert-dialog-description"
        >
          <Box sx={styles.errorContentBox}>
            <Typography align="center" sx={styles.errorText}>
              {props.failureRecord.reason as string}
            </Typography>
          </Box>
        </DialogContentText>
      </Box>
    </DialogContent>
  );
};
export const Alert: FC<IAlert> = (props) => {
  const styles = useStyles(style);
  const [open, setOpen] = React.useState(props.completionRecord ? true : false);
  const handleClose = () => {
    setOpen(false);
    props.clear();
  };

  const AlertContent = () => {
    if (props.completionRecord) {
      switch (props.completionRecord[0]) {
        case CompletionState.SUCCESS:
          return <SuccessAlert successRecord={props.completionRecord[1]} />;
        case CompletionState.FAILED:
          return <ErrorAlert failureRecord={props.completionRecord[1]} />;
      }
    } else return <Box></Box>;
  };

  return (
    <Dialog
      sx={styles.dialog}
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <Box sx={styles.titleBox}>
        <DialogTitle sx={styles.title} id="alert-dialog-title">
          <Typography sx={styles.title}>
            {props.completionRecord && (props.completionRecord[0] as string)}
          </Typography>
        </DialogTitle>

        <Button onClick={handleClose}>
          <img style={styles.closeIcon} src={closeIcon} alt="Alert Icon" />
        </Button>
      </Box>
      <AlertContent />
      <DialogActions>
        <Button onClick={handleClose}>Disagree</Button>
        <Button onClick={handleClose} autoFocus>
          Agree
        </Button>
      </DialogActions>
    </Dialog>
  );
};
