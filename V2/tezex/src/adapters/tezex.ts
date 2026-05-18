import { OpKind, TezosToolkit } from "@taquito/taquito";
import BigNumber from "bignumber.js";
import { Token, Errors, ExecutionKit, TokenType } from "../types/general";
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
import { getTxDeadline, makeEstimationToolkit } from "../functions/util";
import {
  DAppClient,
  PartialTezosTransactionOperation,
} from "@airgap/beacon-sdk";
import {
  buildApproveOp,
  transferParamsToBeaconOp,
} from "../functions/transactions";
import { TransferParams } from "@taquito/taquito";

export class TezexAdapter implements IPoolAdapter {
  constructor(public poolConfig: PoolConfig) {}

  async estimateSwap(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<SwapEstimate> {
    try {
      const {
        tokenAPool: xtzPool,
        tokenBPool: tokenPool,
        protocolFeeBp,
      } = await this.getPoolData(toolkit);

      // protocol_fee = floor(amount * fee_bp / 10000); net_amount = amount - fee → AMM
      const feeBp = new BigNumber(protocolFeeBp ?? 0);
      const isXtzInput = inputToken === Token.XTZ;

      const protocolFee = inputAmount
        .times(feeBp)
        .div(10000)
        .integerValue(BigNumber.ROUND_DOWN);
      const netAmount = inputAmount.minus(protocolFee);

      let outputAmount: BigNumber;
      if (isXtzInput) {
        const numerator = netAmount.times(997).times(tokenPool);
        const denominator = xtzPool.times(1000).plus(netAmount.times(997));
        outputAmount = numerator
          .dividedBy(denominator)
          .integerValue(BigNumber.ROUND_DOWN);
      } else {
        const numerator = netAmount.times(997).times(xtzPool);
        const denominator = tokenPool.times(1000).plus(netAmount.times(997));
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
        // Formula: floordiv(tokenAmount * xtzPool, tokenPool)
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
    kit: ExecutionKit,
    userAddress: string,
    inputToken: Token,
    inputAmount: BigNumber,
    minOutputAmount: BigNumber,
    slippage: number
  ): Promise<string> {
    const { client, toolkit } = kit;
    try {
      const isXtzInput = inputToken === Token.XTZ;

      // Apply slippage to minOutputAmount
      const minWithSlippage = minOutputAmount
        .minus(minOutputAmount.times(slippage).div(100))
        .integerValue(BigNumber.ROUND_DOWN);

      if (isXtzInput) {
        // XTZ -> Token swap
        // xtzToToken(address to, nat minTokensBought, timestamp deadline)
        return await this.executeXtzToToken(
          client,
          toolkit,
          userAddress,
          inputAmount,
          minWithSlippage
        );
      } else {
        // Token -> XTZ swap
        // tokenToXtz(address to, nat tokensSold, mutez minXtzBought, timestamp deadline)
        return await this.executeTokenToXtz(
          client,
          toolkit,
          userAddress,
          inputAmount,
          minWithSlippage
        );
      }
    } catch (error) {
      console.error("Error executing swap:", error);
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
      const asset = PoolRegistry.getAsset(this.poolConfig.tokenB);
      const tokenContract = await toolkit.contract.at(asset.address);

      // Calculate max tokens with slippage
      const maxTokensDeposited = tokenBAmount
        .times(1 + slippage / 100)
        .integerValue(BigNumber.ROUND_DOWN);
      // Apply slippage to minLqtMinted so small pool changes between estimate and submit don't fail
      const minLqtWithSlippage = minLpTokens
        .times(1 - slippage / 100)
        .integerValue(BigNumber.ROUND_DOWN);

      // addLiquidity(address owner, nat minLqtMinted, nat maxTokensDeposited, timestamp deadline)
      const allTransferParams: TransferParams[] = [];

      const approve0 = buildApproveOp({
        tokenContract,
        token: asset,
        ownerAddress: userAddress,
        spenderAddress: this.poolConfig.address,
        amount: 0,
      });
      if (
        PoolRegistry.getAsset(this.poolConfig.tokenB).type === TokenType.FA12
      ) {
        allTransferParams.push(approve0);
      }

      const approve = buildApproveOp({
        tokenContract,
        token: asset,
        ownerAddress: userAddress,
        spenderAddress: this.poolConfig.address,
        amount: maxTokensDeposited.toNumber(),
      });
      allTransferParams.push(approve);

      const addLiq = contract.methodsObject.addLiquidity({
        owner: userAddress,
        minLqtMinted: minLqtWithSlippage.toNumber(),
        maxTokensDeposited: maxTokensDeposited.toNumber(),
        deadline,
      });
      allTransferParams.push(
        addLiq.toTransferParams({
          amount: tokenAAmount.toNumber(),
          mutez: true,
        })
      );
      allTransferParams.push(approve0);

      let estimatedParams = allTransferParams;
      try {
        const estToolkit = makeEstimationToolkit(toolkit, userAddress);
        const estimates = await estToolkit.estimate.batch(
          allTransferParams.map((tp) => ({ kind: OpKind.TRANSACTION, ...tp }))
        );
        estimatedParams = allTransferParams.map((tp, i) => ({
          ...tp,
          fee: estimates[i].suggestedFeeMutez,
          gasLimit: estimates[i].gasLimit,
          storageLimit: estimates[i].storageLimit,
        }));
      } catch (estimationError) {
        console.warn(
          "[addLiquidity] Batch fee estimation failed, using wallet defaults:",
          estimationError
        );
      }

      const operations = estimatedParams.map((tp) =>
        transferParamsToBeaconOp(tp)
      );

      const response = await client.requestOperation({
        operationDetails: operations,
      });

      await this.getPoolData(toolkit, true);
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

      const removeLiqParams = contract.methodsObject
        .removeLiquidity({
          to: userAddress,
          lqtBurned: lpTokenAmount
            .integerValue(BigNumber.ROUND_DOWN)
            .toNumber(),
          minXtzWithdrawn: minTokenA.toNumber(),
          minTokensWithdrawn: minTokenB.toNumber(),
          deadline,
        })
        .toTransferParams();

      let estimatedRemoveParams = removeLiqParams;
      try {
        const estToolkit = makeEstimationToolkit(toolkit, userAddress);
        const estimate = await estToolkit.estimate.transfer(removeLiqParams);
        estimatedRemoveParams = {
          ...removeLiqParams,
          fee: estimate.suggestedFeeMutez,
          gasLimit: estimate.gasLimit,
          storageLimit: estimate.storageLimit,
        };
      } catch (estimationError) {
        console.warn(
          "[removeLiquidity] Fee estimation failed, using wallet defaults:",
          estimationError
        );
      }

      const response = await client.requestOperation({
        operationDetails: [transferParamsToBeaconOp(estimatedRemoveParams)],
      });

      await this.getPoolData(toolkit, true);
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
    try {
      if (!forceRefresh) {
        const cached = PoolDataCache.get(this.poolConfig.id);
        if (cached) {
          return cached;
        }
      }
      const contract = await toolkit.contract.at(this.poolConfig.address);
      // eslint-disable-next-line
      const storage = await contract.storage<any>();

      const tokenAPool = new BigNumber(storage.xtzPool);
      const tokenBPool = new BigNumber(storage.tokenPool);
      const lpTokenSupply = new BigNumber(storage.lqtTotal);

      // Read protocol_fee_bp directly from contract storage.
      // Undefined means this is a classic pool (no fee field) → treat as 0.
      const protocolFeeBp: number =
        storage.protocol_fee_bp !== undefined
          ? Number(storage.protocol_fee_bp)
          : 0;

      const poolData: PoolData = {
        tokenAPool,
        tokenBPool,
        lpTokenSupply,
        protocolFeeBp,
      };

      // Update cache
      PoolDataCache.set(this.poolConfig.id, poolData);

      return poolData;
    } catch (error) {
      console.error("Error getting pool data:", error);
      throw Errors.LB_CONTRACT_STORAGE;
    }
  }

  private async executeXtzToToken(
    client: DAppClient,
    toolkit: TezosToolkit,
    userAddress: string,
    xtzAmount: BigNumber,
    minTokensBought: BigNumber
  ): Promise<string> {
    const deadline = getTxDeadline().toISOString();
    const contract = await toolkit.contract.at(this.poolConfig.address);

    const operation = contract.methodsObject.xtzToToken({
      to: userAddress,
      minTokensBought: minTokensBought.toNumber(),
      deadline,
    });

    let transferParams: TransferParams = operation.toTransferParams({
      amount: xtzAmount.toNumber(),
      mutez: true,
    });

    try {
      const estToolkit = makeEstimationToolkit(toolkit, userAddress);
      const estimate = await estToolkit.estimate.transfer({
        to: this.poolConfig.address,
        amount: xtzAmount.toNumber(),
        mutez: true,
        parameter: transferParams.parameter,
      });
      transferParams = {
        ...transferParams,
        fee: estimate.suggestedFeeMutez,
        gasLimit: estimate.gasLimit,
        storageLimit: estimate.storageLimit,
      };
    } catch (estimationError) {
      console.warn(
        "[xtzToToken] Fee estimation failed, using wallet defaults:",
        estimationError
      );
    }

    const operationRequest = transferParamsToBeaconOp(transferParams);
    const response = await client.requestOperation({
      operationDetails: [operationRequest],
    });
    await this.getPoolData(toolkit, true);
    return response.transactionHash;
  }

  private async executeTokenToXtz(
    client: DAppClient,
    toolkit: TezosToolkit,
    userAddress: string,
    tokenAmount: BigNumber,
    minXtzBought: BigNumber
  ): Promise<string> {
    try {
      const deadline = getTxDeadline().toISOString();
      const tokenAddress = this.getTokenAddress(this.poolConfig.tokenB);

      const contract = await toolkit.contract.at(this.poolConfig.address);
      const tokenContract = await toolkit.contract.at(tokenAddress);

      const tokenAmountInt = tokenAmount
        .integerValue(BigNumber.ROUND_DOWN)
        .toNumber();
      const asset = PoolRegistry.getAsset(this.poolConfig.tokenB);

      const allTransferParams: TransferParams[] = [];

      if (asset.type === TokenType.FA12) {
        allTransferParams.push(
          buildApproveOp({
            tokenContract,
            token: asset,
            ownerAddress: userAddress,
            spenderAddress: this.poolConfig.address,
            amount: 0,
          })
        );
      }

      allTransferParams.push(
        buildApproveOp({
          tokenContract,
          token: asset,
          ownerAddress: userAddress,
          spenderAddress: this.poolConfig.address,
          amount: tokenAmountInt,
        })
      );

      allTransferParams.push(
        contract.methodsObject
          .tokenToXtz({
            to: userAddress,
            tokensSold: tokenAmountInt,
            minXtzBought: minXtzBought.toNumber(),
            deadline,
          })
          .toTransferParams()
      );

      let estimatedParams = allTransferParams;
      try {
        const estToolkit = makeEstimationToolkit(toolkit, userAddress);
        const estimates = await estToolkit.estimate.batch(
          allTransferParams.map((tp) => ({ kind: OpKind.TRANSACTION, ...tp }))
        );
        estimatedParams = allTransferParams.map((tp, i) => ({
          ...tp,
          fee: estimates[i].suggestedFeeMutez,
          gasLimit: estimates[i].gasLimit,
          storageLimit: estimates[i].storageLimit,
        }));
      } catch (estimationError) {
        console.warn(
          "[tokenToXtz] Batch fee estimation failed, using wallet defaults:",
          estimationError
        );
      }

      const operations: PartialTezosTransactionOperation[] =
        estimatedParams.map((tp) => transferParamsToBeaconOp(tp));

      const response = await client.requestOperation({
        operationDetails: operations,
      });

      await this.getPoolData(toolkit, true);
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing tokenToXtz:", error);
      throw Errors.TRANSACTION_FAILED;
    }
  }

  private getTokenAddress(token: Token): string {
    return PoolRegistry.getAssetAddress(token);
  }
}
