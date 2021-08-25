import React, { useContext, useEffect, useState } from "react";

import CircleCheckStepIcon from './circleCheckStepIcon';
import Tooltip from './tooltip';
import Dialog from "@material-ui/core/Dialog";
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from "@material-ui/core/DialogTitle";
import IconButton from '@material-ui/core/IconButton';
import PropTypes from "prop-types";
import Step from '@material-ui/core/Step';
import StepContent from '@material-ui/core/StepContent';
import StepLabel from '@material-ui/core/StepLabel';
import Stepper from '@material-ui/core/Stepper';
import Typography from '@material-ui/core/Typography';
import minimize from '../../assets/minimize.svg';
import pleading_face from '../../assets/pleading_face.svg';
import question_circle from '../../assets/question_circle.svg';
import spinner from '../../assets/spinner.gif';
import { useStyles, } from "./style";
import Copy from "../copy";
import { shorten } from "../../util";
import timer from "../convertDate.js";

const getSteps = () => {
  return ['1. Creating Swap Request', '2. Implementing Swap', '3. Validating Transaction'];
}

const getStepContent = (step) => {
  switch (step) {
    case 0:
      return `Approve the Token and confirm the amount in your wallet.`;
    case 1:
      return (<>Response found! Authorize the transaction in your wallet. <Tooltip /> </>);
    default:
      return ' ';
  }
}

const SwapProgress = (props) => {
  const classes = useStyles();

  const [activeStep, setActiveStep] = useState(0);
  const [refundTime, setRefundTime] = useState(0);
  const [delay, setDelay] = useState(false);
  const { open, onClose, swap, completed, notCompleted, } = props;
  const steps = getSteps();

  const handleStepChange = (step) => {
    setRefundTime(timer(step.refundTime));

    // state '-1' is the default state for a swap
    // state '0' is the default state for the progress modal
    // checks for the default state of a swap and then sets the active step to the default state of the modal
    if(step.state === -1) {
      setActiveStep(0);
    }
    // state '0' is the error state for a failed swap due to network
    else if(step.state === 0) {
      setActiveStep(-1);
    }
    else{
      setActiveStep(step.state);
    }
  };

  if (activeStep === 1) {
    setTimeout(()=>{
      setDelay(true);
    }, 30000)
  }

  let notify;

  useEffect(() => {
    if (!open) return;
    if (activeStep === -1) {
      notCompleted();
    }
    if (activeStep === 3) {
      completed();
    }
  });

  const handleClose = () => {
    clearTimeout(notify);
    onClose();
  }

  useEffect(() => {
    if (swap) {
      try {
        handleStepChange(swap);
      } catch (e) { }
    }
  }, [handleStepChange])

  return (
    <Dialog aria-labelledby="simple-dialog-title" open={open} className={classes.root}>
      <DialogTitle onClose={handleClose}>
        Swap In Progress...
        <Typography> Do not close or refresh the page. </Typography>
        { (activeStep >0 ) &&
          <IconButton aria-label="close" onClick={handleClose} className={classes.close}>
            <img src={minimize} alt="minimize" />
          </IconButton>
        }
      </DialogTitle>
      <DialogContent className={classes.spinnerCon}>
        <img src={spinner} alt="spinner" className={classes.spinner} />
      </DialogContent>
      <DialogActions>
        <Stepper activeStep={activeStep} orientation="vertical" className={classes.root}>
          {steps.map((label, index) => (
            <Step key={label} active={index===activeStep -1 || index===activeStep}>
              <StepLabel StepIconComponent={CircleCheckStepIcon} >
                {label}
              </StepLabel>
              <StepContent>
                { (index === 0) &&
                  <Typography style={{ paddingLeft: "14px" }}>{getStepContent(0)}</Typography>
                }
                { (index > 0 && delay)  &&
                  <Typography style={{ paddingLeft: "18px" }}>{getStepContent(index)}</Typography>
                }
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogActions>
      <DialogContent>
        <DialogContentText>
          <Copy
            text = {"Swap Hash : " +  shorten(10,8, swap.hashedSecret)}
            copyText = {swap.hashedSecret}
            tooltip = "copy swap hash"
          />
        </DialogContentText>
        { activeStep > 0 &&
          <>
            <DialogContentText> Value:{" "} { swap.value} </DialogContentText>
            {(swap.exact !== "nil") ?
              <DialogContentText> Exact Return:{" "} { swap.exact} </DialogContentText>
              :
              <DialogContentText> Min Expected Return:{" "} { swap.minReturn} </DialogContentText>
            }
            <DialogContentText>
            Swap will timeout in: {" "} {refundTime || " "} <img src={question_circle} alt="question_circle" className={classes.textImg} />
            </DialogContentText>
          </>
        }
        <DialogContentText>
          Don’t leave me <img src={pleading_face} alt="pleading_face" className={classes.textImg} />
        </DialogContentText>
        <DialogContentText>
          To avoid accidental transaction fees, please stay connected to the site.
        </DialogContentText>
      </DialogContent>
    </Dialog>

  )
}

export default SwapProgress;