import { MichelsonMap, TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";
import { PartialTezosTransactionOperation } from "@airgap/beacon-sdk";
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
import { getTxDeadline } from "../functions/util";
import {
  buildApproveOp,
  transferParamsToBeaconOp,
} from "../functions/transactions";

// Types
interface StableTokenInfo {
  rate_f: BigNumber;
  precision_multiplier_f: BigNumber;
  reserves: BigNumber;
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

function getCurrentA(pool: any): BigNumber {
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
        .times(1 - slippage / 100)
        .integerValue(BigNumber.ROUND_DOWN);

      const fromAsset = PoolRegistry.getAsset(fromToken);
      const fromContract = await toolkit.contract.at(fromAsset.address);
      const operations: PartialTezosTransactionOperation[] = [];

      const approve0 = transferParamsToBeaconOp(
        buildApproveOp({
          tokenContract: fromContract,
          token: fromAsset,
          ownerAddress: userAddress,
          spenderAddress: this.poolConfig.address,
          amount: 0,
        })
      );
      if (fromAsset.type === TokenType.FA12) {
        operations.push(approve0);
      }

      operations.push(
        transferParamsToBeaconOp(
          buildApproveOp({
            tokenContract: fromContract,
            token: fromAsset,
            ownerAddress: userAddress,
            spenderAddress: this.poolConfig.address,
            amount: inputAmount.toNumber(),
          })
        )
      );

      operations.push(
        transferParamsToBeaconOp(
          contract.methodsObject
            .swap({
              pool_id: this.poolConfig.poolId,
              idx_from: i,
              idx_to: j,
              amount: inputAmount,
              min_amount_out: minWithSlippage,
              receiver: userAddress,
              referral: null,
              deadline,
            })
            .toTransferParams()
        )
      );

      operations.push(approve0); // Reset approval

      const response = await client.requestOperation({
        operationDetails: operations,
      });
      await this.getStablePoolData(toolkit, true);
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing stable swap:", error);
      throw Errors.TRANSACTION_FAILED;
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
        .times(1 - slippage / 100)
        .integerValue(BigNumber.ROUND_DOWN);

      const operations: PartialTezosTransactionOperation[] = [];

      const assetA = PoolRegistry.getAsset(this.poolConfig.tokenA);
      const contractA = await toolkit.contract.at(assetA.address);
      const assetB = PoolRegistry.getAsset(this.poolConfig.tokenB);
      const contractB = await toolkit.contract.at(assetB.address);

      const approveA0 = transferParamsToBeaconOp(
        buildApproveOp({
          tokenContract: contractA,
          token: assetA,
          ownerAddress: userAddress,
          spenderAddress: this.poolConfig.address,
          amount: 0,
        })
      );
      const approveB0 = transferParamsToBeaconOp(
        buildApproveOp({
          tokenContract: contractB,
          token: assetB,
          ownerAddress: userAddress,
          spenderAddress: this.poolConfig.address,
          amount: 0,
        })
      );

      if (assetA.type === TokenType.FA12) {
        operations.push(approveA0);
      }
      if (assetB.type === TokenType.FA12) {
        operations.push(approveB0);
      }

      operations.push(
        transferParamsToBeaconOp(
          buildApproveOp({
            tokenContract: contractA,
            token: assetA,
            ownerAddress: userAddress,
            spenderAddress: this.poolConfig.address,
            amount: tokenAAmount.toNumber(),
          })
        )
      );
      operations.push(
        transferParamsToBeaconOp(
          buildApproveOp({
            tokenContract: contractB,
            token: assetB,
            ownerAddress: userAddress,
            spenderAddress: this.poolConfig.address,
            amount: tokenBAmount.toNumber(),
          })
        )
      );

      const inAmounts = new MichelsonMap({
        prim: "map",
        args: [{ prim: "nat" }, { prim: "nat" }],
      });
      inAmounts.set(this.poolConfig.tokenAIdx, tokenAAmount);
      inAmounts.set(this.poolConfig.tokenBIdx, tokenBAmount);

      operations.push(
        transferParamsToBeaconOp(
          contract.methodsObject
            .invest({
              pool_id: this.poolConfig.poolId,
              shares: minLpWithSlippage,
              in_amounts: inAmounts,
              deadline,
            })
            .toTransferParams()
        )
      );

      operations.push(approveA0); // Reset approval for token A
      operations.push(approveB0); // Reset approval for token B

      const response = await client.requestOperation({
        operationDetails: operations,
      });
      await this.getStablePoolData(toolkit, true);
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing add liquidity:", error);
      throw Errors.TRANSACTION_FAILED;
    }
  }

  async executeRemoveLiquidity(
    kit: ExecutionKit,
    userAddress: string,
    lpTokenAmount: BigNumber
  ): Promise<string> {
    const { client, toolkit } = kit;
    try {
      const contract = await toolkit.contract.at(this.poolConfig.address);
      const deadline = getTxDeadline().toISOString();

      const estimate = await this.estimateRemoveLiquidity(
        toolkit,
        lpTokenAmount
      );

      const minAmounts = new Map<number, BigNumber>([
        [
          this.poolConfig.tokenAIdx,
          estimate.tokenAAmount.times(0.995).integerValue(BigNumber.ROUND_DOWN),
        ],
        [
          this.poolConfig.tokenBIdx,
          estimate.tokenBAmount.times(0.995).integerValue(BigNumber.ROUND_DOWN),
        ],
      ]);

      const operation = transferParamsToBeaconOp(
        contract.methodsObject
          .divest({
            pool_id: this.poolConfig.poolId,
            shares: lpTokenAmount,
            min_amounts: minAmounts,
            deadline,
          })
          .toTransferParams()
      );

      const response = await client.requestOperation({
        operationDetails: [operation],
      });
      await this.getStablePoolData(toolkit, true);
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing remove liquidity:", error);
      throw Errors.TRANSACTION_FAILED;
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
      const storage = await contract.storage<any>();

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
