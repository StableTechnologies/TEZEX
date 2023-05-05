import React, { FC } from "react";

import { Asset } from "../../../../../types/general";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import liquiditySwapIcon from "../../../../../assets/liquiditySwapIcon.svg";

import { WalletConnected } from "../../../../session/WalletConnected";

import { style } from "./style";
import useStyles from "../../../../../hooks/styles";

export interface IRigthInput {
  asset: Asset;

  balance?: string;
  label?: string;
  darker?: boolean;
  readOnly?: boolean;
  updateAmount: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  inputString: string;
  editing: boolean;
  noUserActionCheck: () => boolean;
  toggle: () => void;
  swap?: () => void;
}

export const RightInput: FC<IRigthInput> = (props) => {
  const styles = useStyles(style);
  return (
    <Box
      sx={
        props.darker
          ? styles.rightInput.gridContainter.darker
          : styles.rightInput.gridContainter.lighter
      }
    >
      <Box sx={styles.rightInput.inputAdornmentStart.boxLabel}>
        <Typography sx={styles.rightInput.label}>{props.label}</Typography>
      </Box>
      <Box
        sx={{
          "&.MuiBox-root": {
            marginBottom: "0px",
            marginTop: props.label ? "0px" : "0px",
          },
        }}
      >
        <TextField
          autoFocus={props.readOnly ? false : true}
          onChange={props.updateAmount}
          value={props.inputString}
          id="filled-start-adornment"
          sx={
            props.label
              ? props.noUserActionCheck()
                ? styles.rightInput.textFieldTextAboveGrey
                : styles.rightInput.textFieldTextAbove
              : props.noUserActionCheck()
              ? styles.rightInput.textFieldGrey
              : styles.rightInput.textField
          }
          InputProps={{
            disableUnderline: true,
            onKeyDown:
              !props.noUserActionCheck && props.inputString === "0.00"
                ? props.onKeyDown
                : () => {
                    null;
                  },
            startAdornment: (
              <InputAdornment position="start">
                <Box sx={styles.rightInput.inputAdornmentStart.boxToken}>
                  <img
                    style={
                      props.label
                        ? styles.rightInput.inputAdornmentStart.img
                        : styles.rightInput.inputAdornmentStart.imgLarger
                    }
                    src={process.env.PUBLIC_URL + props.asset.logo}
                    alt="logo"
                  />
                  <Box sx={{ marginTop: "0px" }}>
                    <Typography
                      sx={
                        props.label
                          ? styles.rightInput.inputAdornmentStart.typography
                          : styles.rightInput.inputAdornmentStart
                              .typographyForLargerLogo
                      }
                    >
                      {props.asset.label}
                    </Typography>
                  </Box>
                </Box>
              </InputAdornment>
            ),

            endAdornment: (
              <InputAdornment
                position="end"
                sx={
                  props.label
                    ? styles.rightInput.inputAdornmentEnd.adornmentLabelAbove
                    : styles.rightInput.inputAdornmentEnd.adornmentLabelAbove
                }
              >
                <Box>
                  <Box visibility={props.swap ? "visible" : "hidden"}>
                    <Button
                      onClick={props.toggle}
                      sx={styles.rightInput.inputAdornmentEnd.button}
                    >
                      <img
                        style={styles.rightInput.inputAdornmentEnd.img}
                        src={liquiditySwapIcon}
                        alt="logo"
                      />
                    </Button>
                  </Box>

                  <WalletConnected>
                    <Box sx={styles.rightInput.balance.grid}>
                      <Typography
                        color="textSecondary"
                        variant="subtitle2"
                        hidden={props.balance ? false : true}
                        sx={styles.rightInput.balance.typography}
                      >
                        Balance: {props.balance} {props.asset.name}
                      </Typography>
                    </Box>
                  </WalletConnected>
                </Box>
              </InputAdornment>
            ),
          }}
          inputProps={{
            readOnly: props.readOnly,
            style: {
              ...styles.rightInput.input,
            },
          }}
          variant="standard"
        />
      </Box>
    </Box>
  );
};
