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

/** TEZEX constant-product fee accounting variant (from storage shape). */
export type TezexFeeModel = "base" | "legacy-mod" | "new-mod";

/** Origin of cached TEZEX fee basis points (on-chain view vs local default). */
export type TezexFeeSource = "view" | "fallback";

export interface PoolData {
  tokenAPool: BigNumber;
  tokenBPool: BigNumber;
  lpTokenSupply: BigNumber;
  /**
   * Protocol fee in basis points.
   * Used for legacy-mod deduct-first quotes; also cached for UI labels on new-mod.
   */
  protocolFeeBp?: number;
  /** LP share of the swap fee in basis points (e.g. 25 on new-mod, 30 on base). */
  lpFeeBp?: number;
  /** Total swap fee in basis points (e.g. 30 for immutable AMM fee model). */
  totalFeeBp?: number;
  /** Whether fee bp fields came from `get_fee_bp` or a local fallback. */
  feeSource?: TezexFeeSource;
  feeModel?: TezexFeeModel;
}

export const isSupportedPoolConfiguration = (pool: PoolConfig): boolean =>
  pool.type !== PoolType.SIRIUS ||
  (pool.tokenA === Token.XTZ &&
    pool.tokenB === Token.TzBTC &&
    pool.lpToken === Token.Sirs);

export const supportsDirectSwap = (
  pool: PoolConfig,
  inputToken: Token,
  outputToken: Token
): boolean => {
  if (!isSupportedPoolConfiguration(pool) || inputToken === outputToken) {
    return false;
  }

  const matchesConfiguredPair =
    (pool.tokenA === inputToken && pool.tokenB === outputToken) ||
    (pool.tokenA === outputToken && pool.tokenB === inputToken);

  if (!matchesConfiguredPair) return false;

  // Sirius' immutable tokenToToken entrypoint is deliberately unsupported.
  // Every Sirius route exposed by TEZEX must be one direct XTZ leg.
  return (
    pool.type !== PoolType.SIRIUS ||
    inputToken === Token.XTZ ||
    outputToken === Token.XTZ
  );
};

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
    lpTokenAmount: BigNumber,
    slippage: number
  ): Promise<string>; //  opHash

  getPoolData(toolkit: TezosToolkit, forceRefresh?: boolean): Promise<PoolData>;
}
