import { BigNumber } from "bignumber.js";

import { Transaction, Token, TransactingComponent } from "../types/general";

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
) {
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
) => {
  switch (transaction.sendAsset[0].name) {
    case Token.XTZ:
      await xtzToToken(
        transaction.sendAmount[0].mantissa,
        transaction.receiveAmount[0].mantissa,
        userAddress,
        dex,
        toolkit
      );
      break;
    case Token.TzBTC:
      await tokenToXtz(
        transaction.sendAmount[0].mantissa,
        transaction.receiveAmount[0].mantissa,
        userAddress,
        dex,
        transaction.sendAsset[0].address,
        toolkit,
        transaction.slippage
      );
      break;
  }
};

const removeLiquidityTransaction = async (
  transaction: Transaction,
  userAddress: string,
  dex: string,
  toolkit: TezosToolkit
) => {
  await removeLiquidity(
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
) => {
  if (transaction.sendAmount[1] && transaction.sendAsset[1]) {
    switch (transaction.sendAsset[0].name) {
      case Token.XTZ:
        await buyLiquidityShares(
          transaction.sendAmount[0].mantissa,
          transaction.sendAmount[1].mantissa,
          transaction.receiveAmount[0].mantissa,
          new BigNumber(transaction.slippage),
          userAddress,
          dex,
          transaction.sendAsset[1].address,
          toolkit
        );
        break;
      case Token.TzBTC:
        await buyLiquidityShares(
          transaction.sendAmount[1].mantissa,
          transaction.sendAmount[0].mantissa,
          transaction.receiveAmount[0].mantissa,
          new BigNumber(transaction.slippage),
          userAddress,
          dex,
          transaction.sendAsset[0].address,
          toolkit
        );
    }
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
