import React, { FC, useCallback, useEffect, useRef, useState } from "react";
import { useDebounce } from "@uidotdev/usehooks";
import {
  Asset,
  AssetState,
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
import { eq } from "lodash";
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
  // swap?: () => void;
  label?: string;
  darker?: boolean;
  readOnly?: boolean;
  scalingKey?: string;
}

const Right: FC<IRigthInput> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const transactionOps = useTransaction(props.component);
  const [value, setValue] = useState("0.00");
  const [balance, setBalance] = useState("");
  const [isZeroOnFocus, setIsZeroOnFocus] = useState(false);

  // set asset state
  const [assetState, setAssetState] = useState<AssetState | undefined>(
    transactionOps.getAsetState(props.transferType, props.asset)
  );
  const [transactionBalance, setTransactionBalance] = useState<
    string | unknown
  >(undefined);
  const [loading, setLoading] = useState(true);
  const swap = useCallback(async () => {
    console.log("swap-right-input");
    await transactionOps.swapFields();
  }, [transactionOps]);

  const debouncedUpdateAmount = useRef(
    debounce(
      async (value: string, oldValue: string) => {
        if (value !== oldValue) {
          const canUpdate =
            !transactionOps.loading && !transactionOps.transacting;
          canUpdate && (await transactionOps.updateAmount(value));
        }
      },
      300,
      { leading: false, trailing: true }
    )
  ); // 300ms debounce time

  useEffect(() => {
    if (!props.readOnly && value !== "0.00") {
      const oldValue = transactionOps.trackedAsset?.amount?.string;
      oldValue && debouncedUpdateAmount.current(value, oldValue);
    }
  }, [
    props.readOnly,
    value,
    transactionOps.loading,
    transactionOps.transacting,
    transactionOps.trackedAsset,
  ]);
  const [transactionAmount, setTransactionAmount] = useState<string | unknown>(
    undefined
  );
  useEffect(() => {
    const amountState = transactionOps.trackedAsset?.amount?.string;
    if (props.readOnly && amountState) {
      value !== amountState && setValue(amountState);
    }
  }, [props.readOnly, transactionOps.trackedAsset]);

  useEffect(() => {
    if (assetState && assetState.balance) {
      !eq(assetState.balance.string, transactionBalance) &&
        setTransactionBalance(assetState.balance.string);
    }
    if (assetState && assetState.amount) {
      !eq(assetState.amount.string, transactionBalance) &&
        setTransactionAmount(assetState.amount.string);
    }
    console.log("assetState", assetState);
  }, [assetState]);

  const handleFocus = props.readOnly
    ? undefined
    : () => {
        if (value === "0.00") {
          setIsZeroOnFocus(true);
          setValue("");
        }
        // props.onFocus();
      };

  const handleBlur = props.readOnly
    ? undefined
    : () => {
        if (value === "" && isZeroOnFocus) {
          setValue("0.00");
          setIsZeroOnFocus(false);
        }
        //props.onBlur();
      };
  const handleChange =
    props.readOnly || transactionOps.loading
      ? undefined
      : (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
          const newValue = event.target.value;

          // Allow deleting characters one by one
          if (newValue.length < value.length) {
            setValue(newValue);
          } else {
            const result = cleanNumericString(newValue);
            if (isNumeric(result)) setValue(result);
          }
        };

  const amountNotEntered: () => boolean = useCallback(() => {
    return value === "0.00";
  }, [value]);

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
                  <Box
                    visibility={
                      props.component === "Add Liquidity" ? "visible" : "hidden"
                    }
                  >
                    <Button onClick={swap} sx={styles.inputAdornmentEnd.button}>
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
};

export const RightInput = React.memo(Right);
