import React, { FC } from "react";

import { Asset } from "../../../../../../types/general";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import { WalletConnected } from "../../../../../session/WalletConnected";

import { style } from "./style";
import useStyles from "../../../../../../hooks/styles";

export interface ILeftInput {
  inputRef: React.RefObject<HTMLInputElement>;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  asset?: Asset;
  balance?: string;
  label?: string;
  readOnly?: boolean;
  updateAmount: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputString: string;
  editing: boolean;
  scalingKey?: string;
}

export const LeftInput: FC<ILeftInput> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  return (
    <Box sx={styles.leftInput.gridContainter}>
      <TextField
        ref={props.inputRef}
        autoFocus={props.readOnly ? false : props.focused}
        onFocus={props.onFocus}
        onBlur={props.onBlur}
        onChange={props.updateAmount}
        id="filled-start-adornment"
        sx={styles.leftInput.textField}
        InputProps={{
          disableUnderline: true,

          onKeyDown:
            !props.editing && props.inputString === "0.00"
              ? props.onKeyDown
              : () => {
                  null;
                },
          endAdornment: (
            <InputAdornment position="end">
              <Box sx={styles.leftInput.inputAdornment.box}>
                <Box sx={styles.leftInput.inputAdornment.box}>
                  <img
                    style={styles.leftInput.inputAdornment.img}
                    src={
                      props.asset && process.env.PUBLIC_URL + props.asset.logo
                    }
                    alt="logo"
                  />
                </Box>
                <Box>
                  <Typography sx={styles.leftInput.inputAdornment.typography}>
                    {props.asset && props.asset.label}
                  </Typography>
                </Box>
              </Box>
            </InputAdornment>
          ),
        }}
        inputProps={{
          readOnly: props.readOnly,

          inputMode: "decimal",
          style: {
            ...styles.leftInput.input,
          },
        }}
        variant="standard"
      />
      <WalletConnected>
        <Typography
          color="textSecondary"
          variant="subtitle2"
          hidden={props.balance ? false : true}
          sx={styles.leftInput.balanceTypography}
        >
          balance: {props.balance} {props.asset && props.asset.name}
        </Typography>
      </WalletConnected>
    </Box>
  );
};
