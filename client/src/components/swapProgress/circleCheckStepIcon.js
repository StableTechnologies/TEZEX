import React from "react";
import {useStepIconStyles} from "./style";

import clsx from 'clsx';
import circle_check from '../../assets/circle_check.svg'

const CircleCheckStepIcon = (props) => {
  const classes = useStepIconStyles();
  const { active, completed } = props;

  return (
    <div
      className={clsx(classes.root, {
        [classes.active]: active,
      })}
    >
      {completed && <img src={circle_check} alt="circle_check" className={classes.completed} /> }
    </div>
  );
}

export default CircleCheckStepIcon