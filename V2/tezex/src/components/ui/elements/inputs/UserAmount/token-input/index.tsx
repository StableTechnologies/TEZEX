import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import {
  Asset,
  AssetState,
  Id,
  TransactingComponent,
  TransferType,
} from "../../../../../../types/general";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import liquiditySwapIcon from "../../../../../../assets/liquiditySwapIcon.svg";

import { WalletConnected } from "../../../../../session/WalletConnected";

import { style } from "./style";
import useStyles from "../../../../../../hooks/styles";
import { useTransaction } from "../../../../../../hooks/transaction";
import {
  cleanNumericString,
  isNumeric,
} from "../../../../../../functions/util";
import debounce from "lodash/debounce";
import { useDebounce } from "usehooks-ts";
import { eq, toNumber } from "lodash";
import { convertToObject } from "typescript";
export interface IRigthInput {
  component: TransactingComponent;
  transferType: TransferType;
  asset: Asset;
  //inputRef: React.RefObject<HTMLInputElement>;
  //focused: boolean;
  //updateAmount: (e: React.ChangeEvent<HTMLInputElement>) => void;
  //onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  //onFocus: () => void;
  //onBlur: () => void;
  //editing: boolean;
  //noUserActionCheck: () => boolean;
  // toggle: () => void;
  variant?: "LeftInput" | "RightInput";
  swap?: () => void;
  label?: string;
  darker?: boolean;
  readOnly?: boolean;
  scalingKey?: string;
}

const TokenInput: FC<IRigthInput> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const transactionOps = useTransaction(
    props.component,
    { transferType: props.transferType, asset: props.asset },
    false
  );
  const [value, setValue] = useState("0.00");
  const debouncedValue = useDebounce<string>(value, 500);
  const [balance, setBalance] = useState("");
  const [isZeroOnFocus, setIsZeroOnFocus] = useState(false);

  // set asset state
  const [transactionBalance, setTransactionBalance] = useState<
    string | unknown
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [id, setId] = useState<Id | undefined>(undefined);
  const swap = useCallback(() => {
    console.log("swap-right-input");
    if (props.swap) props.swap();
  }, [props.swap]);

  // Set id on new transaction and set loading to true
  useEffect(() => {
    const transactionId = transactionOps.getActiveTransaction()?.id;
    if (!id && transactionId) {
      setId(transactionId);
      setLoading(true);
    }
    if (id && transactionId && id !== transactionId) {
      setId(transactionId);
      setLoading(true);
    }
  }, [transactionOps.getActiveTransaction, id]);

  // boolean check to see  if updates can be made
  const canUpdate = useCallback(() => {
    return !(transactionOps.loading || transactionOps.transacting);
  }, [transactionOps.loading, transactionOps.transacting]);

  // callback to set loading to false
  const setLoadingFalse = useCallback(() => {
    //check if updates can be made and set loading to false
    canUpdate() &&
      setLoading((loading) => {
        //only update if loading is true
        if (loading === false) return loading;
        else return false;
      });
  }, [canUpdate]);

  // call back to load value and set loading to false
  const loadValue = useCallback(() => {
    const amount = transactionOps.trackedAsset?.amount?.string;
    if (amount) {
      //update value if different
      setValue((value) => {
        if (toNumber(value) === toNumber(amount)) return value;
        else if (props.readOnly && toNumber(amount) === 0) return "0.00";
        else return amount;
      });
      //handle loading
      setLoadingFalse();
    }
  }, [
    transactionOps.trackedAsset?.amount?.string,
    props.readOnly,
    setLoadingFalse,
  ]);

  //callback to update balance
  const updateBalance = useCallback(() => {
    const balance = transactionOps.trackedAsset?.balance?.string;
    if (balance) {
      //update balance if different
      setTransactionBalance((_balance: string | undefined) => {
        if (_balance === balance) return _balance;
        else return balance;
      });
    }
  }, [transactionOps.trackedAsset?.balance?.string]);

  // on transaction balance change , update balance
  useEffect(() => {
    updateBalance();
  }, [updateBalance]);

  // on id or amount change , load value and handle loading
  useEffect(() => {
    const transactionId = transactionOps.getActiveTransaction()?.id;

    console.log("load value effect, id", id, "transactionId", transactionId);
    // non-read only: update local value only on id change
    if (!props.readOnly && loading) {
      console.log("load value : non read only");
      loadValue();
    }
    //  read only , update on transaction change
    if (props.readOnly) {
      loadValue();
    }
  }, [
    id,
    props.readOnly,
    transactionOps.getActiveTransaction,
    loading,
    loadValue,
  ]);

  //debug loading
  useEffect(() => {
    console.log("loading", loading);
  }, [loading]);
  // track hook state for loading and transacting  and set loading to true
  useEffect(() => {
    if (!canUpdate()) {
      console.log("set loading to true");
      setLoading(true);
    }
  }, [canUpdate]);

  // Callback to check if local value differs from transaction amount
  // if it does it calls an update
  const updateAmount = useCallback(
    async (value: string, oldValue: string) => {
      if (toNumber(value) !== toNumber(oldValue)) {
        canUpdate() && (await transactionOps.updateAmount(value));
      }
    },
    [canUpdate, transactionOps.updateAmount]
  );

  // This effect tracks and  sends the debounced value for updating
  // the transaction amount,
  useEffect(() => {
    // if (!props.readOnly && debouncedValue !== "0.00") {
    //   const oldValue = transactionOps.trackedAsset?.amount?.string;
    //   oldValue && updateAmount(debouncedValue, oldValue);
    // }

    if (!props.readOnly) {
      const oldValue = transactionOps.trackedAsset?.amount?.string;
      oldValue && updateAmount(debouncedValue, oldValue);
    }
  }, [
    props.readOnly,
    debouncedValue,
    transactionOps.trackedAsset?.amount?.string,
    updateAmount,
  ]);

  //const [transactionAmount, setTransactionAmount] = useState<string | unknown>(
  //  undefined
  //);

  //useEffect(() => {
  //  const amountState = transactionOps.trackedAsset?.amount?.string;
  //  if (props.readOnly && amountState) {
  //    value !== amountState && setValue(amountState);
  //  }
  //}, [props.readOnly, transactionOps.trackedAsset]);

  useEffect(() => {
    const assetState = transactionOps.trackedAsset;
    if (assetState && assetState.balance) {
      !eq(assetState.balance.string, transactionBalance) &&
        setTransactionBalance(assetState.balance.string);
    }
    //  if (assetState && assetState.amount) {
    //    !eq(assetState.amount.string, transactionBalance) &&
    //      setTransactionAmount(assetState.amount.string);
    //  }
    console.log("assetState", assetState);
  }, [transactionOps.trackedAsset]);

  const handleFocus = props.readOnly
    ? undefined
    : () => {
        if (value === "0.00") {
          setIsZeroOnFocus(true);
          setValue("");
        }
        // props.onFocus();
      };

  const handleBlur = useCallback(() => {
    if (props.readOnly || loading) return;
    console.log("handleBlur");
    if (value === "" && isZeroOnFocus) {
      setValue("0.00");
      setIsZeroOnFocus(false);
    }
  }, [props.readOnly, loading, value, isZeroOnFocus]);
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      console.log("handleChange, loading", loading);
      if (props.readOnly || loading) return;

      const newValue = event.target.value;

      if (newValue.length < value.length) {
        setValue(newValue);
      } else {
        const result = cleanNumericString(newValue);
        if (isNumeric(result)) setValue(result);
      }
    },
    [props.readOnly, loading, value] // dependencies
  );

  const amountNotEntered: () => boolean = useCallback(() => {
    return value === "0.00";
  }, [value]);

  if (props.variant === "LeftInput") {
    return (
      <Box sx={styles.leftInput.gridContainter}>
        <TextField
          autoComplete="off"
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleChange}
          value={value}
          id="filled-start-adornment"
          sx={styles.leftInput.textField}
          InputProps={{
            disableUnderline: true,
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
      </Box>
    );
  } else {
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
            autoComplete="off"
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
            value={value}
            id="filled-start-adornment"
            sx={
              props.component === "Add Liquidity"
                ? amountNotEntered()
                  ? styles.textFieldTextAboveGrey
                  : styles.textFieldTextAbove
                : amountNotEntered()
                ? styles.textFieldGrey
                : styles.textField
            }
            InputProps={{
              disableUnderline: true,
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
                          props.asset &&
                          process.env.PUBLIC_URL + props.asset.logo
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
                    <Box
                      visibility={
                        props.component === "Add Liquidity" && props.darker
                          ? "visible"
                          : "hidden"
                      }
                    >
                      <Button
                        onClick={swap}
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
                          hidden={transactionBalance ? false : true}
                          sx={styles.balance.typography}
                        >
                          <>
                            Balance:{" "}
                            {transactionBalance
                              ? transactionBalance
                              : "loading..."}{" "}
                            {props.asset && props.asset.name}
                          </>
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
  }
};

export const TokenAmountInput = React.memo(TokenInput);
