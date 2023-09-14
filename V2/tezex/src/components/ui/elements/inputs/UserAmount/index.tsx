import React, { memo, FC, useCallback, useState, useEffect } from "react";

import { Asset } from "../../../../../types/general";

import { BigNumber } from "bignumber.js";
import { LeftInput } from "./left-input";
import { RightInput } from "./right-input";
import { SlippageInput } from "./slippage";

export interface IAmountField {
  asset?: Asset;
  onChange?: (value: string) => void;
  balance?: string;
  value: string;
  label?: string;
  readOnly?: boolean;
  loading?: boolean;
  variant?: "SlippageInput" | "LeftInput" | "RightInput";
  darker?: boolean;
  swap?: () => void;
  scale?: number;
}

const AmountField: FC<IAmountField> = (props) => {
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
      case "SlippageInput":
        return (
          <SlippageInput
            balance={props.balance}
            readOnly={props.readOnly}
            updateAmount={updateAmount}
            onKeyDown={onKeyDown}
            inputString={inputString}
            editing={editing}
            scale={props.scale}
          />
        );
      case "LeftInput":
        return (
          <LeftInput
            asset={props.asset}
            balance={props.balance}
            readOnly={props.readOnly}
            updateAmount={updateAmount}
            onKeyDown={onKeyDown}
            inputString={inputString}
            editing={editing}
            scale={props.scale}
          />
        );
      default:
        return (
          <RightInput
            asset={props.asset}
            balance={props.balance}
            readOnly={props.readOnly}
            updateAmount={updateAmount}
            onKeyDown={onKeyDown}
            inputString={inputString}
            noUserActionCheck={amountNotEntered}
            toggle={toggle}
            swap={props.swap}
            editing={editing}
            label={props.label}
            scale={props.scale}
          />
        );
    }
  };
  return <Variant />;
};

export const UserAmountField = memo(AmountField);
