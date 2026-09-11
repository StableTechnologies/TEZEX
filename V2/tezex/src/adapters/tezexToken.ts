import { OpKind, TezosToolkit, TransferParams } from "@taquito/taquito";
import BigNumber from "bignumber.js";

import {
  buildApproveOp,
  toExactNat,
  transferParamsToBeaconOp,
} from "../functions/transactions";
import { getTxDeadline, makeEstimationToolkit } from "../functions/util";
import { Errors, ExecutionKit, Token, TokenType } from "../types/general";
import {
  AddLiquidityEstimate,
  IPoolAdapter,
  PoolConfig,
  PoolData,
  RemoveLiquidityEstimate,
  SwapEstimate,
} from "../types/pools";
import { PoolDataCache } from "../utils/poolDataCache";
import { PoolRegistry } from "./poolRegistry";

const FEE_DENOMINATOR = new BigNumber(10_000);
const AMOUNT_AFTER_FEE_BP = new BigNumber(9_970);

const quoteOutput = (
  inputAmount: BigNumber,
  reserveIn: BigNumber,
  reserveOut: BigNumber
) => {
  const amountWithFee = inputAmount.times(AMOUNT_AFTER_FEE_BP);
  return amountWithFee
    .times(reserveOut)
    .div(reserveIn.times(FEE_DENOMINATOR).plus(amountWithFee))
    .integerValue(BigNumber.ROUND_DOWN);
};

const minimumAfterSlippage = (amount: BigNumber, slippage: number) =>
  amount
    .minus(amount.times(slippage).div(100))
    .integerValue(BigNumber.ROUND_DOWN);

export class TezexTokenAdapter implements IPoolAdapter {
  constructor(public poolConfig: PoolConfig) {}

  async estimateSwap(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<SwapEstimate> {
    const pool = await this.getPoolData(toolkit);
    const isTokenA = inputToken === this.poolConfig.tokenA;
    if (!isTokenA && inputToken !== this.poolConfig.tokenB) {
      throw new Error("Swap input is not part of this pool");
    }

    return {
      inputAmount,
      outputAmount: quoteOutput(
        inputAmount,
        isTokenA ? pool.tokenAPool : pool.tokenBPool,
        isTokenA ? pool.tokenBPool : pool.tokenAPool
      ),
    };
  }

  async calculateRequiredTokenForLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<BigNumber> {
    const pool = await this.getPoolData(toolkit);
    if (inputToken === this.poolConfig.tokenA) {
      return inputAmount
        .times(pool.tokenBPool)
        .div(pool.tokenAPool)
        .integerValue(BigNumber.ROUND_CEIL);
    }
    if (inputToken === this.poolConfig.tokenB) {
      return inputAmount
        .times(pool.tokenAPool)
        .div(pool.tokenBPool)
        .integerValue(BigNumber.ROUND_CEIL);
    }
    throw new Error("Liquidity input is not part of this pool");
  }

  async estimateAddLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    firstAmount: BigNumber,
    secondAmount: BigNumber
  ): Promise<AddLiquidityEstimate> {
    const pool = await this.getPoolData(toolkit);
    if (
      inputToken !== this.poolConfig.tokenA &&
      inputToken !== this.poolConfig.tokenB
    ) {
      throw new Error("Liquidity input is not part of this pool");
    }
    const tokenAAmount =
      inputToken === this.poolConfig.tokenA ? firstAmount : secondAmount;
    const tokenBAmount =
      inputToken === this.poolConfig.tokenA ? secondAmount : firstAmount;
    const fromA = tokenAAmount
      .times(pool.lpTokenSupply)
      .div(pool.tokenAPool)
      .integerValue(BigNumber.ROUND_DOWN);
    const fromB = tokenBAmount
      .times(pool.lpTokenSupply)
      .div(pool.tokenBPool)
      .integerValue(BigNumber.ROUND_DOWN);

    return {
      tokenAAmount,
      tokenBAmount,
      lpTokenAmount: BigNumber.minimum(fromA, fromB),
    };
  }

  async estimateRemoveLiquidity(
    toolkit: TezosToolkit,
    lpTokenAmount: BigNumber
  ): Promise<RemoveLiquidityEstimate> {
    const pool = await this.getPoolData(toolkit);
    return {
      lpTokenAmount,
      tokenAAmount: lpTokenAmount
        .times(pool.tokenAPool)
        .div(pool.lpTokenSupply)
        .integerValue(BigNumber.ROUND_DOWN),
      tokenBAmount: lpTokenAmount
        .times(pool.tokenBPool)
        .div(pool.lpTokenSupply)
        .integerValue(BigNumber.ROUND_DOWN),
    };
  }

  async executeSwap(
    kit: ExecutionKit,
    userAddress: string,
    inputToken: Token,
    inputAmount: BigNumber,
    minOutputAmount: BigNumber,
    slippage: number
  ): Promise<string> {
    const inputIsA = inputToken === this.poolConfig.tokenA;
    if (!inputIsA && inputToken !== this.poolConfig.tokenB) {
      throw new Error("Swap input is not part of this pool");
    }

    const { toolkit } = kit;
    const pool = await toolkit.contract.at(this.poolConfig.address);
    const inputAsset = PoolRegistry.getAsset(inputToken);
    const inputContract = await toolkit.contract.at(inputAsset.address);
    const cleanup = buildApproveOp({
      tokenContract: inputContract,
      token: inputAsset,
      ownerAddress: userAddress,
      spenderAddress: this.poolConfig.address,
      amount: 0,
    });
    const operations: TransferParams[] = [];
    if (inputAsset.type === TokenType.FA12) operations.push(cleanup);
    operations.push(
      buildApproveOp({
        tokenContract: inputContract,
        token: inputAsset,
        ownerAddress: userAddress,
        spenderAddress: this.poolConfig.address,
        amount: inputAmount,
      }),
      pool.methodsObject
        .swap({
          direction: inputIsA ? { a_to_b: undefined } : { b_to_a: undefined },
          amount_in: toExactNat(inputAmount, "token swap input"),
          min_amount_out: toExactNat(
            minimumAfterSlippage(minOutputAmount, slippage),
            "token swap minimum output"
          ),
          receiver: userAddress,
          deadline: getTxDeadline().toISOString(),
        })
        .toTransferParams(),
      cleanup
    );

    return this.submitBatch(kit, userAddress, operations, "tokenSwap");
  }

  async executeAddLiquidity(
    kit: ExecutionKit,
    userAddress: string,
    tokenAAmount: BigNumber,
    tokenBAmount: BigNumber,
    minLpTokens: BigNumber,
    slippage: number
  ): Promise<string> {
    const { toolkit } = kit;
    const pool = await toolkit.contract.at(this.poolConfig.address);
    const assetA = PoolRegistry.getAsset(this.poolConfig.tokenA);
    const assetB = PoolRegistry.getAsset(this.poolConfig.tokenB);
    const contractA = await toolkit.contract.at(assetA.address);
    const contractB = await toolkit.contract.at(assetB.address);
    const cleanupA = buildApproveOp({
      tokenContract: contractA,
      token: assetA,
      ownerAddress: userAddress,
      spenderAddress: this.poolConfig.address,
      amount: 0,
    });
    const cleanupB = buildApproveOp({
      tokenContract: contractB,
      token: assetB,
      ownerAddress: userAddress,
      spenderAddress: this.poolConfig.address,
      amount: 0,
    });
    const operations: TransferParams[] = [];
    if (assetA.type === TokenType.FA12) operations.push(cleanupA);
    if (assetB.type === TokenType.FA12) operations.push(cleanupB);
    operations.push(
      buildApproveOp({
        tokenContract: contractA,
        token: assetA,
        ownerAddress: userAddress,
        spenderAddress: this.poolConfig.address,
        amount: tokenAAmount,
      }),
      buildApproveOp({
        tokenContract: contractB,
        token: assetB,
        ownerAddress: userAddress,
        spenderAddress: this.poolConfig.address,
        amount: tokenBAmount,
      }),
      pool.methodsObject
        .add_liquidity({
          max_amount_a: toExactNat(tokenAAmount, "maximum token A deposit"),
          max_amount_b: toExactNat(tokenBAmount, "maximum token B deposit"),
          min_lqt_minted: toExactNat(
            minimumAfterSlippage(minLpTokens, slippage),
            "minimum token-pair LQT minted"
          ),
          receiver: userAddress,
          deadline: getTxDeadline().toISOString(),
        })
        .toTransferParams(),
      cleanupA,
      cleanupB
    );

    return this.submitBatch(kit, userAddress, operations, "tokenAddLiquidity");
  }

  async executeRemoveLiquidity(
    kit: ExecutionKit,
    userAddress: string,
    lpTokenAmount: BigNumber,
    slippage: number,
    quotedTokenAAmount?: BigNumber,
    quotedTokenBAmount?: BigNumber
  ): Promise<string> {
    const estimate =
      quotedTokenAAmount && quotedTokenBAmount
        ? {
            tokenAAmount: quotedTokenAAmount,
            tokenBAmount: quotedTokenBAmount,
          }
        : await this.estimateRemoveLiquidity(kit.toolkit, lpTokenAmount);
    const pool = await kit.toolkit.contract.at(this.poolConfig.address);
    const operation = pool.methodsObject
      .remove_liquidity({
        lqt_burned: toExactNat(lpTokenAmount, "token-pair LQT burned"),
        min_amount_a: toExactNat(
          minimumAfterSlippage(estimate.tokenAAmount, slippage),
          "minimum token A withdrawal"
        ),
        min_amount_b: toExactNat(
          minimumAfterSlippage(estimate.tokenBAmount, slippage),
          "minimum token B withdrawal"
        ),
        receiver: userAddress,
        deadline: getTxDeadline().toISOString(),
      })
      .toTransferParams();

    return this.submitBatch(
      kit,
      userAddress,
      [operation],
      "tokenRemoveLiquidity"
    );
  }

  async getPoolData(
    toolkit: TezosToolkit,
    forceRefresh = false
  ): Promise<PoolData> {
    try {
      if (!forceRefresh) {
        const cached = PoolDataCache.get(this.poolConfig.id);
        if (cached) return cached;
      }

      const contract = await toolkit.contract.at(this.poolConfig.address);
      // The deployed token-pair contract uses snake_case storage fields.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const storage = await contract.storage<any>();
      const data: PoolData = {
        tokenAPool: new BigNumber(storage.reserve_a),
        tokenBPool: new BigNumber(storage.reserve_b),
        lpTokenSupply: new BigNumber(storage.lqt_total),
        lpFeeBp: 25,
        protocolFeeBp: 5,
        totalFeeBp: 30,
        feeSource: "fallback",
        feeModel: "new-mod",
      };
      PoolDataCache.set(this.poolConfig.id, data);
      return data;
    } catch (error) {
      console.error("Error getting token-pair pool data:", error);
      throw Errors.LB_CONTRACT_STORAGE;
    }
  }

  private async submitBatch(
    kit: ExecutionKit,
    userAddress: string,
    transferParams: TransferParams[],
    operationName: string
  ): Promise<string> {
    let estimatedParams = transferParams;
    try {
      const estimator = makeEstimationToolkit(kit.toolkit, userAddress);
      const estimates = await estimator.estimate.batch(
        transferParams.map((params) => ({
          kind: OpKind.TRANSACTION as const,
          ...params,
        }))
      );
      estimatedParams = transferParams.map((params, index) => ({
        ...params,
        fee: estimates[index].suggestedFeeMutez,
        gasLimit: estimates[index].gasLimit,
        storageLimit: estimates[index].storageLimit,
      }));
    } catch (error) {
      console.warn(
        `[${operationName}] Batch fee estimation failed, using wallet defaults:`,
        error
      );
    }

    const response = await kit.client.requestOperation({
      operationDetails: estimatedParams.map(transferParamsToBeaconOp),
    });
    void this.getPoolData(kit.toolkit, true).catch((error) => {
      console.warn("Post-submit token-pair pool refresh failed:", error);
    });
    return response.transactionHash;
  }
}
