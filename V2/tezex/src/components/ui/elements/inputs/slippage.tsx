import React, { memo, FC, useState, useEffect } from "react";
import { BigNumber } from "bignumber.js";

import {
  Asset,
  Token,
  TransactingComponent,
  TransferType,
} from "../../../../types/general";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import style from "./style";
import useStyles from "../../../../hooks/styles";
import { UserAmountField } from "./UserAmount";
export interface ISlippage {
  asset: Asset;
  component: TransactingComponent;
  transferType: TransferType;
  value: BigNumber | number;
  onChange: (value: string) => void;
  inverse?: boolean;
  loading?: boolean;

  scalingKey?: string;
}

const SlippageInput: FC<ISlippage> = (props) => {
  const styles = useStyles(style, props.scalingKey);
  const [selectedId, setSelectedId] = useState("0");
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState<string>("0.5");

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
            component={props.component}
            transferType={props.transferType}
            asset={props.asset}
            variant="SlippageInput"
            onChange={props.onChange}
            value={props.value.toString()}
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
