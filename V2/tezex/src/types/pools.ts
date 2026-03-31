import { BigNumber } from "bignumber.js";
import { TezosToolkit } from "@taquito/taquito";
import { ExecutionKit, Token } from "./general";

export enum PoolType {
  SIRIUS = "SIRIUS",
  TEZEX = "TEZEX",
  STABLE = "STABLE",
}

export interface PoolConfig {
  id: string;
  name: string;
  type: PoolType;
  address: string;
  tokenA: Token;
  tokenB: Token;
  lpToken: Token;
}

export interface StablePoolConfig extends PoolConfig {
  poolId: number; // pool_id inside Standalone DEX
  tokenAIdx: number; // tokenA (i)
  tokenBIdx: number; // tokenB (j)
}

export interface SwapEstimate {
  inputAmount: BigNumber;
  outputAmount: BigNumber;
}

export interface AddLiquidityEstimate {
  tokenAAmount: BigNumber;
  tokenBAmount: BigNumber;
  lpTokenAmount: BigNumber;
}

export interface RemoveLiquidityEstimate {
  lpTokenAmount: BigNumber;
  tokenAAmount: BigNumber;
  tokenBAmount: BigNumber;
}

export interface PoolData {
  tokenAPool: BigNumber;
  tokenBPool: BigNumber;
  lpTokenSupply: BigNumber;
}

export interface IPoolAdapter {
  poolConfig: PoolConfig;

  estimateSwap(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<SwapEstimate>;

  estimateAddLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    tokenAAmount: BigNumber,
    tokenBAmount: BigNumber
  ): Promise<AddLiquidityEstimate>;

  calculateRequiredTokenForLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<BigNumber>;

  estimateRemoveLiquidity(
    toolkit: TezosToolkit,
    lpTokenAmount: BigNumber
  ): Promise<RemoveLiquidityEstimate>;

  executeSwap(
    kit: ExecutionKit,
    userAddress: string,
    inputToken: Token,
    inputAmount: BigNumber,
    minOutputAmount: BigNumber,
    slippage: number
  ): Promise<string>; //  opHash

  executeAddLiquidity(
    kit: ExecutionKit,
    userAddress: string,
    tokenAAmount: BigNumber,
    tokenBAmount: BigNumber,
    minLpTokens: BigNumber,
    slippage: number
  ): Promise<string>; //  opHash

  executeRemoveLiquidity(
    kit: ExecutionKit,
    userAddress: string,
    lpTokenAmount: BigNumber
  ): Promise<string>; //  opHash

  getPoolData(toolkit: TezosToolkit, forceRefresh?: boolean): Promise<PoolData>;
}
