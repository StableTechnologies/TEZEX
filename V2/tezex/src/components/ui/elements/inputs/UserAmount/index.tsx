import React, { memo, FC } from "react";

import {
  Asset,
  TransferType,
  TransactingComponent,
} from "../../../../../types/general";

import { TokenAmountInput } from "./token-input";

export interface IAmountField {
  component: TransactingComponent;
  transferType: TransferType;
  asset: Asset;
  onChange?: (value: string) => void;
  label?: string;
  readOnly?: boolean;
  variant?: "LeftInput" | "RightInput";
  darker?: boolean;
  swap?: React.MutableRefObject<() => Promise<void>>;
  scalingKey?: string;
  loading?: boolean;
}

const AmountField: FC<IAmountField> = (props) => {
  const Variant = () => {
    switch (props.variant) {
      default:
        return (
          <TokenAmountInput
            component={props.component}
            transferType={props.transferType}
            asset={props.asset}
            readOnly={props.readOnly}
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
