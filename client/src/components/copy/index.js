import React, { useRef, useState } from 'react';
import Typography from "@material-ui/core/Typography";

import copyIcon from '../../assets/copyIcon.svg';
import Button from "@material-ui/core/Button";

import Tooltip from '@material-ui/core/Tooltip';


const Copy = (props) => {
  const { text, copyText, tooltip, } = props;

  const [copySuccess, setCopySuccess] = useState('');
  const textAreaRef = useRef(null);

  function copyToClipboard(e) {
    textAreaRef.current.select();
    document.execCommand('copy');
    // This is just personal preference.
    // I prefer to not show the whole text area selected.
    e.target.focus();
    setCopySuccess('Copied!');
  };
  return (
    <div>
      <Typography>
        { text +" "+ copyText}
        <Tooltip title={tooltip} >
          {/* <Button onClick={copyToClipboard}> */}
          <Button onClick={() => navigator.clipboard.writeText(copyText)}>
            <img src={copyIcon} alt="copyIcon" />
          </Button>
        </Tooltip>
        {copySuccess}
      </Typography>
    </div>
  )
}

export default Copy;
