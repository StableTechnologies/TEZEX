import { BigNumber } from "bignumber.js";

import {
  Errors,
  SuccessRecord,
  Transaction,
  Token,
  TransactingComponent,
} from "../types/general";

import { TezosToolkit } from "@taquito/taquito";

import {
  xtzToToken,
  tokenToXtz,
  buyLiquidityShares,
  removeLiquidity,
} from "../functions/liquidityBaking";

export async function processTransaction(
  transaction: Transaction,
  userAddress: string,
  dex: string,
  toolkit: TezosToolkit
): Promise<SuccessRecord> {
  switch (transaction.component) {
    case TransactingComponent.SWAP:
      return await swapTransaction(transaction, userAddress, dex, toolkit);
    case TransactingComponent.ADD_LIQUIDITY:
      return await addLiquidityTransaction(
        transaction,
        userAddress,
        dex,
        toolkit
      );
    case TransactingComponent.REMOVE_LIQUIDITY:
      return await removeLiquidityTransaction(
        transaction,
        userAddress,
        dex,
        toolkit
      );
  }
}
const swapTransaction = async (
  transaction: Transaction,
  userAddress: string,
  dex: string,
  toolkit: TezosToolkit
): Promise<SuccessRecord> => {
  switch (transaction.sendAsset[0].name) {
    case Token.XTZ:
      return await xtzToToken(
        transaction.sendAmount[0].mantissa,
        transaction.receiveAmount[0].mantissa,
        userAddress,
        dex,
        toolkit
      );
    case Token.TzBTC:
      return await tokenToXtz(
        transaction.sendAmount[0].mantissa,
        transaction.receiveAmount[0].mantissa,
        userAddress,
        dex,
        transaction.sendAsset[0].address,
        toolkit,
        transaction.slippage
      );

    default:
      console.log("Unimplemented swap asset :", transaction.sendAsset[0].name);
      throw Errors.INTERNAL;
  }
};

const removeLiquidityTransaction = async (
  transaction: Transaction,
  userAddress: string,
  dex: string,
  toolkit: TezosToolkit
): Promise<SuccessRecord> => {
  return await removeLiquidity(
    transaction.sendAmount[0].mantissa,
    userAddress,
    dex,
    toolkit
  );
};
const addLiquidityTransaction = async (
  transaction: Transaction,
  userAddress: string,
  dex: string,
  toolkit: TezosToolkit
): Promise<SuccessRecord> => {
  if (transaction.sendAmount[1] && transaction.sendAsset[1]) {
    switch (transaction.sendAsset[0].name) {
      case Token.XTZ:
        return await buyLiquidityShares(
          transaction.sendAmount[0].mantissa,
          transaction.sendAmount[1].mantissa,
          transaction.receiveAmount[0].mantissa,
          new BigNumber(transaction.slippage),
          userAddress,
          dex,
          transaction.sendAsset[1].address,
          toolkit
        );
      case Token.TzBTC:
        return await buyLiquidityShares(
          transaction.sendAmount[1].mantissa,
          transaction.sendAmount[0].mantissa,
          transaction.receiveAmount[0].mantissa,
          new BigNumber(transaction.slippage),
          userAddress,
          dex,
          transaction.sendAsset[0].address,
          toolkit
        );
      default:
        console.log(
          "Unimplemented addLiquidtiy asset :",
          transaction.sendAsset[0].name
        );
        throw Errors.INTERNAL;
    }
  } else {
    console.log(" addLiquidity requires send Pair");
    throw Errors.INTERNAL;
  }
};

export const decimals = {
  XTZ: 6,
  TzBTC: 8,
  Sirius: 0,
  Sirs: 0,
};

export function tokenMantissaToDecimal(
  mantissa: BigNumber | number | string,
  asset: Token
) {
  const decimal = new BigNumber(mantissa).div(
    new BigNumber(10).pow(decimals[asset])
  );

  return decimal;
}
export function tokenDecimalToMantissa(
  decimalAmount: BigNumber | number | string,
  asset: Token
) {
  const mantissa = new BigNumber(10)
    .pow(decimals[asset])
    .times(decimalAmount)
    .decimalPlaces(0, 1);

  return mantissa;
}
