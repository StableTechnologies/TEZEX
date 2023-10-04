import React, { FC } from "react";

import Box from "@mui/material/Box";

import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import { style } from "./style";
import useStyles from "../../../../../../hooks/styles";

export interface ISlippageInput {
  inputRef: React.RefObject<HTMLInputElement>;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  balance?: string;
  label?: string;
  readOnly?: boolean;
  updateAmount: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputString: string;
  editing: boolean;
  scalingKey?: string;
}

export const SlippageInput: FC<ISlippageInput> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  return (
    <Box sx={styles.slippageInput.box}>
      <TextField
        autoFocus
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        disabled={props.readOnly}
        onChange={props.updateAmount}
        value={props.inputString}
        sx={styles.slippageInput}
        InputProps={{
          disableUnderline: true,
          onKeyDown:
            !props.editing && props.inputString === "0.00"
              ? props.onKeyDown
              : () => {
                  null;
                },
          endAdornment: (
            <InputAdornment
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                right: ".7vw",
                padding: "0px 0px 0px 0px",
              }}
              position="start"
            >
              %
            </InputAdornment>
          ),
          sx: {
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          },
        }}
        inputProps={{
          inputMode: "decimal",
        }}
        size="small"
        variant="standard"
      />
    </Box>
  );
};
