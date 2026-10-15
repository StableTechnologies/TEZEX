import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import {
  Asset,
  Id,
  TransactingComponent,
  TransactionStatus,
  TransferType,
} from "../../../../../../types/general";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";

import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";

import liquiditySwapIcon from "../../../../../../assets/liquiditySwapIcon.svg";

import { WalletConnected } from "../../../../../session/WalletConnected";

import { style } from "./style";
import useStyles from "../../../../../../hooks/styles";
import { useTransaction } from "../../../../../../hooks/transaction";
import BigNumber from "bignumber.js";
import { eq, toNumber } from "lodash";
import { TokenIcon } from "../../../TokenIcon";
import { TokenSelector } from "../../../TokenSelector";

export interface IRigthInput {
  component: TransactingComponent;
  transferType: TransferType;
  asset: Asset;
  onChange?: (value: string) => void;
  variant?: "LeftInput" | "RightInput";
  swap?: React.MutableRefObject<() => Promise<void>>;
  label?: string;
  darker?: boolean;
  readOnly?: boolean;
  scalingKey?: string;
  loading?: boolean;
  forceZero?: boolean;
  visualVariant?: "default" | "tezex";
  selectableAssets?: Asset[];
  onAssetChange?: (asset: Asset) => void;
  assetSelectionDisabled?: boolean;
  validationMessage?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}

const TokenInput: FC<IRigthInput> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const transactionOps = useTransaction(props.component, {
    transferType: props.transferType,
    asset: props.asset,
  });
  // TODO: set value at time of loading  from transactionOps
  const [value, setValue] = useState("0.00");

  // set asset state
  const [transactionBalance, setTransactionBalance] = useState<
    string | unknown
  >(undefined);
  const [swapping, setSwapping] = useState(false);
  const transaction = transactionOps.getActiveTransaction();
  const transactionId = transaction?.id;
  const calculatedField =
    props.transferType === TransferType.RECEIVE ||
    (props.component === TransactingComponent.ADD_LIQUIDITY &&
      transaction?.sendAsset?.[1]?.name === props.asset.name);
  const quotePending =
    !props.forceZero &&
    calculatedField &&
    transaction?.transactionStatus === TransactionStatus.MODIFIED;
  const displayValue = props.forceZero
    ? "0.00"
    : quotePending
    ? ""
    : calculatedField &&
      transaction?.transactionStatus === TransactionStatus.FAILED
    ? "—"
    : value;
  const lastTransactionId = useRef<Id | undefined>(undefined);
  const hasUserEdit = useRef(false);
  const pendingEdit = useRef<{ value: string; id?: Id; asset: string }>();

  const swap = useCallback(async () => {
    if (swapping) return;
    setSwapping(true);
    try {
      await transactionOps.swapFields();
    } finally {
      setSwapping(false);
    }
  }, [swapping, transactionOps.swapFields]);

  // boolean check to see  if updates can be made
  const canUpdate = useCallback(() => {
    return !(swapping || transactionOps.loading);
  }, [swapping, transactionOps.loading]);

  // Synchronize values produced by the transaction model. Editable fields
  // only need this when the transaction itself changes; calculated fields
  // follow every quote update.
  const loadValue = useCallback(() => {
    const amount = transactionOps.trackedAsset?.amount?.string;
    if (amount) {
      const truncated = amount;

      if (!props.readOnly) props.onChange?.(truncated);

      //update value if different
      setValue((value) => {
        if (new BigNumber(value || 0).eq(truncated)) return value;
        else if (props.readOnly && toNumber(truncated) === 0) return "0.00";
        else return truncated;
      });
    }
  }, [props.readOnly, transactionOps.trackedAsset, props.onChange]);

  //callback to update balance
  const updateBalance = useCallback(() => {
    const balance = transactionOps.trackedAsset?.balance?.string;
    if (balance) {
      //update balance if different
      setTransactionBalance((_balance: string | undefined) => {
        const truncated = balance.includes(".")
          ? balance.slice(0, balance.indexOf(".") + props.asset.decimals + 1)
          : balance;

        if (_balance === truncated) return _balance;
        else return truncated;
      });
    }
  }, [transactionOps.trackedAsset?.balance?.string]);

  // on transaction balance change , update balance
  useEffect(() => {
    updateBalance();
  }, [updateBalance]);

  useEffect(() => {
    if (transactionId && transactionId !== lastTransactionId.current) {
      const preserveEarlyEdit =
        !lastTransactionId.current && hasUserEdit.current;
      lastTransactionId.current = transactionId;
      if (!preserveEarlyEdit) {
        hasUserEdit.current = false;
        loadValue();
      }
    }
    if (props.readOnly) {
      loadValue();
    }
  }, [transactionId, props.readOnly, loadValue]);

  // Drafts belong to the transaction, not a timer owned by this screen.
  // Persist edits immediately; the provider debounces only the RPC request.
  const commitEdit = useCallback(
    (nextValue: string) => {
      pendingEdit.current = {
        value: nextValue,
        id: transactionId,
        asset: props.asset.name,
      };
      if (!canUpdate()) return;
      pendingEdit.current = undefined;
      void transactionOps.updateAmount(nextValue, undefined, "tokenInput");
    },
    [canUpdate, transactionId, props.asset.name, transactionOps.updateAmount]
  );
  useEffect(() => {
    const pending = pendingEdit.current;
    if (!pending || !canUpdate()) return;
    pendingEdit.current = undefined;
    if (
      pending.asset !== props.asset.name ||
      (pending.id && pending.id !== transactionId)
    )
      return;
    void transactionOps.updateAmount(pending.value, undefined, "tokenInput");
  }, [canUpdate, transactionId, props.asset.name, transactionOps.updateAmount]);

  useEffect(() => {
    const assetState = transactionOps.trackedAsset;
    if (assetState && assetState.balance) {
      const balance = assetState.balance.string;
      const truncated = balance.includes(".")
        ? balance.slice(0, balance.indexOf(".") + props.asset.decimals + 1)
        : balance;
      !eq(truncated, transactionBalance) && setTransactionBalance(truncated);
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
    if (props.readOnly) return;
    if (value === "" || toNumber(value) === 0) {
      setValue("0.00");
      props.onChange?.("0.00");
    }
  }, [props.readOnly, props.onChange, value]);

  // callback for when the user changes the input value
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (props.readOnly) return;

      const nextValue = event.target.value;
      // Never reinterpret a negative, exponent, or malformed paste as a
      // different positive amount. Keep partial decimal edits intact.
      if (!/^\d*(?:\.\d*)?$/.test(nextValue)) return;
      if ((nextValue.split(".")[1]?.length ?? 0) > props.asset.decimals) return;
      hasUserEdit.current = true;
      setValue(nextValue);
      props.onChange?.(nextValue);
      commitEdit(nextValue === "." ? "0" : nextValue);
    },
    [props.readOnly, props.onChange, props.asset.decimals, commitEdit]
  );

  const amountNotEntered: () => boolean = useCallback(() => {
    return value === "0.00";
  }, [value]);

  if (props.visualVariant === "tezex") {
    const inputId =
      `${props.component}-${props.transferType}-${props.asset.name}`
        .toLowerCase()
        .replace(/\s+/g, "-");

    return (
      <Box sx={styles.tezex.root}>
        <Box sx={styles.tezex.header}>
          <Box component="label" htmlFor={inputId} sx={styles.tezex.label}>
            {props.label}
          </Box>
          {props.validationMessage ? (
            <Typography
              id={`${inputId}-validation`}
              role="alert"
              sx={styles.tezex.validationMessage}
            >
              {props.validationMessage}
            </Typography>
          ) : (
            <WalletConnected>
              <Typography
                hidden={!transactionBalance}
                sx={styles.tezex.balance}
              >
                Balance {transactionBalance ? String(transactionBalance) : "—"}
              </Typography>
            </WalletConnected>
          )}
        </Box>

        <Box sx={styles.tezex.amountRow}>
          <Box sx={styles.tezex.amountControl}>
            <TextField
              id={inputId}
              inputRef={props.inputRef}
              autoComplete="off"
              onFocus={handleFocus}
              onBlur={handleBlur}
              onChange={handleChange}
              value={displayValue}
              sx={styles.tezex.textField}
              inputProps={{
                inputMode: "decimal",
                readOnly: props.readOnly,
                "aria-label": `${props.label || props.transferType} amount`,
                "aria-invalid": Boolean(props.validationMessage),
                "aria-busy": quotePending,
                "aria-describedby": props.validationMessage
                  ? `${inputId}-validation`
                  : undefined,
              }}
              variant="standard"
              InputProps={{ disableUnderline: true }}
            />
            {quotePending && (
              <Skeleton
                variant="rounded"
                animation="wave"
                aria-hidden="true"
                data-testid="quote-amount-shimmer"
                sx={styles.tezex.amountShimmer}
              />
            )}
          </Box>

          {props.onAssetChange && props.selectableAssets?.length ? (
            <TokenSelector
              asset={props.asset}
              options={props.selectableAssets}
              onChange={props.onAssetChange}
              disabled={props.assetSelectionDisabled}
              ariaLabel={`Select ${props.label?.toLowerCase() || "token"}`}
            />
          ) : (
            <Box sx={styles.tezex.tokenPill} aria-label={props.asset.label}>
              <TokenIcon asset={props.asset} size={26} decorative />
              <Typography sx={styles.tezex.tokenLabel}>
                {props.asset.label}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

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
