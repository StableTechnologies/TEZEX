import React, { memo, FC, useCallback, useState, useEffect } from "react";
import { BigNumber } from "bignumber.js";

import { Token } from "../../../../types/general";

import Box from "@mui/material/Box";
import InputAdornment from "@mui/material/InputAdornment";

import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

import style from "./style";
import useStyles from "../../../../hooks/styles";
import { UserAmountField } from "./UserAmount";
export interface ISlippage {
  asset: Token;
  value: BigNumber | number;
  onChange: (value: string) => void;
  inverse?: boolean;
  loading?: boolean;
}

const SlippageInput: FC<ISlippage> = (props) => {
  const styles = useStyles(style);
  const [selectedId, setSelectedId] = useState("0");
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState<string>("0.5");

  useEffect(() => {
    console.log("\n", "selectedId : ", selectedId, "\n");
  }, [selectedId]);

  useEffect(() => {
    console.log(
      "\n",
      "props.value.toString()  : ",
      props.value.toString(),
      "\n"
    );
  }, [props.value]);
  useEffect(() => {
    console.log(
      "\n",
      "props.value.toString()  : ",
      props.value.toString(),
      "\n"
    );
    if (!props.loading) {
      setInput(props.value.toString());

      if (props.value.toString() === "0.5") {
        console.log("0.5 match");
        setSelectedId("0");
      } else if (props.value.toString() === "1") {
        console.log("1 match");
        setSelectedId("1");
      } else {
        console.log(
          "\n",
          "input match props.value.toString() : ",
          props.value.toString(),
          "\n"
        );
        setSelectedId("input");
      }
      setLoading(false);
    }
    console.log("\n", "loading : ", loading, "\n");
  }, [props.value, props.loading]);
  useEffect(() => {
    if ((input === "0.5" || input === "1") && !loading) {
      props.onChange(input);
    }
  }, [input]);

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
            variant="SlippageInput"
            onChange={props.onChange}
            value={props.value.toString()}
            readOnly={selectedId !== p.id}
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
    if (!loading) {
      return (
        <Box sx={styles.slippageTabsRoot}>
          <SlippageTab id="0" label="0.5%" amount={0.5} />
          <SlippageTab id="1" label="1%" amount={1} />
          <SlippageTab id="input" amount={0} />
        </Box>
      );
    } else return <div> </div>;
  };

  return <SlippageTabs />;
};

export const Slippage = memo(SlippageInput);
