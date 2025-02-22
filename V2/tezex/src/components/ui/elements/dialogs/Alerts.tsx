import React, { FC, useEffect, useMemo, useState } from "react";

import Box from "@mui/material/Box";

import useStyles from "../../../../hooks/styles";
import {
  CompletionState,
  CompletionRecord,
  FailedRecord,
  SuccessRecord,
} from "../../../../types/general";

import { formatWithSubscript, shorten } from "../../../../functions/util";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import Typography from "@mui/material/Typography";
import alertIcon from "../../../../assets/alert.svg";
import tick from "../../../../assets/tick.svg";
import copyIcon from "../../../../assets/copyIcon.svg";
import EastIcon from "@mui/icons-material/East";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import BigNumber from "bignumber.js";
import { Collapse, Link } from "@mui/material";

import style from "./style";
export interface IAlert {
  completionRecord: CompletionRecord | undefined;
  clear: () => void;
  scalingKey?: string;
}

export interface ISuccessAlert {
  successRecord: SuccessRecord;
  scalingKey?: string;
}
export interface IErrorAlert {
  failureRecord: FailedRecord;
  scalingKey?: string;
}

const SuccessAlert: FC<ISuccessAlert> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const explorerLink = "https://tzkt.io/" + props.successRecord.opHash;

  const sendInfo = useMemo(() => {
    return props.successRecord.tx.sendAsset.map((asset, i) => (
      <Box key={i} sx={{ display: "flex", alignItems: "center" }}>
        {i == 1 && <AddIcon style={styles.assetIcon} />}
        <img
          style={styles.assetIcon}
          src={process.env.PUBLIC_URL + asset.logo}
          alt={asset.name}
        />
        <Typography sx={styles.descriptionHighlight}>
          {formatWithSubscript(
            new BigNumber(props.successRecord.tx.sendAmount[i].string),
            2
          )}
        </Typography>
        <Typography sx={styles.description}>{asset.label}</Typography>
      </Box>
    ));
  }, [props.successRecord]);

  const receiveInfo = useMemo(() => {
    return props.successRecord.tx.receiveAsset.map((asset, i) => (
      <Box key={i} sx={{ display: "flex", alignItems: "center" }}>
        {i == 1 && <AddIcon style={styles.assetIcon} />}
        <img
          style={styles.assetIcon}
          src={process.env.PUBLIC_URL + asset.logo}
          alt={asset.name}
        />
        <Typography sx={styles.descriptionHighlight}>
          {formatWithSubscript(
            new BigNumber(props.successRecord.tx.receiveAmount[i].string),
            2
          )}
        </Typography>
        <Typography sx={styles.description}>{asset.label}</Typography>
      </Box>
    ));
  }, [props.successRecord]);

  return (
    <DialogContent sx={styles.dialogContent}>
      <Box sx={styles.alertIconBox}>
        <img style={styles.tickIcon} src={tick} alt="Check Mark" />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        <Typography sx={styles.title}>Transaction submitted</Typography>
        <Box sx={styles.transferResults}>
          {sendInfo}
          <EastIcon style={styles.assetIcon} />
          {receiveInfo}
        </Box>

        <Box sx={styles.successLinks}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              padding: 0,
            }}
          >
            <Typography sx={styles.descriptionHighlight}>{"Hash: "}</Typography>
            <Typography sx={styles.description}>
              {shorten(4, 3, props.successRecord.opHash) as string}
            </Typography>
            <Button
              sx={styles.copyButton}
              onClick={() =>
                navigator.clipboard.writeText(props.successRecord.opHash)
              }
            >
              <img style={styles.copyIcon} src={copyIcon} alt="Copy Icon" />
            </Button>
          </Box>

          <Link sx={styles.explorerLink} href={explorerLink} underline="hover">
            View on TzKT
          </Link>
        </Box>
      </Box>
    </DialogContent>
  );
};

const ErrorAlert: FC<IErrorAlert> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const [expanded, setExpanded] = useState(false);

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
              {"Error: The request couldn’t be completed. Please try again."}
            </Typography>
          </Box>
        </DialogContentText>

        <Box sx={styles.errorDetailsContainer}>
          <Button
            onClick={() => setExpanded(!expanded)}
            endIcon={
              expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />
            }
            sx={styles.errorDetails}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <ErrorOutlineIcon />
              Error details
            </Box>
          </Button>

          <Collapse in={expanded}>
            <Box sx={styles.errorDetailsContent}>
              <Typography variant="body2" color="text.secondary">
                {props.failureRecord.reason}
              </Typography>
            </Box>
          </Collapse>
        </Box>
      </Box>
    </DialogContent>
  );
};

export const Alert: FC<IAlert> = (props) => {
  const scalingKey = props.scalingKey || "alert";
  const styles = useStyles(style, scalingKey);
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
          return (
            <SuccessAlert
              successRecord={props.completionRecord[1]}
              scalingKey={scalingKey}
            />
          );
        case CompletionState.FAILED:
          return (
            <ErrorAlert
              failureRecord={props.completionRecord[1]}
              scalingKey={scalingKey}
            />
          );
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
      <AlertContent />
      <DialogActions sx={styles.action}>
        <Button
          sx={[
            styles.button,
            props.completionRecord?.[0] === CompletionState.SUCCESS
              ? styles.buttonSuccess
              : styles.buttonError,
          ]}
          onClick={handleClose}
        >
          {props.completionRecord?.[0] === CompletionState.SUCCESS
            ? "Close"
            : "Dismiss"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
