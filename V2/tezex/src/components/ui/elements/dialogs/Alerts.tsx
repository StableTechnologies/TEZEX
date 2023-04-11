import React, { FC, useEffect } from "react";

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
  return (
    <DialogContent>
      <DialogContentText id="alert-dialog-description">
        <Typography>{props.failureRecord.reason as string}</Typography>
      </DialogContentText>
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

  useEffect(() => {
    props.completionRecord && setOpen(true);
  }, [props.completionRecord]);

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
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">
        <Typography>
          {props.completionRecord && (props.completionRecord[0] as string)}
        </Typography>
      </DialogTitle>
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
