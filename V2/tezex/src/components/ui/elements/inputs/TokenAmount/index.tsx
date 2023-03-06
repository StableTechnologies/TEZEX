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
          <Grid2 container>
            <Grid2
              container
              sx={{
                flexDirection: "row",

                borderRadius: "16px",
                backgroundColor: "background.default",
              }}
            >
              <TextField
                autoFocus
                onChange={updateAmount}
                value={inputString}
                //label={props.label ? props.label : ""}
                id="filled-start-adornment"
                sx={{
                  justifyContent: "center",
                  width: "100%",
                }}
                InputProps={{
                  disableUnderline: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Box
                        sx={{
                          display: "block",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "row",
                          }}
                        >
                          <div>
                            <img
                              style={{
                                //	marginLeft: "1vw",
                                marginRight: "1vw",
                                height: "1.61vw",
                              }}
                              src={props.asset.logo}
                              alt="logo"
                            />
                          </div>
                          <div>
                            <Typography
                              sx={{
                                fontSize: "1.11vw",

                                marginRight: "1vw",
                              }}
                            >
                              {props.asset.label}
                            </Typography>
                          </div>
                        </Box>
                      </Box>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  readOnly: props.readOnly,
                  style: {
                    textAlign: "left",

                    marginLeft: "2vw",
                    fontSize: "1.25vw",
                    lineHeight: "1.51vw",
                    //		lineHeight: "38.7px",
                  },
                }}
                variant="standard"
              />
              <WalletConnected>
                <Typography
                  color="textSecondary"
                  variant="subtitle2"
                  hidden={props.balance ? false : true}
                  sx={{
                    padding: "0px 16px",
                    textAlign: "right",
                  }}
                >
                  balance: {props.balance} {props.asset.name}
                </Typography>
              </WalletConnected>
            </Grid2>
          </Grid2>
        );
      default:
        return (
          <Grid2 container>
            <Grid2
              container
              sx={{
                flexDirection: "column",

                borderRadius: "16px",
                backgroundColor: props.darker ? "#F4F4F4" : "#F9F9F9",
              }}
            >
              <TextField
                autoFocus={props.readOnly ? false : true}
                onChange={updateAmount}
                value={inputString}
                //label={props.label ? props.label : ""}
                id="filled-start-adornment"
                sx={{
                  //  .css-1x51dt5-MuiInputBase-input-MuiInput-input
                  "& .MuiInputBase-input": {
                    position: "absolute",

                    zIndex: 5,
                    width: "100%",
                  },
                  justifyContent: "center",
                  width: "100%",
                  //height: "75px",
                }}
                InputProps={{
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <Box
                          sx={{
                            fontSize: "1.2vw",

                            marginLeft: "1vw",
                            marginRight: "1vw",
                            position: "relative",
                            bottom: "1vw",
                          }}
                        >
                          {props.label}
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "row",
                          }}
                        >
                          <div>
                            <img
                              style={{
                                marginLeft: "1vw",
                                marginRight: "1vw",
                                height: "1.61vw",
                              }}
                              src={props.asset.logo}
                              alt="logo"
                            />
                          </div>
                          <Typography
                            sx={{
                              color: "#1E1E1E",
                              fontWeight: "500",
                              fontSize: "1.25vw",
                            }}
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
                      sx={{
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "flex-end",
                        width: "100%",
                        padding: 0,
                        zIndex: 0,

                        position: "relative",
                        bottom: "3vw",
                      }}
                    >
                      <Box visibility={props.swap ? "visible" : "hidden"}>
                        <Button
                          onClick={toggle}
                          sx={{
                            justifyContent: "flex-end",
                            width: "100%",
                          }}
                        >
                          <img
                            style={{
                              width: ".66vw",
                            }}
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
                    textAlign: "right",

                    fontSize: "2.2vw",
                    //		lineHeight: "38.7px",
                  },
                }}
                variant="standard"
              />
              <WalletConnected>
                <Grid2
                  sx={{
                    position: "relative",
                    bottom: "2vw",
                  }}
                >
                  <Typography
                    color="textSecondary"
                    variant="subtitle2"
                    hidden={props.balance ? false : true}
                    sx={{
                      color: "#999999",
                      fontWeight: "400",
                      fontSize: ".97vw",
                      textAlign: "right",
                    }}
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
