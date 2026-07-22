import React, { FC, useEffect, useState } from "react";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";

import style from "./style";

const progressSteps = ["Request", "Swap", "Complete"];
const progressAdvanceDuration = 520;

interface TransactionProgressProps {
  statusStep: number;
  styles: ReturnType<typeof style>;
}

export const TransactionProgress: FC<TransactionProgressProps> = ({
  statusStep,
  styles,
}) => {
  const prefersReducedMotion = useMediaQuery(
    "(prefers-reduced-motion: reduce)"
  );
  const [arrivedStep, setArrivedStep] = useState(statusStep);
  const displayStep = Math.min(arrivedStep, statusStep);
  const advancing = statusStep > displayStep;

  useEffect(() => {
    if (statusStep <= arrivedStep) {
      if (statusStep !== arrivedStep) setArrivedStep(statusStep);
      return;
    }

    const timer = window.setTimeout(
      () => setArrivedStep(statusStep),
      prefersReducedMotion ? 0 : progressAdvanceDuration
    );

    return () => window.clearTimeout(timer);
  }, [arrivedStep, prefersReducedMotion, statusStep]);

  return (
    <Box sx={styles.progressRail} role="list">
      <Box sx={styles.progressTrack} aria-hidden="true" />
      <Box
        data-testid="progress-track-fill"
        sx={{
          ...styles.progressTrackFill,
          width: `${8.3334 + ((statusStep - 1) / 2) * 66.6666}%`,
        }}
        aria-hidden="true"
      />
      {progressSteps.map((step, index) => {
        const stepNumber = index + 1;
        const completed =
          stepNumber < statusStep ||
          (statusStep === 3 && !advancing && stepNumber === 3);
        const current =
          !advancing && statusStep < 3 && displayStep === stepNumber;
        const reached = completed || current;

        return (
          <Box
            key={step}
            sx={styles.progressStep}
            role="listitem"
            aria-current={current ? "step" : undefined}
            aria-label={`${step}: ${
              current ? "in progress" : completed ? "complete" : "not started"
            }`}
          >
            <Box
              sx={{
                ...styles.statusDot,
                ...(completed ? styles.statusDotReached : {}),
                ...(current ? styles.statusDotCurrent : {}),
              }}
            />
            <Typography
              sx={{
                ...styles.progressLabel,
                ...(reached ? styles.progressLabelReached : {}),
              }}
            >
              {step}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
};
