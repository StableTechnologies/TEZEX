import { OpKind, TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";
import { Token, Errors } from "../types/general";
import {
  AddLiquidityEstimate,
  IPoolAdapter,
  PoolConfig,
  PoolData,
  RemoveLiquidityEstimate,
  SwapEstimate,
} from "../types/pools";
import { PoolRegistry } from "./poolRegistry";
import { PoolDataCache } from "../utils/poolDataCache";

const viewCaller = "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU";

export class TezexAdapter implements IPoolAdapter {
  constructor(public poolConfig: PoolConfig) {}

  async estimateSwap(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<SwapEstimate> {
    try {
      const { tokenAPool: xtzPool, tokenBPool: tokenPool } =
        await this.getPoolData(toolkit);

      const isXtzInput = inputToken === Token.XTZ;

      let outputAmount: BigNumber;
      if (isXtzInput) {
        // (tez_in * 997n * b) / (a * 1000n + tez_in * 997n)
        // where: a - xtz pool, b - token pool
        const numerator = inputAmount.times(997).times(tokenPool);
        const denominator = xtzPool.times(1000).plus(inputAmount.times(997));
        outputAmount = numerator
          .dividedBy(denominator)
          .integerValue(BigNumber.ROUND_DOWN);
      } else {
        // (token_in * 997n * a) / (b * 1000n + token_in * 997n)
        // where: a - xtz pool, b - token pool
        const numerator = inputAmount.times(997).times(xtzPool);
        const denominator = tokenPool.times(1000).plus(inputAmount.times(997));
        outputAmount = numerator
          .dividedBy(denominator)
          .integerValue(BigNumber.ROUND_DOWN);
      }

      return {
        inputAmount,
        outputAmount,
      };
    } catch (error) {
      console.error("Error estimating swap:", error);
      throw error;
    }
  }

  async calculateRequiredTokenForLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<BigNumber> {
    try {
      const poolData = await this.getPoolData(toolkit);
      const { tokenAPool, tokenBPool } = poolData;

      const isXtzInput = inputToken === Token.XTZ;

      if (isXtzInput) {
        // User input XTZ, calculate required USDtz
        // Formula: ceildiv(xtzAmount * tokenPool, xtzPool)
        const numerator = inputAmount.times(tokenBPool);
        const requiredToken = numerator
          .dividedBy(tokenAPool)
          .integerValue(BigNumber.ROUND_CEIL);

        return requiredToken;
      } else {
        // User input USDtz, calculate required XTZ
        // Formula: ceildiv(tokenAmount * xtzPool, tokenPool)
        const numerator = inputAmount.times(tokenAPool);
        const requiredXtz = numerator
          .dividedBy(tokenBPool)
          .integerValue(BigNumber.ROUND_DOWN);

        return requiredXtz;
      }
    } catch (error) {
      console.error("Error calculating required token:", error);
      throw error;
    }
  }

  async estimateAddLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    tokenAAmount: BigNumber,
    tokenBAmount: BigNumber
  ): Promise<AddLiquidityEstimate> {
    try {
      const poolData = await this.getPoolData(toolkit);
      const { tokenAPool: xtzPool, lpTokenSupply } = poolData;

      const xtzAmount =
        inputToken === this.poolConfig.tokenA ? tokenAAmount : tokenBAmount;

      // Formula: lqt_minted = xtzAmount * lqtTotal / xtzPool
      const lpTokenAmount = xtzAmount
        .times(lpTokenSupply)
        .div(xtzPool)
        .integerValue(BigNumber.ROUND_DOWN);

      return {
        tokenAAmount,
        tokenBAmount,
        lpTokenAmount,
      };
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
      const poolData = await this.getPoolData(toolkit);
      const { tokenAPool, tokenBPool, lpTokenSupply } = poolData;

      // Formula from contract:
      // xtz_withdrawn = (lqtBurned * xtzPool) / lqtTotal
      const tokenAAmount = lpTokenAmount
        .times(tokenAPool)
        .div(lpTokenSupply)
        .integerValue(BigNumber.ROUND_DOWN);

      // tokens_withdrawn = (lqtBurned * tokenPool) / lqtTotal
      const tokenBAmount = lpTokenAmount
        .times(tokenBPool)
        .div(lpTokenSupply)
        .integerValue(BigNumber.ROUND_DOWN);

      return {
        lpTokenAmount,
        tokenAAmount,
        tokenBAmount,
      };
    } catch (error) {
      console.error("Error estimating remove liquidity:", error);
      throw error;
    }
  }

  async executeSwap(
    toolkit: TezosToolkit,
    userAddress: string,
    inputToken: Token,
    inputAmount: BigNumber,
    minOutputAmount: BigNumber,
    slippage: number
  ): Promise<string> {
    try {
      const deadline = new Date(Date.now() + 60000).toISOString(); // 1 minute from now
      const contract = await toolkit.wallet.at(this.poolConfig.address);
      const isXtzInput = inputToken === Token.XTZ;

      // Apply slippage to minOutputAmount
      const minWithSlippage = minOutputAmount
        .minus(minOutputAmount.times(slippage).div(100))
        .integerValue(BigNumber.ROUND_DOWN);

      if (isXtzInput) {
        // XTZ -> Token swap
        // xtzToToken(address to, nat minTokensBought, timestamp deadline)
        const operation = contract.methods
          .xtzToToken(userAddress, minWithSlippage.toNumber(), deadline)
          .toTransferParams({ amount: inputAmount.toNumber(), mutez: true });

        const estimate = await toolkit.estimate.transfer(operation);
        if (estimate) {
          operation.fee = estimate.suggestedFeeMutez;
          operation.gasLimit = estimate.gasLimit;
          operation.storageLimit = estimate.storageLimit;
          const opResult = await toolkit.wallet.transfer(operation).send();
          await opResult.confirmation();
          await this.getPoolData(toolkit, true);
          return opResult.opHash;
        } else throw Errors.GAS_ESTIMATION;
      } else {
        // Token -> XTZ swap
        // tokenToXtz(address to, nat tokensSold, mutez minXtzBought, timestamp deadline)
        const tokenAddress = this.getTokenAddress(this.poolConfig.tokenB);
        const tokenContract = await toolkit.wallet.at(tokenAddress);

        // Estimate gas for batch
        const approve0 = tokenContract.methods.approve(
          this.poolConfig.address,
          0
        );
        const approve = tokenContract.methods.approve(
          this.poolConfig.address,
          inputAmount.integerValue(BigNumber.ROUND_DOWN).toNumber()
        );
        const swap = contract.methods.tokenToXtz(
          userAddress,
          inputAmount.integerValue(BigNumber.ROUND_DOWN).toNumber(),
          minWithSlippage.toNumber(),
          deadline
        );

        const estimate = await toolkit.estimate.batch([
          { kind: OpKind.TRANSACTION, ...approve0.toTransferParams() },
          { kind: OpKind.TRANSACTION, ...approve.toTransferParams() },
          { kind: OpKind.TRANSACTION, ...swap.toTransferParams() },
        ]);

        // Execute batch
        const batch = toolkit.wallet.batch().with([
          {
            kind: OpKind.TRANSACTION,
            ...approve0.toTransferParams({
              fee: estimate[0].suggestedFeeMutez,
              gasLimit: estimate[0].gasLimit,
              storageLimit: estimate[0].storageLimit,
            }),
          },
          {
            kind: OpKind.TRANSACTION,
            ...approve.toTransferParams({
              fee: estimate[1].suggestedFeeMutez,
              gasLimit: estimate[1].gasLimit,
              storageLimit: estimate[1].storageLimit,
            }),
          },
          {
            kind: OpKind.TRANSACTION,
            ...swap.toTransferParams({
              fee: estimate[2].suggestedFeeMutez,
              gasLimit: estimate[2].gasLimit,
              storageLimit: estimate[2].storageLimit,
            }),
          },
        ]);

        const batchOp = await batch.send();
        await batchOp.confirmation();
        await this.getPoolData(toolkit, true);
        return batchOp.opHash;
      }
    } catch (error) {
      console.error("Error executing swap:", error);
      throw Errors.TRANSACTION_FAILED;
    }
  }

  async executeAddLiquidity(
    toolkit: TezosToolkit,
    userAddress: string,
    tokenAAmount: BigNumber,
    tokenBAmount: BigNumber,
    minLpTokens: BigNumber,
    slippage: number
  ): Promise<string> {
    try {
      const contract = await toolkit.wallet.at(this.poolConfig.address);
      const deadline = new Date(Date.now() + 60000).toISOString();
      const tokenAddress = this.getTokenAddress(this.poolConfig.tokenB);
      const tokenContract = await toolkit.wallet.at(tokenAddress);

      // Calculate max tokens with slippage
      const maxTokensDeposited = tokenBAmount
        .times(1 + slippage / 100)
        .integerValue(BigNumber.ROUND_DOWN);

      // addLiquidity(address owner, nat minLqtMinted, nat maxTokensDeposited, timestamp deadline)
      const approve0 = tokenContract.methods.approve(
        this.poolConfig.address,
        0
      );
      const approve = tokenContract.methods.approve(
        this.poolConfig.address,
        maxTokensDeposited.toNumber()
      );
      const addLiq = contract.methods.addLiquidity(
        userAddress,
        minLpTokens.integerValue(BigNumber.ROUND_DOWN).toNumber(),
        maxTokensDeposited.toNumber(),
        deadline
      );

      // Estimate gas
      const estimate = await toolkit.estimate.batch([
        { kind: OpKind.TRANSACTION, ...approve0.toTransferParams() },
        { kind: OpKind.TRANSACTION, ...approve.toTransferParams() },
        {
          kind: OpKind.TRANSACTION,
          ...addLiq.toTransferParams(),
          amount: tokenAAmount.toNumber(),
          mutez: true,
        },
        { kind: OpKind.TRANSACTION, ...approve0.toTransferParams() },
      ]);

      // Execute batch with XTZ amount
      const batch = toolkit.wallet.batch().with([
        {
          kind: OpKind.TRANSACTION,
          ...approve0.toTransferParams({
            fee: estimate[0].suggestedFeeMutez,
            gasLimit: estimate[0].gasLimit,
            storageLimit: estimate[0].storageLimit,
          }),
        },
        {
          kind: OpKind.TRANSACTION,
          ...approve.toTransferParams({
            fee: estimate[1].suggestedFeeMutez,
            gasLimit: estimate[1].gasLimit,
            storageLimit: estimate[1].storageLimit,
          }),
        },
        {
          kind: OpKind.TRANSACTION,
          ...addLiq.toTransferParams({
            fee: estimate[2].suggestedFeeMutez,
            gasLimit: estimate[2].gasLimit,
            storageLimit: estimate[2].storageLimit,
          }),
          amount: tokenAAmount.toNumber(),
          mutez: true,
        },
        {
          kind: OpKind.TRANSACTION,
          ...approve0.toTransferParams({
            fee: estimate[3].suggestedFeeMutez,
            gasLimit: estimate[3].gasLimit,
            storageLimit: estimate[3].storageLimit,
          }),
        },
      ]);

      const batchOp = await batch.send();
      await batchOp.confirmation();
      await this.getPoolData(toolkit, true);
      return batchOp.opHash;
    } catch (error) {
      console.error("Error executing add liquidity:", error);
      throw Errors.TRANSACTION_FAILED;
    }
  }

  async executeRemoveLiquidity(
    toolkit: TezosToolkit,
    userAddress: string,
    lpTokenAmount: BigNumber
  ): Promise<string> {
    try {
      const contract = await toolkit.wallet.at(this.poolConfig.address);
      const deadline = new Date(Date.now() + 60000).toISOString();

      // Get estimates for min amounts
      const estimate = await this.estimateRemoveLiquidity(
        toolkit,
        lpTokenAmount
      );

      // Apply 0.5% slippage protection
      const minTokenA = estimate.tokenAAmount
        .times(0.995)
        .integerValue(BigNumber.ROUND_DOWN);
      const minTokenB = estimate.tokenBAmount
        .times(0.995)
        .integerValue(BigNumber.ROUND_DOWN);

      // removeLiquidity(address to, nat lqtBurned, mutez minXtzWithdrawn, nat minTokensWithdrawn, timestamp deadline)
      const operation = await contract.methods
        .removeLiquidity(
          userAddress,
          lpTokenAmount.integerValue(BigNumber.ROUND_DOWN).toNumber(),
          minTokenA.toNumber(), // mutez
          minTokenB.toNumber(), // nat
          deadline
        )
        .send();

      await operation.confirmation();
      await this.getPoolData(toolkit, true);
      return operation.opHash;
    } catch (error) {
      console.error("Error executing remove liquidity:", error);
      throw Errors.TRANSACTION_FAILED;
    }
  }

  async getPoolData(
    toolkit: TezosToolkit,
    forceRefresh = false
  ): Promise<PoolData> {
    try {
      if (!forceRefresh) {
        const cached = PoolDataCache.get(this.poolConfig.id);
        if (cached) {
          return cached;
        }
      }
      const contract = await toolkit.contract.at(this.poolConfig.address);

      // Get reserves using view
      const reservesResult = await contract.contractViews
        .get_reserves(null)
        .executeView({ viewCaller });

      // Get total LP supply
      const lqtTotalResult = await contract.contractViews
        .get_lqt_total(null)
        .executeView({ viewCaller });

      // Parse reserves (format: {nat_0: xtz, nat_1: token})
      const tokenAPool = new BigNumber(reservesResult[0]);
      const tokenBPool = new BigNumber(reservesResult[1]);
      const lpTokenSupply = new BigNumber(lqtTotalResult);

      const poolData: PoolData = {
        tokenAPool,
        tokenBPool,
        lpTokenSupply,
      };

      // Update cache
      PoolDataCache.set(this.poolConfig.id, poolData);

      return poolData;
    } catch (error) {
      console.error("Error getting pool data:", error);
      throw Errors.LB_CONTRACT_STORAGE;
    }
  }

  private getTokenAddress(token: Token): string {
    return PoolRegistry.getAssetAddress(token);
  }
}
