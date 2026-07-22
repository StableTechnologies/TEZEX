import React, { FC, useEffect, useMemo, useState } from "react";

import Box from "@mui/material/Box";

import useStyles from "../../../../hooks/styles";
import {
  CompletionState,
  CompletionRecord,
  FailedRecord,
  SuccessRecord,
  TransactingComponent,
} from "../../../../types/general";

import {
  formatWithSubscript,
  getExplorer,
  shorten,
} from "../../../../functions/util";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import Typography from "@mui/material/Typography";
import tick from "../../../../assets/tick.svg";
import copyIcon from "../../../../assets/copyIcon.svg";
import EastIcon from "@mui/icons-material/East";
import AddIcon from "@mui/icons-material/Add";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
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
  const explorerLink =
    getExplorer(props.successRecord.tx.network) + props.successRecord.opHash;

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
        <Typography sx={styles.title}>Transaction confirmed</Typography>
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
  const isSwap = props.failureRecord.component === TransactingComponent.SWAP;
  const confirmationUnknown =
    props.failureRecord.submitted && props.failureRecord.safeToRetry === false;
  const submittedFailure =
    props.failureRecord.submitted && props.failureRecord.safeToRetry === true;
  const title = confirmationUnknown
    ? "Confirmation not verified"
    : isSwap
    ? "Swap failed"
    : "Transaction failed";
  const reason = confirmationUnknown
    ? "Your wallet submitted this operation, but TEZEX could not verify its final status."
    : props.failureRecord.reason.trim();
  const explorerLink =
    props.failureRecord.opHash && props.failureRecord.network
      ? `${getExplorer(props.failureRecord.network)}${
          props.failureRecord.opHash
        }`
      : undefined;

  return (
    <DialogContent sx={styles.failureContent}>
      <Box sx={styles.failureMark} aria-hidden="true">
        <Typography component="span" sx={styles.failureMarkGlyph}>
          !
        </Typography>
      </Box>

      <Typography sx={styles.failureEyebrow}>
        {confirmationUnknown
          ? "STATUS NEEDS VERIFICATION"
          : "TRANSACTION NOT COMPLETED"}
      </Typography>
      <Typography
        component="h2"
        id="alert-dialog-title"
        sx={styles.failureTitle}
      >
        {title}
      </Typography>
      <DialogContentText
        id="alert-dialog-description"
        sx={styles.failureReason}
      >
        {reason}
      </DialogContentText>

      {(isSwap || confirmationUnknown || submittedFailure) && (
        <Box sx={styles.failureGuidance}>
          <Typography sx={styles.failureGuidanceTitle}>
            {confirmationUnknown ? "Do not retry yet" : "Before you retry"}
          </Typography>
          <Typography sx={styles.failureGuidanceText}>
            {confirmationUnknown
              ? "Open the operation on TzKT. Retry only if the explorer shows that it failed or never appeared."
              : submittedFailure
              ? "The submitted operation did not apply. Review the wallet result and amounts before trying again."
              : "The wallet did not submit a confirmed operation. Review the amount and try again when ready."}
          </Typography>
          {explorerLink && (
            <Link
              href={explorerLink}
              target="_blank"
              rel="noopener noreferrer"
              sx={styles.failureExplorerLink}
            >
              View operation on TzKT
            </Link>
          )}
        </Box>
      )}

      {props.failureRecord.detail && (
        <Box sx={styles.failureDetailsContainer}>
          <Button
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            endIcon={
              expanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />
            }
            sx={styles.failureDetailsButton}
          >
            Technical details
          </Button>

          <Collapse in={expanded}>
            <Box sx={styles.failureDetailsContent}>
              <Typography sx={styles.failureDetailsText}>
                {props.failureRecord.reason}
                {": "}
                {props.failureRecord.detail}
              </Typography>
            </Box>
          </Collapse>
        </Box>
      )}
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
  const isFailure = props.completionRecord?.[0] === CompletionState.FAILED;
  const failureRecord = isFailure
    ? (props.completionRecord?.[1] as FailedRecord)
    : undefined;
  const isSwapFailure = failureRecord?.component === TransactingComponent.SWAP;
  const confirmationUnknown =
    failureRecord?.submitted && failureRecord.safeToRetry === false;

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
      sx={[styles.dialog, ...(isFailure ? [styles.failureDialog] : [])]}
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <AlertContent />
      <DialogActions
        sx={[styles.action, ...(isFailure ? [styles.failureActions] : [])]}
      >
        <Button
          sx={[
            styles.button,
            !isFailure ? styles.buttonSuccess : styles.failureButton,
          ]}
          onClick={handleClose}
        >
          {!isFailure
            ? "Close"
            : confirmationUnknown
            ? "Close"
            : isSwapFailure
            ? "Review swap"
            : "Review transaction"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
