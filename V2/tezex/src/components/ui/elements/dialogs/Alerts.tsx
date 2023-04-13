import React, { FC } from "react";

import Box from "@mui/material/Box";

import useStyles from "../../../../hooks/styles";
import {
  CompletionState,
  Errors,
  CompletionRecord,
  FailedRecord,
  SuccessRecord,
} from "../../../../types/general";

import { shorten } from "../../../../functions/util";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import alertIcon from "../../../../assets/alert.svg";
import closeIcon from "../../../../assets/closeIcon.svg";
import tick from "../../../../assets/tick.svg";
import copyIcon from "../../../../assets/copyIcon.svg";

import style from "./style";
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
  const styles = useStyles(style);
  return (
    <DialogContent sx={styles.dialogContentSuccess}>
      <Box sx={styles.successContentBox}>
        <Box sx={styles.alertIconBox}>
          <img style={styles.tickIcon} src={tick} alt="Check Mark" />
        </Box>
        <DialogContentText
          sx={styles.successContenTextBox}
          id="alert-dialog-description"
        >
          <Typography sx={styles.successText}>
            Operation Hash :{" "}
            {shorten(5, 5, props.successRecord.opHash) as string}
            <Button sx={styles.copyButton}>
              <img style={styles.copyIcon} src={copyIcon} alt="Copy Icon" />
            </Button>
          </Typography>
        </DialogContentText>
      </Box>
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
          <Typography sx={styles.titleTypography}>
            {props.completionRecord && (props.completionRecord[0] as string)}
          </Typography>
        </DialogTitle>

        <Button onClick={handleClose}>
          <img style={styles.closeIcon} src={closeIcon} alt="Alert Icon" />
        </Button>
      </Box>
      <AlertContent />
      <DialogActions sx={styles.action}>
        <Button size="small" sx={styles.button} onClick={handleClose}>
          Ok, go back
        </Button>
      </DialogActions>
    </Dialog>
  );
};
