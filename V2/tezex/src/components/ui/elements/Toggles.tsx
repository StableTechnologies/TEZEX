import React, { FC } from "react";
import Button from "@mui/material/Button";
import swapIcon from "../../../assets/swapIcon.svg";

import style from "./style";
import useStyles from "../../../hooks/styles";

export interface IToggle {
  toggle: () => Promise<void>;
  scalingKey?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

export const SwapUpDownToggle: FC<IToggle> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  return (
    <Button
      sx={styles.button}
      onClick={props.toggle}
      disabled={props.disabled}
      aria-label={props.ariaLabel ?? "Reverse swap direction"}
    >
      <img style={styles.icon} src={swapIcon} alt="" />
    </Button>
  );
};
