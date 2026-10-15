import React, { memo, FC, useState, useEffect, useRef } from "react";

import { TransactingComponent, TransferType } from "../../../../types/general";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import style, { darkStyle } from "./style";
import useStyles from "../../../../hooks/styles";
import { useTransaction } from "../../../../hooks/transaction";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import { cleanNumericString, isNumeric } from "../../../../functions/util";
import {
  getSlippageValidationMessage,
  HIGH_SLIPPAGE_PERCENT,
  isTransactionEditable,
} from "../../../../functions/transactionSafety";
export interface ISlippage {
  component: TransactingComponent;
  transferType: TransferType;
  scalingKey?: string;
  visualVariant?: "default" | "dark";
}

const SlippageInput: FC<ISlippage> = (props) => {
  const styles = useStyles(
    props.visualVariant === "dark" ? darkStyle : style,
    props.scalingKey
  );
  const transactionOps = useTransaction(props.component);
  const transaction = transactionOps.getActiveTransaction();
  const [selectedId, setSelectedId] = useState("0");
  const [input, setInput] = useState("0.5");
  const inputRef = useRef<HTMLInputElement>(null);
  const canUpdate = () => isTransactionEditable(transaction);

  // Load external changes once per transaction. Rendering and navigation never
  // write an old local slippage value back into a different transaction.
  useEffect(() => {
    if (!transaction) return;
    const value = transaction.slippageInput ?? String(transaction.slippage);
    setInput(value);
    setSelectedId(
      transaction.slippageInput !== undefined
        ? "input"
        : transaction.slippage === 0.5
        ? "0"
        : transaction.slippage === 1
        ? "1"
        : "input"
    );
  }, [transaction?.id]);

  const changeSlippage = (value: string) => {
    if (!canUpdate()) return;
    setInput(value);
    void transactionOps.updateAmount(undefined, value, "slippageInput");
  };
  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    if (!canUpdate() || selectedId !== "input") return;
    const value = cleanNumericString(event.target.value);
    if (value === "" || value === "." || isNumeric(value))
      changeSlippage(value);
  };
  const handleSlippageTabClick = (id: string) => {
    if (!canUpdate()) return;
    setSelectedId(id);
    if (id === "0") changeSlippage("0.5");
    else if (id === "1") changeSlippage("1.0");
    else setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectedIndex = selectedId === "0" ? 0 : selectedId === "1" ? 1 : 2;
  const validationMessage =
    selectedId === "input" ? getSlippageValidationMessage(input) : undefined;
  const highSlippage =
    !validationMessage && Number(input) > HIGH_SLIPPAGE_PERCENT
      ? "Higher slippage allows more price movement before execution."
      : undefined;

  return (
    <Box
      sx={{
        ...styles.slippageTabsRoot,
        ...(validationMessage
          ? { borderColor: "var(--tezex-text-secondary)" }
          : {}),
      }}
      role="group"
      aria-label="Slippage tolerance"
    >
      <Box
        aria-hidden="true"
        sx={{
          ...styles.slippageThumb,
          transform: `translateX(${selectedIndex * 100}%)`,
        }}
      />

      <Box sx={styles.slippageSegment}>
        <Button
          disableRipple
          aria-pressed={selectedId === "0"}
          onClick={() => handleSlippageTabClick("0")}
          sx={{
            ...styles.slippageTab,
            ...(selectedId === "0" ? styles.slippageTabSelected : {}),
          }}
        >
          0.5%
        </Button>
      </Box>

      <Box sx={styles.slippageSegment}>
        <Button
          disableRipple
          aria-pressed={selectedId === "1"}
          onClick={() => handleSlippageTabClick("1")}
          sx={{
            ...styles.slippageTab,
            ...(selectedId === "1" ? styles.slippageTabSelected : {}),
          }}
        >
          1.0%
        </Button>
      </Box>

      <Box sx={styles.slippageSegment}>
        {selectedId === "input" ? (
          <Tooltip
            arrow
            placement="top"
            title={validationMessage ?? highSlippage ?? ""}
            open={validationMessage ? true : undefined}
          >
            <TextField
              inputRef={inputRef}
              autoComplete="off"
              autoFocus
              onChange={handleChange}
              value={input}
              sx={styles.slippageInput}
              InputProps={{
                disableUnderline: true,
                endAdornment: (
                  <InputAdornment
                    sx={styles.slippageEndAdornment}
                    position="end"
                  >
                    %
                  </InputAdornment>
                ),
                sx: styles.slippageInputProps,
              }}
              inputProps={{
                inputMode: "decimal",
                min: 0.1,
                max: 5,
                "aria-label": "Custom slippage percentage",
                "aria-invalid": Boolean(validationMessage),
              }}
              size="small"
              variant="standard"
            />
          </Tooltip>
        ) : (
          <Button
            disableRipple
            aria-pressed={false}
            onClick={() => handleSlippageTabClick("input")}
            sx={styles.slippageTab}
          >
            Custom
          </Button>
        )}
      </Box>
    </Box>
  );
};

export const Slippage = memo(SlippageInput);
