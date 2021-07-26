import React, { useContext, useEffect, useState } from "react";
import {useStyles, } from "./style";
import PropTypes from "prop-types";


import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogActions from '@material-ui/core/DialogActions';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import StepContent from '@material-ui/core/StepContent';
import Button from '@material-ui/core/Button';
import Paper from '@material-ui/core/Paper';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';

import CircleCheckStepIcon from './circleCheckStepIcon';

import minimize from '../../assets/minimize.svg';
import question_circle from '../../assets/question_circle.svg';
import pleading_face from '../../assets/pleading_face.svg';
import spinner from '../../assets/spinner.gif';

const getSteps = () => {
  return ['1. Creating Swap Request', '2. Implementing Swap', '3. Validating Transaction'];
}

const getStepContent = (step) => {
  switch (step) {
    case 0:
      return `Approve the Token and confirm the amount in your wallet.`;
    case 1:
      return 'Response found! Authorize the transaction in your wallet.';
    // case 2:
    //   return `If no response is found to your swap request, you will be able to redeem a refund after this timeout period.`;
    default:
      return ' ';
  }
}

const SwapProgress = (props) => {
  const classes = useStyles();

  const [activeStep, setActiveStep] = useState();
  const [refundTime, setRefundTime] = useState(0);
  const { open, onClose, swaps, completed, notCompleted, } = props;
  const steps = getSteps();

  const handleStepChange = (step) => {
    Object.keys(step).map((key) => {
      setRefundTime(new Date(step[key].refundTime * 1000).toLocaleString())
      setActiveStep(step[key].state)
    });
  };

  let notify;

  useEffect(() => {
    if(activeStep === 0) {
      notify = setTimeout(async () => { await notCompleted(); }, 3000);
    }
    if(activeStep === 3) {
      notify = setTimeout(async () => { await completed();
    }, 3000);

    }
  }, [activeStep]);

const handleClose = () => {
  clearTimeout(notify);
  onClose();
}

  useEffect(() => {
      if(swaps) {
      try {
        handleStepChange(swaps);
      } catch (e) {}
    }
    }, [handleStepChange])

  return(
    <Dialog aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
      <DialogTitle onClose={handleClose}>
        Swap In Progress...
        <Typography> Do not close or refresh the page. </Typography>
        <IconButton aria-label="close" onClick={handleClose} className={classes.close}>
          <img src={minimize} alt="minimize" />
        </IconButton>
      </DialogTitle>
      <DialogContent className={classes.spinnerCon}>
        <img src={spinner} alt="spinner" className={classes.spinner} />
      </DialogContent>
      <DialogActions>
      <Stepper activeStep={activeStep} orientation="vertical" className={classes.root}>
        {steps.map((label, index) => (
          <Step key={label}>
            <Step >
              <StepLabel StepIconComponent={CircleCheckStepIcon} >
                {label}
              </StepLabel>
            </Step>
            <Step >
              <StepLabel >
                <Typography style={{paddingLeft: "14px"}}>{getStepContent(index)}</Typography>
              </StepLabel>
            </Step>
          </Step>
        ))}
      </Stepper>
      </DialogActions>
      <DialogContent>
        <DialogContentText>
          Swap will timeout in: {" "} {refundTime || " "} <img src={question_circle} alt="question_circle" className={classes.textImg}/>
        </DialogContentText>
        <DialogContentText>
          Don’t leave me <img src={pleading_face} alt="pleading_face" className={classes.textImg}/>
        </DialogContentText>
        <DialogContentText>
          To avoid accidental transaction fees, please stay connected to the site.
        </DialogContentText>
      </DialogContent>
    </Dialog>

  )
}

export default SwapProgress;