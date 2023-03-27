import React, { memo, FC, useCallback, useState, useEffect } from "react";
import { BigNumber } from "bignumber.js";

import { Token } from "../../../../types/general";

import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

import style from "./style";

export interface ISlippage {
  asset: Token;
  value: BigNumber | number;
  onChange: (value: string) => void;
  inverse?: boolean;
}

const SlippageInput: FC<ISlippage> = (props) => {
  const [selectedId, setSelectedId] = useState("0");

  const [input, setInput] = useState<string>("0.5");

  useEffect(() => {
    props.onChange(input);
  }, [input, props]);

  interface ISlippageInput {
    disabled?: boolean;
  }
  const SlippageInput = (prop: ISlippageInput) => {
    return (
      <TextField
        autoFocus
        disabled={prop.disabled}
        onChange={useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
          e.preventDefault();
          setInput(e.target.value);
        }, [])}
        value={input}
        sx={style.slippageInput}
        InputProps={{
          disableUnderline: true,
          endAdornment: <InputAdornment position="start">%</InputAdornment>,
        }}
        inputProps={{}}
        size="small"
        variant="standard"
      />
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
            sx={style.slippageTab}
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
        return <SlippageInput disabled={selectedId !== p.id} />;
      }
    };

    return (
      <Box
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
      <Box sx={style.slippageTabsRoot}>
        <SlippageTab id="0" label="0.5%" amount={0.5} />
        <SlippageTab id="1" label="1%" amount={1} />
        <SlippageTab id="input" amount={0} />
      </Box>
    );
  };

  return <SlippageTabs />;
};

export const Slippage = memo(SlippageInput);
