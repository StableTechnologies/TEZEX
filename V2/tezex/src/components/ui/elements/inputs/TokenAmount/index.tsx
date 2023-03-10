import React, { memo, FC, useCallback, useState, useEffect } from "react";

import { Asset } from "../../../../../types/general";

import Grid2 from "@mui/material/Unstable_Grid2"; // Grid version 2
//import KeyboardArrowDownIcon from '@mui/material/icons/KeyboardArrowDown';
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import liquiditySwapIcon from "../../../../../assets/liquiditySwapIcon.svg";

import { WalletConnected } from "../../../../session/WalletConnected";

import { style } from "./style";

export interface ITokenAmountInput {
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

const TokenAmountInput: FC<ITokenAmountInput> = (props) => {
  const [inputString, setInputString] = useState<string>(props.value);
  const onChange = props.onChange;
  const value = props.value;
  const loading = props.loading;
  useEffect(() => {
    setInputString(value);
  }, [loading, value]);
  const callBack = useCallback(
    async (value: string) => {
      if (onChange) onChange(value);
    },
    [onChange]
  );
  const toggle = () => {
    if (props.swap) props.swap();
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      if (props.value !== inputString && !props.readOnly) {
        callBack(inputString);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [inputString, callBack, props]);
  useEffect(() => {
    if (props.value !== inputString && props.readOnly) {
      setInputString(props.value);
    }
  }, [props, inputString]);

  const updateAmount = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setInputString(e.target.value);
  }, []);

  const Variant = () => {
    switch (props.variant) {
      case "LeftInput":
        return (
          <Grid2 container sx={style.leftInput.gridContainter}>
            <TextField
              autoFocus
              onChange={updateAmount}
              value={inputString}
              //label={props.label ? props.label : ""}
              id="filled-start-adornment"
              sx={style.leftInput.textField}
              InputProps={{
                disableUnderline: true,
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={style.leftInput.inputAdornment.box}>
                      <div>
                        <img
                          style={style.leftInput.inputAdornment.img}
                          src={props.asset.logo}
                          alt="logo"
                        />
                      </div>
                      <div>
                        <Typography
                          sx={style.leftInput.inputAdornment.typography}
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
                  ...style.leftInput.input,
                },
              }}
              variant="standard"
            />
            <WalletConnected>
              <Typography
                color="textSecondary"
                variant="subtitle2"
                hidden={props.balance ? false : true}
                sx={style.leftInput.balanceTypography}
              >
                balance: {props.balance} {props.asset.name}
              </Typography>
            </WalletConnected>
          </Grid2>
        );
      default:
        return (
          <Grid2 container>
            <Grid2
              container
              sx={
                props.darker
                  ? style.rightInput.gridContainter.darker
                  : style.rightInput.gridContainter.lighter
              }
            >
              <TextField
                autoFocus={props.readOnly ? false : true}
                onChange={updateAmount}
                value={inputString}
                //label={props.label ? props.label : ""}
                id="filled-start-adornment"
                sx={style.rightInput.textField}
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box sx={style.rightInput.inputAdornmentStart.box}>
                        <Box sx={style.rightInput.inputAdornmentStart.boxLabel}>
                          {props.label}
                        </Box>
                        <Box sx={style.rightInput.inputAdornmentStart.boxToken}>
                          <div>
                            <img
                              style={style.rightInput.inputAdornmentStart.img}
                              src={props.asset.logo}
                              alt="logo"
                            />
                          </div>
                          <Typography
                            sx={style.rightInput.inputAdornmentStart.typography}
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
                      sx={style.rightInput.inputAdornmentEnd.adornment}
                    >
                      <Box visibility={props.swap ? "visible" : "hidden"}>
                        <Button
                          onClick={toggle}
                          sx={style.rightInput.inputAdornmentEnd.button}
                        >
                          <img
                            style={style.rightInput.inputAdornmentEnd.img}
                            src={liquiditySwapIcon}
                            alt="logo"
                          />
                        </Button>
                      </Box>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  readOnly: props.readOnly,
                  style: {
                    // compiler complains when moving textAlign to style
                    textAlign: "right",
                    ...style.rightInput.input,
                  },
                }}
                variant="standard"
              />
              <WalletConnected>
                <Grid2 sx={style.rightInput.balance.grid}>
                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                    hidden={props.balance ? false : true}
                    sx={style.rightInput.balance.typography}
                  >
                    Balance: {props.balance} {props.asset.name}
                  </Typography>
                </Grid2>
              </WalletConnected>
            </Grid2>
          </Grid2>
        );
    }
  };
  return <Variant />;
};

export const TokenInput = memo(TokenAmountInput);
