import {
  MichelsonMap,
  OpKind,
  TezosToolkit,
  TransferParams,
} from "@taquito/taquito";
import BigNumber from "bignumber.js";
import { Token, Errors, ExecutionKit, TokenType } from "../types/general";
import {
  AddLiquidityEstimate,
  IPoolAdapter,
  PoolData,
  RemoveLiquidityEstimate,
  StablePoolConfig,
  SwapEstimate,
} from "../types/pools";
import { PoolRegistry } from "./poolRegistry";
import { PoolDataCache } from "../utils/poolDataCache";
import { getTxDeadline, makeEstimationToolkit } from "../functions/util";
import {
  buildApproveOp,
  toExactNat,
  transferParamsToBeaconOp,
} from "../functions/transactions";

// Types
interface StableTokenInfo {
  rate_f: BigNumber;
  precision_multiplier_f: BigNumber;
  reserves: BigNumber;
}

interface StableAmplificationSchedule {
  initial_A_time: string | number | Date;
  future_A_time: string | number | Date;
  initial_A_f: BigNumber.Value;
  future_A_f: BigNumber.Value;
}

interface StableStorageTokenInfo {
  rate_f: BigNumber.Value;
  precision_multiplier_f: BigNumber.Value;
  reserves: BigNumber.Value;
}

interface StableStoragePool extends StableAmplificationSchedule {
  tokens_info: { get: (key: string) => StableStorageTokenInfo };
  total_supply: BigNumber.Value;
  fee: {
    lp_f: BigNumber.Value;
    stakers_f: BigNumber.Value;
    ref_f: BigNumber.Value;
  };
}

interface StableContractStorage {
  storage: {
    pools: { get: (key: string) => Promise<StableStoragePool> };
    dev_store: { dev_fee_f: BigNumber.Value };
  };
}

interface StablePoolData extends PoolData {
  tokensInfo: StableTokenInfo[];
  ampF: BigNumber;
  lpTokenSupply: BigNumber;
  fee: {
    lp_f: BigNumber;
    stakers_f: BigNumber;
    ref_f: BigNumber;
    dev_f: BigNumber; // stored separately in dev_store.dev_fee_f
  };
}

// Constants - mirrors contracts/partials/constants.ligo
const PRECISION = new BigNumber("1000000000000000000"); // 1e18
const A_PRECISION = new BigNumber(100);
const FEE_DENOM = new BigNumber("10000000000"); // 1e10

// Off-chain math - mirrors contract logic
function ceilDiv(a: BigNumber, b: BigNumber): BigNumber {
  return a.plus(b).minus(1).div(b).integerValue(BigNumber.ROUND_FLOOR);
}

/**
 * xp(pool) - normalize reserves to a common 18-decimal scale
 * rate_f * reserves / precision
 */
function getXP(tokensInfo: StableTokenInfo[]): BigNumber[] {
  return tokensInfo.map((t) =>
    t.rate_f
      .multipliedBy(t.reserves)
      .div(PRECISION)
      .integerValue(BigNumber.ROUND_FLOOR)
  );
}

function getCurrentA(pool: StableAmplificationSchedule): BigNumber {
  const now = Math.floor(Date.now() / 1000);

  const t0 = Math.floor(new Date(pool.initial_A_time).getTime() / 1000);
  const t1 = Math.floor(new Date(pool.future_A_time).getTime() / 1000);

  const a0 = new BigNumber(pool.initial_A_f);
  const a1 = new BigNumber(pool.future_A_f);

  if (now >= t1) {
    return a1;
  }

  const tNum = new BigNumber(now - t0);
  const tDen = new BigNumber(t1 - t0);

  const diff = a1.minus(a0).abs();
  const value = diff
    .multipliedBy(tNum)
    .div(tDen)
    .integerValue(BigNumber.ROUND_FLOOR);

  return a1.gt(a0) ? a0.plus(value) : a0.minus(value);
}

/**
 * get_D - pool invariant, Newton's method iteration
 */

function getD(xp: BigNumber[], ampF: BigNumber): BigNumber {
  const n = new BigNumber(xp.length);
  const S = xp.reduce((a, b) => a.plus(b), new BigNumber(0));
  if (S.isZero()) return new BigNumber(0);

  const Ann = ampF.multipliedBy(n);
  let D = S;

  for (let i = 0; i < 255; i++) {
    let D_p = D;
    for (const x of xp) {
      D_p = ceilDiv(D_p.multipliedBy(D), x.multipliedBy(n));
    }
    const D_prev = D;

    const num = Ann.multipliedBy(S)
      .div(A_PRECISION)
      .plus(D_p.multipliedBy(n))
      .multipliedBy(D);

    const den = Ann.minus(A_PRECISION)
      .multipliedBy(D)
      .div(A_PRECISION)
      .plus(n.plus(1).multipliedBy(D_p));

    D = ceilDiv(num, den);
    if (D.minus(D_prev).abs().lte(1)) break;
  }
  return D;
}

function calcY(
  c: BigNumber,
  aNN_f: BigNumber,
  s_: BigNumber,
  d: BigNumber,
  n: BigNumber
): BigNumber {
  c = ceilDiv(
    c.multipliedBy(d).multipliedBy(A_PRECISION),
    aNN_f.multipliedBy(n)
  );
  const b = s_.plus(
    d.multipliedBy(A_PRECISION).div(aNN_f).integerValue(BigNumber.ROUND_FLOOR)
  );
  let y = d;
  let prev_y = new BigNumber(0);

  while (y.minus(prev_y).abs().gt(1)) {
    prev_y = y;
    y = ceilDiv(y.multipliedBy(y).plus(c), y.multipliedBy(2).plus(b).minus(d));
  }
  return y;
}

function getY(
  i: number,
  j: number,
  x: BigNumber,
  xp: BigNumber[],
  ampF: BigNumber
): BigNumber {
  const n = new BigNumber(xp.length);
  const aNN_f = ampF.multipliedBy(n);
  const d = getD(xp, ampF);

  let s_ = new BigNumber(0);
  let c0 = d;
  let c1 = new BigNumber(1);

  for (let k = 0; k < xp.length; k++) {
    if (k === j) continue;
    const _x = k === i ? x : xp[k];
    s_ = s_.plus(_x);
    c0 = c0.multipliedBy(d);
    c1 = c1.multipliedBy(_x.multipliedBy(n));
  }

  return calcY(ceilDiv(c0, c1), aNN_f, s_, d, n);
}

function performSwap(
  i: number,
  j: number,
  dx: BigNumber,
  pool: StablePoolData
): BigNumber {
  const xp = getXP(pool.tokensInfo);
  const t_i = pool.tokensInfo[i];
  const t_j = pool.tokensInfo[j];

  const x = xp[i].plus(
    dx
      .multipliedBy(t_i.rate_f)
      .div(PRECISION)
      .integerValue(BigNumber.ROUND_FLOOR)
  );

  const y = getY(i, j, x, xp, pool.ampF);

  let dy = xp[j].minus(y);
  if (dy.lte(0)) return new BigNumber(0);

  dy = dy
    .multipliedBy(PRECISION)
    .div(t_j.rate_f)
    .integerValue(BigNumber.ROUND_FLOOR);

  if (dy.gte(t_j.reserves)) throw new Error("low_reserves");
  return dy;
}

/**
 * applyFee - deduct swap fees from dy, returns net amount out and fee
 */
function applyFee(
  dy: BigNumber,
  fee: StablePoolData["fee"]
): {
  amountOut: BigNumber;
  fee: BigNumber;
} {
  // Total fee = lp_f + stakers_f + ref_f + dev_f
  const totalFeeF = fee.lp_f
    .plus(fee.stakers_f)
    .plus(fee.ref_f)
    .plus(fee.dev_f);

  const feeAmount = totalFeeF
    .multipliedBy(dy)
    .div(FEE_DENOM)
    .integerValue(BigNumber.ROUND_FLOOR);

  return {
    amountOut: dy.minus(feeAmount),
    fee: feeAmount,
  };
}

// Adapter
export class StableSwapAdapter implements IPoolAdapter {
  constructor(public poolConfig: StablePoolConfig) {}

  async estimateSwap(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<SwapEstimate> {
    try {
      const poolData = await this.getStablePoolData(toolkit);

      const isTokenA = inputToken === this.poolConfig.tokenA;
      const i = isTokenA
        ? this.poolConfig.tokenAIdx
        : this.poolConfig.tokenBIdx;
      const j = isTokenA
        ? this.poolConfig.tokenBIdx
        : this.poolConfig.tokenAIdx;

      const dy_raw = performSwap(i, j, inputAmount, poolData);
      const { amountOut } = applyFee(dy_raw, poolData.fee);

      return {
        inputAmount,
        outputAmount: amountOut,
      };
    } catch (error) {
      console.error("Error estimating stable swap:", error);
      throw error;
    }
  }

  async calculateRequiredTokenForLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<BigNumber> {
    try {
      const poolData = await this.getStablePoolData(toolkit);
      const reserveA = poolData.tokensInfo[this.poolConfig.tokenAIdx].reserves;
      const reserveB = poolData.tokensInfo[this.poolConfig.tokenBIdx].reserves;

      const isTokenA = inputToken === this.poolConfig.tokenA;

      // Proportion: amountB = amountA * reserveB / reserveA
      if (isTokenA) {
        return inputAmount
          .multipliedBy(reserveB)
          .div(reserveA)
          .integerValue(BigNumber.ROUND_CEIL);
      } else {
        return inputAmount
          .multipliedBy(reserveA)
          .div(reserveB)
          .integerValue(BigNumber.ROUND_CEIL);
      }
    } catch (error) {
      console.error("Error calculating required token:", error);
      throw error;
    }
  }

  async estimateAddLiquidity(
    toolkit: TezosToolkit,
    _inputToken: Token,
    tokenAAmount: BigNumber,
    tokenBAmount: BigNumber
  ): Promise<AddLiquidityEstimate> {
    try {
      const poolData = await this.getStablePoolData(toolkit);
      const D_before = getD(getXP(poolData.tokensInfo), poolData.ampF);

      const newTokensInfo = poolData.tokensInfo.map((t, idx) => ({
        ...t,
        reserves: t.reserves.plus(
          idx === this.poolConfig.tokenAIdx ? tokenAAmount : tokenBAmount
        ),
      }));

      const D_after = getD(getXP(newTokensInfo), poolData.ampF);

      // LP mint = supply * (D_after - D_before) / D_before
      const lpTokenAmount = poolData.lpTokenSupply
        .multipliedBy(D_after.minus(D_before))
        .div(D_before)
        .integerValue(BigNumber.ROUND_DOWN);

      return { tokenAAmount, tokenBAmount, lpTokenAmount };
    } catch (error) {
      console.error("Error estimating add liquidity:", error);
      throw error;
    }
  }

  async estimateRemoveLiquidity(
    toolkit: TezosToolkit,
    lpTokenAmount: BigNumber
  ): Promise<RemoveLiquidityEstimate> {
    try {
      const poolData = await this.getStablePoolData(toolkit);
      const share = lpTokenAmount.div(poolData.lpTokenSupply);

      const tokenAAmount = poolData.tokensInfo[
        this.poolConfig.tokenAIdx
      ].reserves
        .multipliedBy(share)
        .integerValue(BigNumber.ROUND_DOWN);

      const tokenBAmount = poolData.tokensInfo[
        this.poolConfig.tokenBIdx
      ].reserves
        .multipliedBy(share)
        .integerValue(BigNumber.ROUND_DOWN);

      return { lpTokenAmount, tokenAAmount, tokenBAmount };
    } catch (error) {
      console.error("Error estimating remove liquidity:", error);
      throw error;
    }
  }

  async executeSwap(
    kit: ExecutionKit,
    userAddress: string,
    inputToken: Token,
    inputAmount: BigNumber,
    minOutputAmount: BigNumber,
    slippage: number
  ): Promise<string> {
    const { client, toolkit } = kit;
    try {
      const contract = await toolkit.contract.at(this.poolConfig.address);
      const deadline = getTxDeadline().toISOString();

      const isTokenA = inputToken === this.poolConfig.tokenA;
      const i = isTokenA
        ? this.poolConfig.tokenAIdx
        : this.poolConfig.tokenBIdx;
      const j = isTokenA
        ? this.poolConfig.tokenBIdx
        : this.poolConfig.tokenAIdx;
      const fromToken = isTokenA
        ? this.poolConfig.tokenA
        : this.poolConfig.tokenB;

      const minWithSlippage = minOutputAmount
        .minus(minOutputAmount.times(slippage).div(100))
        .integerValue(BigNumber.ROUND_DOWN);

      const fromAsset = PoolRegistry.getAsset(fromToken);
      const fromContract = await toolkit.contract.at(fromAsset.address);
      const allTransferParams: TransferParams[] = [];

      const approve0 = buildApproveOp({
        tokenContract: fromContract,
        token: fromAsset,
        ownerAddress: userAddress,
        spenderAddress: this.poolConfig.address,
        amount: 0,
      });
      if (fromAsset.type === TokenType.FA12) {
        allTransferParams.push(approve0);
      }

      allTransferParams.push(
        buildApproveOp({
          tokenContract: fromContract,
          token: fromAsset,
          ownerAddress: userAddress,
          spenderAddress: this.poolConfig.address,
          amount: inputAmount,
        })
      );

      allTransferParams.push(
        contract.methodsObject
          .swap({
            pool_id: this.poolConfig.poolId,
            idx_from: i,
            idx_to: j,
            amount: toExactNat(inputAmount, "stable swap input"),
            min_amount_out: toExactNat(
              minWithSlippage,
              "stable minimum output"
            ),
            receiver: userAddress,
            referral: null,
            deadline,
          })
          .toTransferParams()
      );

      allTransferParams.push(approve0); // Reset approval

      let estimatedParams = allTransferParams;
      try {
        const estToolkit = makeEstimationToolkit(toolkit, userAddress);
        const estimates = await estToolkit.estimate.batch(
          allTransferParams.map((tp) => ({
            kind: OpKind.TRANSACTION as const,
            ...tp,
          }))
        );
        estimatedParams = allTransferParams.map((tp, idx) => ({
          ...tp,
          fee: estimates[idx].suggestedFeeMutez,
          gasLimit: estimates[idx].gasLimit,
          storageLimit: estimates[idx].storageLimit,
        }));
      } catch (estimationError) {
        console.warn(
          "[stableSwap] Batch fee estimation failed, using wallet defaults:",
          estimationError
        );
      }

      const operations = estimatedParams.map((tp) =>
        transferParamsToBeaconOp(tp)
      );

      const response = await client.requestOperation({
        operationDetails: operations,
      });
      void this.getStablePoolData(toolkit, true).catch((error) => {
        console.warn("Post-submit stable pool refresh failed:", error);
      });
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing stable swap:", error);
      throw error;
    }
  }

  async executeAddLiquidity(
    kit: ExecutionKit,
    userAddress: string,
    tokenAAmount: BigNumber,
    tokenBAmount: BigNumber,
    minLpTokens: BigNumber,
    slippage: number
  ): Promise<string> {
    const { client, toolkit } = kit;
    try {
      const contract = await toolkit.contract.at(this.poolConfig.address);
      const deadline = getTxDeadline().toISOString();

      const minLpWithSlippage = minLpTokens
        .minus(minLpTokens.times(slippage).div(100))
        .integerValue(BigNumber.ROUND_DOWN);

      const allTransferParams: TransferParams[] = [];

      const assetA = PoolRegistry.getAsset(this.poolConfig.tokenA);
      const contractA = await toolkit.contract.at(assetA.address);
      const assetB = PoolRegistry.getAsset(this.poolConfig.tokenB);
      const contractB = await toolkit.contract.at(assetB.address);

      const approveA0 = buildApproveOp({
        tokenContract: contractA,
        token: assetA,
        ownerAddress: userAddress,
        spenderAddress: this.poolConfig.address,
        amount: 0,
      });
      const approveB0 = buildApproveOp({
        tokenContract: contractB,
        token: assetB,
        ownerAddress: userAddress,
        spenderAddress: this.poolConfig.address,
        amount: 0,
      });

      if (assetA.type === TokenType.FA12) {
        allTransferParams.push(approveA0);
      }
      if (assetB.type === TokenType.FA12) {
        allTransferParams.push(approveB0);
      }

      allTransferParams.push(
        buildApproveOp({
          tokenContract: contractA,
          token: assetA,
          ownerAddress: userAddress,
          spenderAddress: this.poolConfig.address,
          amount: tokenAAmount,
        })
      );
      allTransferParams.push(
        buildApproveOp({
          tokenContract: contractB,
          token: assetB,
          ownerAddress: userAddress,
          spenderAddress: this.poolConfig.address,
          amount: tokenBAmount,
        })
      );

      const inAmounts = new MichelsonMap({
        prim: "map",
        args: [{ prim: "nat" }, { prim: "nat" }],
      });
      inAmounts.set(
        this.poolConfig.tokenAIdx,
        toExactNat(tokenAAmount, "stable token A deposit")
      );
      inAmounts.set(
        this.poolConfig.tokenBIdx,
        toExactNat(tokenBAmount, "stable token B deposit")
      );

      allTransferParams.push(
        contract.methodsObject
          .invest({
            pool_id: this.poolConfig.poolId,
            shares: toExactNat(minLpWithSlippage, "stable minimum LP shares"),
            in_amounts: inAmounts,
            deadline,
          })
          .toTransferParams()
      );

      allTransferParams.push(approveA0); // Reset approval for token A
      allTransferParams.push(approveB0); // Reset approval for token B

      let estimatedParams = allTransferParams;
      try {
        const estToolkit = makeEstimationToolkit(toolkit, userAddress);
        const estimates = await estToolkit.estimate.batch(
          allTransferParams.map((tp) => ({
            kind: OpKind.TRANSACTION as const,
            ...tp,
          }))
        );
        estimatedParams = allTransferParams.map((tp, idx) => ({
          ...tp,
          fee: estimates[idx].suggestedFeeMutez,
          gasLimit: estimates[idx].gasLimit,
          storageLimit: estimates[idx].storageLimit,
        }));
      } catch (estimationError) {
        console.warn(
          "[stableAddLiquidity] Batch fee estimation failed, using wallet defaults:",
          estimationError
        );
      }

      const operations = estimatedParams.map((tp) =>
        transferParamsToBeaconOp(tp)
      );

      const response = await client.requestOperation({
        operationDetails: operations,
      });
      void this.getStablePoolData(toolkit, true).catch((error) => {
        console.warn("Post-submit stable pool refresh failed:", error);
      });
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing add liquidity:", error);
      throw error;
    }
  }

  async executeRemoveLiquidity(
    kit: ExecutionKit,
    userAddress: string,
    lpTokenAmount: BigNumber,
    slippage: number,
    quotedTokenAAmount?: BigNumber,
    quotedTokenBAmount?: BigNumber
  ): Promise<string> {
    const { client, toolkit } = kit;
    try {
      const contract = await toolkit.contract.at(this.poolConfig.address);
      const deadline = getTxDeadline().toISOString();

      const estimate =
        quotedTokenAAmount && quotedTokenBAmount
          ? {
              tokenAAmount: quotedTokenAAmount,
              tokenBAmount: quotedTokenBAmount,
            }
          : await this.estimateRemoveLiquidity(toolkit, lpTokenAmount);

      const minAmounts = new Map<number, string>([
        [
          this.poolConfig.tokenAIdx,
          toExactNat(
            estimate.tokenAAmount
              .minus(estimate.tokenAAmount.times(slippage).div(100))
              .integerValue(BigNumber.ROUND_DOWN),
            "stable minimum token A withdrawal"
          ),
        ],
        [
          this.poolConfig.tokenBIdx,
          toExactNat(
            estimate.tokenBAmount
              .minus(estimate.tokenBAmount.times(slippage).div(100))
              .integerValue(BigNumber.ROUND_DOWN),
            "stable minimum token B withdrawal"
          ),
        ],
      ]);

      const removeLiqParams = contract.methodsObject
        .divest({
          pool_id: this.poolConfig.poolId,
          shares: toExactNat(lpTokenAmount, "stable LP shares burned"),
          min_amounts: minAmounts,
          deadline,
        })
        .toTransferParams();

      let estimatedParams = removeLiqParams;
      try {
        const estToolkit = makeEstimationToolkit(toolkit, userAddress);
        const est = await estToolkit.estimate.transfer(removeLiqParams);
        estimatedParams = {
          ...removeLiqParams,
          fee: est.suggestedFeeMutez,
          gasLimit: est.gasLimit,
          storageLimit: est.storageLimit,
        };
      } catch (estimationError) {
        console.warn(
          "[stableRemoveLiquidity] Fee estimation failed, using wallet defaults:",
          estimationError
        );
      }

      const response = await client.requestOperation({
        operationDetails: [transferParamsToBeaconOp(estimatedParams)],
      });
      void this.getStablePoolData(toolkit, true).catch((error) => {
        console.warn("Post-submit stable pool refresh failed:", error);
      });
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing remove liquidity:", error);
      throw error;
    }
  }

  async getPoolData(
    toolkit: TezosToolkit,
    forceRefresh = false
  ): Promise<PoolData> {
    return this.getStablePoolData(toolkit, forceRefresh);
  }

  async getStablePoolData(
    toolkit: TezosToolkit,
    forceRefresh = false
  ): Promise<StablePoolData> {
    try {
      if (!forceRefresh) {
        const cached = PoolDataCache.get(this.poolConfig.id);
        if (cached) return cached as StablePoolData;
      }

      const contract = await toolkit.contract.at(this.poolConfig.address);
      const storage = await contract.storage<StableContractStorage>();

      const pool = await storage.storage.pools.get(
        this.poolConfig.poolId.toString()
      );
      const tokensInfo = pool.tokens_info;

      const parseTokenInfo = (idx: number): StableTokenInfo => {
        const info = tokensInfo.get(idx.toString());
        return {
          rate_f: new BigNumber(info.rate_f),
          precision_multiplier_f: new BigNumber(info.precision_multiplier_f),
          reserves: new BigNumber(info.reserves),
        };
      };

      const poolData: StablePoolData = {
        tokenAPool: new BigNumber(
          tokensInfo.get(this.poolConfig.tokenAIdx.toString()).reserves
        ),
        tokenBPool: new BigNumber(
          tokensInfo.get(this.poolConfig.tokenBIdx.toString()).reserves
        ),
        lpTokenSupply: new BigNumber(pool.total_supply),
        tokensInfo: [parseTokenInfo(0), parseTokenInfo(1)],
        ampF: getCurrentA(pool),
        fee: {
          lp_f: new BigNumber(pool.fee.lp_f),
          stakers_f: new BigNumber(pool.fee.stakers_f),
          ref_f: new BigNumber(pool.fee.ref_f),
          // dev_fee_f lives in dev_store, not in pool.fee
          dev_f: new BigNumber(storage.storage.dev_store.dev_fee_f),
        },
      };

      PoolDataCache.set(this.poolConfig.id, poolData);
      return poolData;
    } catch (error) {
      console.error("Error getting stable pool data:", error);
      throw Errors.LB_CONTRACT_STORAGE;
    }
  }
}
