import React, { FC, useEffect, useRef } from "react";

import { Asset, TransferType } from "../../../../../../types/general";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import liquiditySwapIcon from "../../../../../../assets/liquiditySwapIcon.svg";

import { WalletConnected } from "../../../../../session/WalletConnected";

import { style } from "./style";
import useStyles from "../../../../../../hooks/styles";

export interface IRigthInput {
  transferType?: TransferType;
  inputRef: React.RefObject<HTMLInputElement>;
  focused: boolean;
  updateAmount: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus: () => void;
  onBlur: () => void;
  inputString: string;
  editing: boolean;
  noUserActionCheck: () => boolean;
  toggle: () => void;
  swap?: () => void;
  asset?: Asset;
  balance?: string;
  label?: string;
  darker?: boolean;
  readOnly?: boolean;
  scalingKey?: string;
}

const Right: FC<IRigthInput> = (props) => {
  const styles = useStyles(style, props.scalingKey);

  return (
    <Box
      sx={
        props.darker
          ? styles.gridContainter.darker
          : styles.gridContainter.lighter
      }
    >
      <Box sx={styles.inputAdornmentStart.boxLabel}>
        <Typography sx={styles.label}>{props.label}</Typography>
      </Box>
      <Box sx={{}}>
        <TextField
          ref={props.inputRef}
          autoFocus={props.readOnly ? false : props.focused}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
          onChange={props.updateAmount}
          value={props.inputString}
          id="filled-start-adornment"
          sx={
            props.label
              ? props.noUserActionCheck()
                ? styles.textFieldTextAboveGrey
                : styles.textFieldTextAbove
              : props.noUserActionCheck()
              ? styles.textFieldGrey
              : styles.textField
          }
          InputProps={{
            disableUnderline: true,
            onKeyDown:
              !props.editing && props.inputString === "0.00"
                ? props.onKeyDown
                : () => {
                    null;
                  },
            startAdornment: (
              <InputAdornment position="start">
                <Box sx={styles.inputAdornmentStart.boxToken}>
                  <Box
                    sx={
                      props.label
                        ? styles.inputAdornmentStart.img
                        : styles.inputAdornmentStart.imgLarger
                    }
                  >
                    <img
                      style={{
                        height: "100%",
                        //                       width: "100%",
                      }}
                      src={
                        props.asset && process.env.PUBLIC_URL + props.asset.logo
                      }
                      alt="logo"
                    />
                  </Box>
                  <Box sx={{ marginTop: "0px" }}>
                    <Typography
                      sx={
                        props.label
                          ? styles.inputAdornmentStart.typography
                          : styles.inputAdornmentStart.typographyForLargerLogo
                      }
                    >
                      {props.asset && props.asset.label}
                    </Typography>
                  </Box>
                </Box>
              </InputAdornment>
            ),

            endAdornment: (
              <InputAdornment
                position="end"
                sx={styles.inputAdornmentEnd.adornmentLabelAbove}
              >
                <Box>
                  <Box visibility={props.swap ? "visible" : "hidden"}>
                    <Button
                      onClick={props.toggle}
                      sx={styles.inputAdornmentEnd.button}
                    >
                      <img
                        style={styles.inputAdornmentEnd.img}
                        src={liquiditySwapIcon}
                        alt="logo"
                      />
                    </Button>
                  </Box>

                  <Box sx={styles.balance.grid}>
                    <WalletConnected>
                      <Typography
                        color="textSecondary"
                        variant="subtitle2"
                        hidden={props.balance ? false : true}
                        sx={styles.balance.typography}
                      >
                        Balance: {props.balance}{" "}
                        {props.asset && props.asset.name}
                      </Typography>
                    </WalletConnected>
                  </Box>
                </Box>
              </InputAdornment>
            ),
          }}
          inputProps={{
            inputMode: "decimal",
            readOnly: props.readOnly,
            style: {
              ...styles.input,
            },
          }}
          variant="standard"
        />
      </Box>
    </Box>
  );
};

export const RightInput = React.memo(Right);
