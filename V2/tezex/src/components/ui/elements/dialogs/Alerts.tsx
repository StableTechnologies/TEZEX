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

export interface IAlert {
  completionRecord: CompletionRecord;
  toggle: () => void;
}

export interface ISuccessAlert {
  successRecord: SuccessRecord;
}
export interface IErrorAlert {
  failureRecord: FailedRecord;
}

const SuccessAlert: FC<ISuccessAlert> = (props) => {
  return <Box></Box>;
};

const ErrorAlert: FC<IErrorAlert> = (props) => {
  return <Box></Box>;
};
export const TransactionAlert: FC<IAlert> = (props) => {
  const styles = useStyles(style);
  const dialogContent = () => {
    switch (props.completionRecord[0]) {
      case CompletionState.SUCCESS:
        return <SuccessAlert successRecord={props.completionRecord[1]} />;
      case CompletionState.FAILED:
        return <ErrorAlert failureRecord={props.completionRecord[1]} />;
    }
  };
  return (
    <Button sx={styles.button} onClick={props.toggle}>
      <Box sx={styles.box}></Box>
    </Button>
  );
};
