import React, { FC, useCallback, useEffect, useState } from "react";
import {
  Asset,
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
import { useDebounce } from "usehooks-ts";
import { eq, toNumber } from "lodash";

export interface IRigthInput {
  component: TransactingComponent;
  transferType: TransferType;
  asset: Asset;
  variant?: "LeftInput" | "RightInput";
  swap?: React.MutableRefObject<() => Promise<void>>;
  label?: string;
  darker?: boolean;
  readOnly?: boolean;
  scalingKey?: string;
  loading?: boolean;
}

const TokenInput: FC<IRigthInput> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const transactionOps = useTransaction(props.component, {
    transferType: props.transferType,
    asset: props.asset,
  });
  // TODO: set value at time of loading  from transactionOps
  const [value, setValue] = useState("0.00");
  const debouncedValue = useDebounce<string>(value, 500);

  // set asset state
  const [transactionBalance, setTransactionBalance] = useState<
    string | unknown
  >(undefined);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [id, setId] = useState<Id | undefined>(undefined);
  const swap = useCallback(async () => {
    setSwapping(true);
  }, []);

  // monitor swapping and swapfields
  useEffect(() => {
    const timer = setTimeout(() => {
      if (swapping) {
        console.log("swapping");
        transactionOps.swapFields();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [transactionOps.swapFields, swapping]);

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
    return !(swapping || props.loading || transactionOps.loading);
  }, [swapping, props.loading, transactionOps.loading]);

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
      setLoadingFalse();
    }
  }, [
    transactionOps.getActiveTransaction,
    setSwapping,
    props.readOnly,
    setLoadingFalse,
    transactionOps.trackedAsset,
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
    // non-read only: update local value only on id change
    if (!props.readOnly && (loading || swapping)) {
      loadValue();
    }
    //  read only , update on transaction change
    if (props.readOnly) {
      loadValue();
    }
  }, [
    id,
    swapping,
    props.readOnly,
    transactionOps.getActiveTransaction,
    loading,
    loadValue,
  ]);

  // Callback to check if local value differs from transaction amount
  // if it does it calls an update
  const updateAmount = useCallback(
    async (value: string, oldValue: string) => {
      if (toNumber(value) !== toNumber(oldValue)) {
        if (canUpdate() && !loading && !swapping)
          await transactionOps.updateAmount(value, undefined, "tokenInput");
      }
    },
    [canUpdate, swapping, loading, transactionOps.updateAmount]
  );

  // This effect tracks and  sends the debounced value for updating
  // the transaction amount,
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!props.readOnly && !loading && !swapping) {
        const oldValue = transactionOps.trackedAsset?.amount?.string;
        console.log("!!!oldValue", oldValue);
        if (oldValue) updateAmount(debouncedValue, oldValue);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [
    props.readOnly,
    loading,
    swapping,
    debouncedValue,
    transactionOps.trackedAsset,
    updateAmount,
  ]);

  useEffect(() => {
    const assetState = transactionOps.trackedAsset;
    if (assetState && assetState.balance) {
      !eq(assetState.balance.string, transactionBalance) &&
        setTransactionBalance(assetState.balance.string);
    }
  }, [transactionOps.trackedAsset]);

  // calback for when the input is focused on
  const handleFocus = useCallback(() => {
    if (value === "0.00") {
      setValue("");
    }
  }, [value]);

  // callback for when the user clicks away from the input
  const handleBlur = useCallback(() => {
    if (props.readOnly || loading) return;
    if (value === "" || toNumber(value) === 0) {
      setValue("0.00");
    }
  }, [props.readOnly, loading, value]);

  // callback for when the user changes the input value
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (props.readOnly || loading) return;

      const newValue = event.target.value;

      if (newValue.length < value.length) {
        setValue(newValue);
      } else {
        const result = cleanNumericString(newValue);
        if (isNumeric(result)) setValue(result);
      }
    },
    [props.readOnly, loading, value]
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

export const TokenAmountInput = TokenInput;
