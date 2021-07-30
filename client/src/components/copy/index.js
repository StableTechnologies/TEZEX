import React, { useRef, useState } from 'react';

import useStyles from "./style";

import Typography from "@material-ui/core/Typography";

import copyIcon from '../../assets/copyIcon.svg';
import Button from "@material-ui/core/Button";

import Tooltip from '@material-ui/core/Tooltip';


const Copy = (props) => {
  const classes = useStyles();
  const { text, copyText, tooltip, } = props;

  return (
    <div className={classes.root}>
      <Typography>
        { text }
        <Tooltip title={tooltip} >
          <Button onClick={() => navigator.clipboard.writeText(copyText)}>
            <img src={copyIcon} alt="copyIcon" className={classes.copyImg}/>
          </Button>
        </Tooltip>
      </Typography>
    </div>
  )
}

export default Copy;
