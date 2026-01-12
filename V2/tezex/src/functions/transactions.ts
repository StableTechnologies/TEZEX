import { BigNumber } from "bignumber.js";
import {
  Errors,
  SuccessRecord,
  Transaction,
  Token,
  TransactingComponent,
} from "../types/general";
import { TezosToolkit } from "@taquito/taquito";
import { PoolRegistry } from "../adapters/poolRegistry";
import { IPoolAdapter } from "../types/pools";

export async function processTransaction(
  transaction: Transaction,
  userAddress: string,
  toolkit: TezosToolkit
): Promise<SuccessRecord> {
  const adapter = PoolRegistry.getAdapter(transaction.poolId);

  switch (transaction.component) {
    case TransactingComponent.SWAP:
      return await swapTransaction(transaction, userAddress, toolkit, adapter);
    case TransactingComponent.ADD_LIQUIDITY:
      return await addLiquidityTransaction(
        transaction,
        userAddress,
        toolkit,
        adapter
      );
    case TransactingComponent.REMOVE_LIQUIDITY:
      return await removeLiquidityTransaction(
        transaction,
        userAddress,
        toolkit,
        adapter
      );
  }
}

const swapTransaction = async (
  transaction: Transaction,
  userAddress: string,
  toolkit: TezosToolkit,
  adapter: IPoolAdapter
): Promise<SuccessRecord> => {
  const inputToken = transaction.sendAsset[0].name as Token;
  const inputAmount = transaction.sendAmount[0].mantissa;
  const minOutputAmount = transaction.receiveAmount[0].mantissa;
  const slippage = transaction.slippage;

  const opHash = await adapter.executeSwap(
    toolkit,
    userAddress,
    inputToken,
    inputAmount,
    minOutputAmount,
    slippage
  );

  return {
    opHash,
    tx: transaction,
  };
};

const addLiquidityTransaction = async (
  transaction: Transaction,
  userAddress: string,
  toolkit: TezosToolkit,
  adapter: IPoolAdapter
): Promise<SuccessRecord> => {
  if (!transaction.sendAmount[1] || !transaction.sendAsset[1]) {
    console.log("addLiquidity requires send Pair");
    throw Errors.INTERNAL;
  }

  // Get pool config to determine token order
  const poolConfig = adapter.poolConfig;
  const isFirstAssetTokenA =
    transaction.sendAsset[0].name === poolConfig.tokenA;

  const tokenAAmount = isFirstAssetTokenA
    ? transaction.sendAmount[0].mantissa
    : transaction.sendAmount[1].mantissa;

  const tokenBAmount = isFirstAssetTokenA
    ? transaction.sendAmount[1].mantissa
    : transaction.sendAmount[0].mantissa;

  const minLpTokens = transaction.receiveAmount[0].mantissa;
  const slippage = transaction.slippage;

  const opHash = await adapter.executeAddLiquidity(
    toolkit,
    userAddress,
    tokenAAmount,
    tokenBAmount,
    minLpTokens,
    slippage
  );

  return {
    opHash,
    tx: transaction,
  };
};

const removeLiquidityTransaction = async (
  transaction: Transaction,
  userAddress: string,
  toolkit: TezosToolkit,
  adapter: IPoolAdapter
): Promise<SuccessRecord> => {
  const lpTokenAmount = transaction.sendAmount[0].mantissa;

  const opHash = await adapter.executeRemoveLiquidity(
    toolkit,
    userAddress,
    lpTokenAmount
  );

  return {
    opHash,
    tx: transaction,
  };
};

export const decimals = {
  XTZ: 6,
  TzBTC: 8,
  Sirius: 0,
  Sirs: 0,
  USDtz: 6,
  LP_XTZUSDtz: 6,
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
