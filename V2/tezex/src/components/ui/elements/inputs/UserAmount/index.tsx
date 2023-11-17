import React, {
  memo,
  FC,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";

import {
  Asset,
  TransferType,
  TransactingComponent,
} from "../../../../../types/general";

import { BigNumber } from "bignumber.js";
import { LeftInput } from "./left-input";
import { TokenAmountInput } from "./token-input";
import { SlippageInput } from "./slippage";
import useStyles from "../../../../../hooks/styles";
import { style } from "./style";

export interface IAmountField {
  component: TransactingComponent;
  transferType: TransferType;
  asset: Asset;
  onChange?: (value: string) => void;
  label?: string;
  readOnly?: boolean;
  variant?: "SlippageInput" | "LeftInput" | "RightInput";
  darker?: boolean;
  swap?: React.MutableRefObject<() => Promise<void>>;
  scalingKey?: string;
  loading?: boolean;
}

const AmountField: FC<IAmountField> = (props) => {
  const [inputString, setInputString] = useState<string>(""); //props.value);
  const [lastString, setLastString] = useState<string>("");
  const [editing, setEditing] = useState<boolean>(false);

  const [focused, setFocused] = React.useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [scrollY, setScrollY] = React.useState(0);
  const onChange = props.onChange;
  const re = /^\d*\.?\d*$/;

  const stylesCSS = useStyles(style, props.scalingKey, true);
  const handelFocus = () => {
    setScrollY(window.scrollY);
    document.body.classList.add(stylesCSS.noScroll);
  };
  const handelBlur = () => {
    document.body.classList.remove(stylesCSS.noScroll);
    window.scrollTo(0, scrollY);
  };
  //  const display = useCallback(() => {
  //    if (isNaN(parseFloat(props.value)) || props.value === "0") {
  //      setInputString("0.00");
  //    } else setInputString(props.value);
  //  }, [props.value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      //if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
      //  inputRef.current.blur();
      //  setFocused(false);
      //}

      if (inputRef.current && inputRef.current.contains(event.target as Node)) {
        //inputRef.current.focus();
        !focused && setFocused(true);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [inputRef, focused]);
  // useEffect(() => {
  //   !editing && display();
  //   props.loading && display();
  // }, [props.loading, props.value]);

  const callBack = useCallback(
    async (value: string) => {
      if (onChange) onChange(value);
    },
    [onChange]
  );
  // const toggle = useCallback(() => {
  //   if (props.swap) props.swap();
  // }, [props.swap]);
  //  useEffect(() => {
  //    const timer = setTimeout(() => {
  //      if (
  //        !new BigNumber(props.value).isEqualTo(inputString) &&
  //        !props.readOnly &&
  //        !props.loading
  //      ) {
  //        callBack(inputString);
  //      } else if (new BigNumber(props.value).isEqualTo(inputString) && editing) {
  //        setEditing(false);
  //      }
  //    }, 1500);
  //    return () => clearTimeout(timer);
  //  }, [inputString, callBack, props, editing]);

  //  useEffect(() => {
  //    if (props.value !== inputString && props.readOnly) {
  //      display();
  //    }
  //  }, [props, inputString]);

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

      !focused && setFocused(true);
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
          <div>SlippageInput</div>
          /* <SlippageInput
            inputRef={inputRef}
            focused={props.readOnly ? false : focused}
            onFocus={handelFocus}
            onBlur={handelBlur}
            balance={props.balance}
            readOnly={props.readOnly}
            updateAmount={updateAmount}
            onKeyDown={onKeyDown}
            inputString={inputString}
            editing={editing}
            scalingKey={props.scalingKey}
          /> */
        );
      default:
        return (
          <TokenAmountInput
            component={props.component}
            transferType={props.transferType}
            asset={props.asset}
            //   inputRef={inputRef}
            //   focused={props.readOnly ? false : focused}
            //   onFocus={handelFocus}
            //   onBlur={handelBlur}
            readOnly={props.readOnly}
            //     updateAmount={updateAmount}
            //     onKeyDown={onKeyDown}
            //      noUserActionCheck={amountNotEntered}
            //     toggle={toggle}
            darker={props.darker}
            variant={props.variant}
            swap={props.swap}
            label={props.label}
            scalingKey={props.scalingKey}
            loading={props.loading}
          />
        );
    }
  };
  if (props.loading) {
    return <div></div>;
  } else return <Variant />;
};

export const UserAmountField = memo(AmountField);
