import React, { memo, FC, useCallback, useState, useEffect } from "react";

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

import { BigNumber } from "bignumber.js";
export interface IAmountField {
  asset: Asset;
  onChange?: (value: string) => void;
  balance?: string;
  value: string;
  label?: string;
  readOnly?: boolean;
  loading?: boolean;
  variant?: "LeftInput" | "RightInput";
  darker?: boolean;
  swap?: () => void;
}

const AmountField: FC<IAmountField> = (props) => {
  const styles = useStyles(style);
  const [inputString, setInputString] = useState<string>(props.value);
  const [lastString, setLastString] = useState<string>("");
  const [editing, setEditing] = useState<boolean>(false);
  const onChange = props.onChange;
  const re = /^\d*\.?\d*$/;

  const display = useCallback(() => {
    if (isNaN(parseFloat(props.value)) || props.value === "0") {
      setInputString("0.00");
    } else setInputString(props.value);
  }, [props.value]);

  useEffect(() => {
    !editing && display();
    props.loading && display();
  }, [props.loading, props.value]);

  const callBack = useCallback(
    async (value: string) => {
      if (onChange) onChange(value);
    },
    [onChange]
  );
  const toggle = useCallback(() => {
    if (props.swap) props.swap();
  }, [props.swap]);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        !new BigNumber(props.value).isEqualTo(inputString) &&
        !props.readOnly &&
        !props.loading
      ) {
        callBack(inputString);
      } else if (new BigNumber(props.value).isEqualTo(inputString) && editing) {
        setEditing(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [inputString, callBack, props, editing]);

  useEffect(() => {
    if (props.value !== inputString && props.readOnly) {
      display();
    }
  }, [props, inputString]);

  const amountNotEntered: () => boolean = useCallback(() => {
    return inputString === "0.00" && lastString !== "0.00";
  }, [inputString, lastString]);

  const updateAmount = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      const val = e.target.value;

      if (re.test(val)) {
        setInputString(val);
        setLastString(val);
      }
      if (val.trim() === "") {
        setInputString("0.00");
        setEditing(false);
      }
    },
    [setInputString]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      if (
        e.key !== "Backspace" &&
        inputString === "0.00" &&
        re.test(e.key) &&
        !editing
      ) {
        if (lastString !== "0.00") {
          setInputString(e.key);
        } else {
          setInputString(inputString + e.key);
        }

        setEditing(true);
      } else if (e.key === "Backspace" && !editing) setEditing(true);
    },
    [inputString, editing]
  );

  const Variant = () => {
    switch (props.variant) {
      case "LeftInput":
        return (
          <Box sx={styles.leftInput.gridContainter}>
            <TextField
              autoFocus
              onChange={updateAmount}
              value={inputString}
              id="filled-start-adornment"
              sx={styles.leftInput.textField}
              InputProps={{
                disableUnderline: true,

                onKeyDown:
                  !editing && inputString === "0.00"
                    ? onKeyDown
                    : () => {
                        null;
                      },
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={styles.leftInput.inputAdornment.box}>
                      <div>
                        <img
                          style={styles.leftInput.inputAdornment.img}
                          src={process.env.PUBLIC_URL + props.asset.logo}
                          alt="logo"
                        />
                      </div>
                      <div>
                        <Typography
                          sx={styles.leftInput.inputAdornment.typography}
                        >
                          {props.asset.label}
                        </Typography>
                      </div>
                    </Box>
                  </InputAdornment>
                ),
              }}
              inputProps={{
                readOnly: props.readOnly,

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
                balance: {props.balance} {props.asset.name}
              </Typography>
            </WalletConnected>
          </Box>
        );
      default:
        return (
          <Box
            sx={
              props.darker
                ? styles.rightInput.gridContainter.darker
                : styles.rightInput.gridContainter.lighter
            }
          >
            <Box sx={styles.rightInput.inputAdornmentStart.boxLabel}>
              <Typography sx={styles.rightInput.label}>
                {props.label}
              </Typography>
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
                onChange={updateAmount}
                value={inputString}
                id="filled-start-adornment"
                sx={
                  props.label
                    ? amountNotEntered()
                      ? styles.rightInput.textFieldTextAboveGrey
                      : styles.rightInput.textFieldTextAbove
                    : amountNotEntered()
                    ? styles.rightInput.textFieldGrey
                    : styles.rightInput.textField
                }
                InputProps={{
                  disableUnderline: true,
                  onKeyDown:
                    !editing && inputString === "0.00"
                      ? onKeyDown
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
                                ? styles.rightInput.inputAdornmentStart
                                    .typography
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
                          ? styles.rightInput.inputAdornmentEnd
                              .adornmentLabelAbove
                          : styles.rightInput.inputAdornmentEnd
                              .adornmentLabelAbove
                      }
                    >
                      <Box>
                        <Box visibility={props.swap ? "visible" : "hidden"}>
                          <Button
                            onClick={toggle}
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
    }
  };
  return <Variant />;
};

export const UserAmountField = memo(AmountField);
