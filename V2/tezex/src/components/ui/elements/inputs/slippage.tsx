import React, { memo, FC, useState, useEffect, useCallback } from "react";
import { BigNumber } from "bignumber.js";

import {
  Asset,
  Id,
  Token,
  TransactingComponent,
  TransferType,
} from "../../../../types/general";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import style from "./style";
import useStyles from "../../../../hooks/styles";
import { UserAmountField } from "./UserAmount";
import { useTransaction } from "../../../../hooks/transaction";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import { useDebounce } from "usehooks-ts";
import { cleanNumericString, isNumeric } from "../../../../functions/util";
export interface ISlippage {
  asset: Asset;
  component: TransactingComponent;
  transferType: TransferType;
  value: BigNumber | number;
  inverse?: boolean;
  loading?: boolean;

  scalingKey?: string;
}

const SlippageInput: FC<ISlippage> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const [selectedId, setSelectedId] = useState("0");
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState<string>("0.5");
  const debouncedValue = useDebounce<string>(input, 500);
  const [isZeroOnFocus, setIsZeroOnFocus] = useState(false);
  const transactionOps = useTransaction(props.component);
  const [id, setId] = useState<Id | undefined>(undefined);

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

  //
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

  // callback to set input value
  const setInputValue = useCallback((slippage: string) => {
    //check if updates can be made and set input value
    setInput((value) => {
      //only update if  input is different
      if (value === slippage) return value;
      else return slippage;
    });
  }, []);

  // call back to load value and set loading to false
  const loadValue = useCallback(() => {
    // get curent slippage of transaction in context
    const slippage = transactionOps.getActiveTransaction()?.slippage.toFixed(2);
    if (slippage) {
      //update input if different
      setInputValue(slippage);
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
      console.log("set loading to true");
      setLoading(true);
    }
  }, [canUpdate]);

  // Callback to check if  old slippage differs from current transaction slippage
  // if it does it calls an update
  const updateAmount = useCallback(
    async (slippage: string, oldSlippage: string) => {
      if (slippage !== oldSlippage) {
        canUpdate() && (await transactionOps.updateAmount(undefined, slippage));
      }
    },
    [canUpdate, transactionOps.updateAmount]
  );
  const onChange = useCallback(
    async (value: string) => {
      const transaction = transactionOps.getActiveTransaction();
      transaction &&
        transaction.slippage.toString() !== value &&
        (await transactionOps.updateAmount(undefined, value));
    },
    [transactionOps]
  );

  useEffect(() => {
    if (!props.loading) {
      setInput(props.value.toString());

      if (props.value.toString() === "0.5") {
        setSelectedId("0");
      } else if (props.value.toString() === "1") {
        setSelectedId("1");
      } else {
        setSelectedId("input");
      }
      setLoading(false);
    }
  }, [props.value, props.loading]);

  useEffect(() => {
    if (!loading) {
      onChange(input);
    }
  }, [input]);

  //calback to check if input is selected
  const isInputSelected = useCallback(() => {
    return selectedId === "input";
  }, [selectedId]);

  const SlippageInput: FC = () => {
    const styles = useStyles(style, props.scalingKey);
    const handleFocus = undefined;
    const handleBlur = undefined;

    //calback to handle slippage input change
    const handleChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        console.log("handleChange, loading", loading);
        if (!isInputSelected() || loading) return;

        const newValue = event.target.value;

        if (newValue.length < input.length) {
          setInput(newValue);
        } else {
          const result = cleanNumericString(newValue);
          if (isNumeric(result)) setInputValue(result);
        }
      },
      [isInputSelected, loading, input] // dependencies
    );

    return (
      <Box sx={styles.slippageInput.box}>
        <TextField
          autoComplete="off"
          autoFocus
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={!isInputSelected()}
          onChange={handleChange}
          value={input}
          sx={styles.slippageInput}
          InputProps={{
            disableUnderline: true,
            endAdornment: (
              <InputAdornment
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  right: ".7vw",
                  padding: "0px 0px 0px 0px",
                }}
                position="start"
              >
                %
              </InputAdornment>
            ),
            sx: {
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            },
          }}
          inputProps={{
            inputMode: "decimal",
          }}
          size="small"
          variant="standard"
        />
      </Box>
    );
  };
  interface SlippageTabProps {
    id: string;
    label?: React.ReactNode;

    amount: number;
  }

  function SlippageTab(p: SlippageTabProps) {
    const ButtonOrInput = () => {
      if (!(p.id === "input")) {
        return (
          <Button
            disabled={selectedId !== p.id}
            href=""
            sx={styles.slippageTab}
            onClick={(
              event: React.MouseEvent<HTMLAnchorElement, MouseEvent>
            ) => {
              event.preventDefault();
              setSelectedId(p.id);
              setInput(p.amount.toString());
            }}
            {...p}
          >
            {p.amount.toString()}%
          </Button>
        );
      } else {
        return (
          <UserAmountField
            component={props.component}
            transferType={props.transferType}
            asset={props.asset}
            variant="SlippageInput"
            onChange={onChange}
            readOnly={selectedId !== p.id}
            scalingKey={props.scalingKey}
          />
        );
      }
    };

    return (
      <Box
        sx={styles.slippageTab.box}
        onClick={(event) => {
          event.preventDefault();
          setSelectedId(p.id);
          setInput(p.amount.toString());
        }}
      >
        <ButtonOrInput />
      </Box>
    );
  }
  const SlippageTabs = () => {
    return (
      <Box sx={styles.slippageTabsRoot}>
        <SlippageTab id="0" label="0.5%" amount={0.5} />
        <SlippageTab id="1" label="1%" amount={1} />
        <SlippageTab id="input" amount={0} />
      </Box>
    );
  };

  return <SlippageTabs />;
};

export const Slippage = memo(SlippageInput);
