import React, { FC } from "react";

import Box from "@mui/material/Box";

import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import { style } from "./style";
import useStyles from "../../../../../hooks/styles";

export interface ISlippageInput {
  balance?: string;
  label?: string;
  readOnly?: boolean;
  updateAmount: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputString: string;
  editing: boolean;
}

export const SlippageInput: FC<ISlippageInput> = (props) => {
  const styles = useStyles(style);
  return (
    <Box sx={styles.slippageInput.box}>
      <TextField
        autoFocus
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
        inputProps={{}}
        size="small"
        variant="standard"
      />
    </Box>
  );
};
