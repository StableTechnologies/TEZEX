import React, { FC } from "react";
import Button from "@mui/material/Button";
import swapIcon from "../../../assets/swapIcon.svg";

import style from "./style";
import useStyles from "../../../hooks/styles";

export interface IToggle {
  toggle: () => void;
}

export const SwapUpDownToggle: FC<IToggle> = (props) => {
  const styles = useStyles(style);
  return (
    <Button sx={styles.button} onClick={props.toggle}>
      <img style={styles.icon} src={swapIcon} alt="swapIcon" />
    </Button>
  );
};
