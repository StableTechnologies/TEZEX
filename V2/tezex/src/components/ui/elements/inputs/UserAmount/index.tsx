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
  forceZero?: boolean;
  visualVariant?: "default" | "tezex";
  selectableAssets?: Asset[];
  onAssetChange?: (asset: Asset) => void;
  assetSelectionDisabled?: boolean;
}

const AmountField: FC<IAmountField> = (props) => {
  return (
    <TokenAmountInput
      component={props.component}
      transferType={props.transferType}
      asset={props.asset}
      onChange={props.onChange}
      readOnly={props.readOnly}
      darker={props.darker}
      variant={props.variant}
      swap={props.swap}
      label={props.label}
      scalingKey={props.scalingKey}
      loading={props.loading}
      forceZero={props.forceZero}
      visualVariant={props.visualVariant}
      selectableAssets={props.selectableAssets}
      onAssetChange={props.onAssetChange}
      assetSelectionDisabled={props.assetSelectionDisabled}
    />
  );
};

export const UserAmountField = memo(AmountField);
