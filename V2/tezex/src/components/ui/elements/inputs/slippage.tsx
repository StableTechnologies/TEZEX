import React, {
  memo,
  FC,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import {
  Id,
  TransactingComponent,
  TransferType,
} from "../../../../types/general";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import style, { darkStyle } from "./style";
import useStyles from "../../../../hooks/styles";
import { useTransaction } from "../../../../hooks/transaction";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Tooltip from "@mui/material/Tooltip";
import { useDebounce } from "usehooks-ts";
import {
  cleanNumericString,
  isNumeric,
  toNumber,
} from "../../../../functions/util";
import lodash, { isNumber } from "lodash";
import {
  getSlippageValidationMessage,
  HIGH_SLIPPAGE_PERCENT,
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
  const [selectedId, setSelectedId] = useState("1");
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState<string>("0.5");
  const debouncedValue = useDebounce<string>(input, 500);
  const transactionOps = useTransaction(props.component);
  const [id, setId] = useState<Id | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
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
    return !transactionOps.loading;
  }, [transactionOps.loading]);

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

  //callback to set selected id if different
  const _setSelectedId = useCallback((id: string) => {
    //check if updates can be made and set selected id
    setSelectedId((value) => {
      //only update if selected id is different
      if (value === id) return value;
      else return id;
    });
  }, []);
  // callback to set input value if different
  const setInputValue = useCallback((slippage: string) => {
    //check if updates can be made and set input value
    setInput((value) => {
      //only update if  input is different
      if (value === slippage) return value;
      else return slippage;
    });
  }, []);

  //call back to set selected tab based on loaded value
  const setSelectedIdFromValue = useCallback((slippage: string) => {
    // get curent slippage of transaction in context
    //update selected tab if different
    if (lodash.toNumber(slippage) === 0.5) _setSelectedId("0");
    else if (lodash.toNumber(slippage) === 1) _setSelectedId("1");
    else _setSelectedId("input");
  }, []);

  // call back to load value and set loading to false
  const loadValue = useCallback(() => {
    // get curent slippage of transaction in context
    const slippage = transactionOps.getActiveTransaction()?.slippage.toFixed(1);
    if (slippage) {
      //update input if different
      setInputValue(slippage);
      //update selected tab if different
      setSelectedIdFromValue(slippage);
      //handle loading
      setLoadingFalse();
    }
  }, [transactionOps.getActiveTransaction, setLoadingFalse]);

  // on id change , load value and handle loading
  useEffect(() => {
    const transactionId = transactionOps.getActiveTransaction()?.id;
    // Load value if loading is true and  transactionid is present
    if (loading && transactionId) loadValue();
  }, [transactionOps.getActiveTransaction, loading, loadValue]);
  // track hook state for loading and transacting  and set loading to true
  useEffect(() => {
    if (!canUpdate()) {
      setLoading(true);
    }
  }, [canUpdate]);

  // Callback to check if  old slippage differs from current transaction slippage
  // if it does it calls an update
  const updateAmount = useCallback(
    async (slippage: string): Promise<void> => {
      // check if updates can be made and update slippage
      canUpdate() && (await transactionOps.updateAmount(undefined, slippage));
    },
    [canUpdate, transactionOps.updateAmount]
  );

  // Effect to update slippage in context on debounced value change
  useEffect(() => {
    // get curent slippage of transaction in context
    const slippage = transactionOps.getActiveTransaction()?.slippage;
    const validationMessage = getSlippageValidationMessage(debouncedValue);

    // if slippage is different from slippage in context update slippage
    if (
      isNumber(slippage) &&
      ((selectedId === "input" && Boolean(validationMessage)) ||
        (isNumeric(debouncedValue) && slippage !== toNumber(debouncedValue)))
    ) {
      const timeoutId = setTimeout(() => {
        updateAmount(debouncedValue);
      }, 500); // 500 ms delay before calling the update function again

      // Cleanup function to clear the timeout if the component unmounts or dependencies change
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [
    transactionOps.getActiveTransaction,
    debouncedValue,
    selectedId,
    updateAmount,
  ]);

  //calback to check if input is selected
  const isInputSelected = useCallback(() => {
    return selectedId === "input";
  }, [selectedId]);

  //calback to handle slippage text input change
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // check if updates can be made and input is selected
      if (!canUpdate() || !isInputSelected) return;

      // get value in input
      const newValue = event.target.value;

      //  deal with backspace
      if (newValue.length < input.length) {
        setInput(newValue);
      } else {
        // clean non numeric characters off the input string
        const result = cleanNumericString(newValue);
        // if cleaned string is numeric update input
        if (isNumeric(result)) setInputValue(result);
      }
    },
    [canUpdate, isInputSelected, input] // dependencies
  );

  // callback to handle slippage tab clicks
  const handleSlippageTabClick = (id: string) => {
    setSelectedId(id);
    switch (id) {
      case "0":
        setInput("0.5");
        break;
      case "1":
        setInput("1.0");
        break;
      default:
        if (id === "input" && inputRef.current) {
          setTimeout(() => inputRef.current?.focus(), 0); // Focus after state update
        }
        break;
    }
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
