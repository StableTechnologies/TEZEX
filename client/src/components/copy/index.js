import React from 'react';
import Typography from "@material-ui/core/Typography";

import copyIcon from '../../assets/copyIcon.svg';
import Button from "@material-ui/core/Button";


const Copy = (props) => {
  const { value } = props;
  return (
    <div>
      <Typography>
        {value}
      </Typography>
      <Button>
        <img src={copyIcon} alt="copyIcon" />
        copy
      </Button>
    </div>
  )
}

export default Copy;
