import { OpKind, TezosToolkit } from "@taquito/taquito";
import {
  AddLiquidityEstimate,
  IPoolAdapter,
  PoolConfig,
  PoolData,
  RemoveLiquidityEstimate,
  SwapEstimate,
} from "../types/pools";
import BigNumber from "bignumber.js";
import { Errors, Token } from "../types/general";
import { PoolRegistry } from "./poolRegistry";
import { PoolDataCache } from "../utils/poolDataCache";

export class SiriusAdapter implements IPoolAdapter {
  private readonly FEE = 999; // 0.1% fee
  private readonly BURN = 999; // 0.1% burned

  constructor(public poolConfig: PoolConfig) {}

  async estimateSwap(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<SwapEstimate> {
    const poolData = await this.getPoolData(toolkit);
    const { tokenAPool: xtzPool, tokenBPool: tokenPool } = poolData;

    const isXtzInput = inputToken === Token.XTZ;
    let outputAmount: BigNumber;

    if (isXtzInput) {
      outputAmount = this.calcXtzToToken(inputAmount, xtzPool, tokenPool);
    } else {
      outputAmount = this.calcTokenToXtz(inputAmount, xtzPool, tokenPool);
    }

    return {
      inputAmount,
      outputAmount,
    };
  }

  async estimateAddLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    tokenAAmount: BigNumber,
    tokenBAmount: BigNumber
  ): Promise<AddLiquidityEstimate> {
    const poolData = await this.getPoolData(toolkit);
    const { tokenAPool: xtzPool, lpTokenSupply: lqtTotal } = poolData;

    const xtzAmount = inputToken === Token.XTZ ? tokenAAmount : tokenBAmount;

    const lpTokenAmount = xtzAmount
      .integerValue(BigNumber.ROUND_DOWN)
      .times(lqtTotal)
      .dividedBy(xtzPool)
      .integerValue(BigNumber.ROUND_DOWN);

    return {
      tokenAAmount,
      tokenBAmount,
      lpTokenAmount,
    };
  }

  async estimateRemoveLiquidity(
    toolkit: TezosToolkit,
    lpTokenAmount: BigNumber
  ): Promise<RemoveLiquidityEstimate> {
    const poolData = await this.getPoolData(toolkit);
    const {
      tokenAPool: xtzPool,
      tokenBPool: tokenPool,
      lpTokenSupply: lqtTotal,
    } = poolData;

    const xtzReceived = lpTokenAmount.times(xtzPool).dividedBy(lqtTotal);
    const tokenReceived = lpTokenAmount.times(tokenPool).dividedBy(lqtTotal);

    return {
      lpTokenAmount,
      tokenAAmount: xtzReceived,
      tokenBAmount: tokenReceived,
    };
  }

  async calculateRequiredTokenForLiquidity(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<BigNumber> {
    try {
      const storage = await this.getPoolData(toolkit);
      const { tokenAPool: xtzPool, tokenBPool: tokenPool } = storage;

      const isXtzInput = inputToken === Token.XTZ;

      if (isXtzInput) {
        // User input XTZ, calculate required token
        // Formula: ceildiv(xtzAmount * tokenPool, xtzPool)
        const numerator = inputAmount.times(tokenPool);
        const requiredToken = numerator
          .dividedBy(xtzPool)
          .integerValue(BigNumber.ROUND_CEIL);

        return requiredToken;
      } else {
        // User input token, calculate required XTZ
        // Formula: ceildiv(tokenAmount * xtzPool, tokenPool)
        const numerator = inputAmount.times(xtzPool);
        const requiredXtz = numerator
          .dividedBy(tokenPool)
          .integerValue(BigNumber.ROUND_DOWN);

        return requiredXtz;
      }
    } catch (error) {
      console.error("Error calculating required token:", error);
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
    const isXtzInput = inputToken === Token.XTZ;

    const minWithSlippage = this.removeSlippage(slippage, minOutputAmount);

    let opHash: string;
    if (isXtzInput) {
      opHash = await this.executeXtzToToken(
        toolkit,
        userAddress,
        inputAmount,
        minWithSlippage
      );
    } else {
      opHash = await this.executeTokenToXtz(
        toolkit,
        userAddress,
        inputAmount,
        minWithSlippage
      );
    }
    await this.getPoolData(toolkit, true);
    return opHash;
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
      const deadline = new Date(Date.now() + 60000).toISOString();
      const tokenAddress = PoolRegistry.getAssetAddress(this.poolConfig.tokenB);

      const lbContract = await toolkit.wallet.at(this.poolConfig.address);
      const tokenContract = await toolkit.wallet.at(tokenAddress);

      // Calculate max tokens with slippage
      const maxTokensSold = this.addSlippage(
        new BigNumber(slippage),
        tokenBAmount
      );

      // Prepare operations
      const approve0 = tokenContract.methods.approve(
        this.poolConfig.address,
        0
      );
      const approve1 = tokenContract.methods.approve(
        this.poolConfig.address,
        maxTokensSold.toNumber()
      );
      const addLiq = lbContract.methods.addLiquidity(
        userAddress,
        minLpTokens.integerValue(BigNumber.ROUND_DOWN).toNumber(),
        maxTokensSold.toNumber(),
        deadline
      );

      const estimate = await toolkit.estimate
        .batch([
          { kind: OpKind.TRANSACTION, ...approve0.toTransferParams() },
          { kind: OpKind.TRANSACTION, ...approve1.toTransferParams() },
          {
            kind: OpKind.TRANSACTION,
            ...addLiq.toTransferParams(),
            amount: tokenAAmount.toNumber(),
            mutez: true,
          },
          { kind: OpKind.TRANSACTION, ...approve0.toTransferParams() },
        ])
        .catch((error) => {
          console.error("Gas estimation failed:", error);
          throw Errors.GAS_ESTIMATION;
        });
      if (!estimate) {
        throw Errors.GAS_ESTIMATION;
      }

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
          ...approve1.toTransferParams({
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

      const batchOp = await batch.send().catch((error) => {
        console.error("Batch send failed:", error);
        throw Errors.TRANSACTION_FAILED;
      });
      await batchOp.confirmation().catch((error) => {
        console.error("Batch confirmation failed:", error);
        throw Errors.TRANSACTION_FAILED;
      });
      await this.getPoolData(toolkit, true);
      return batchOp.opHash;
    } catch (error) {
      if (Object.values(Errors).includes(error as Errors)) {
        throw error;
      }
      throw Errors.INTERNAL;
    }
  }

  async executeRemoveLiquidity(
    toolkit: TezosToolkit,
    userAddress: string,
    lpTokenAmount: BigNumber
  ): Promise<string> {
    try {
      const deadline = new Date(Date.now() + 60000).toISOString();

      // Get expected amounts
      const estimate = await this.estimateRemoveLiquidity(
        toolkit,
        lpTokenAmount
      );

      const lbContract = await toolkit.wallet.at(this.poolConfig.address);

      // Estimate gas
      const gasEstimate = await toolkit.estimate
        .transfer(
          lbContract.methods
            .removeLiquidity(
              userAddress,
              lpTokenAmount.integerValue(BigNumber.ROUND_DOWN).toNumber(),
              estimate.tokenAAmount
                .integerValue(BigNumber.ROUND_DOWN)
                .toNumber(),
              estimate.tokenBAmount
                .integerValue(BigNumber.ROUND_DOWN)
                .toNumber(),
              deadline
            )
            .toTransferParams()
        )
        .catch((error) => {
          console.error("Gas estimation failed:", error);
          throw Errors.GAS_ESTIMATION;
        });

      if (!gasEstimate) {
        throw Errors.GAS_ESTIMATION;
      }

      // Execute
      const op = await lbContract.methods
        .removeLiquidity(
          userAddress,
          lpTokenAmount.integerValue(BigNumber.ROUND_DOWN).toNumber(),
          estimate.tokenAAmount.integerValue(BigNumber.ROUND_DOWN).toNumber(),
          estimate.tokenBAmount.integerValue(BigNumber.ROUND_DOWN).toNumber(),
          deadline
        )
        .send({
          fee: gasEstimate.suggestedFeeMutez,
          gasLimit: gasEstimate.gasLimit,
          storageLimit: gasEstimate.storageLimit,
        })
        .catch((error) => {
          console.error("Transaction send failed:", error);
          throw Errors.TRANSACTION_FAILED;
        });

      await op.confirmation().catch((error) => {
        console.error("Transaction confirmation failed:", error);
        throw Errors.TRANSACTION_FAILED;
      });
      await this.getPoolData(toolkit, true);
      return op.opHash;
    } catch (error) {
      if (Object.values(Errors).includes(error as Errors)) {
        throw error;
      }
      throw Errors.INTERNAL;
    }
  }

  async getPoolData(
    toolkit: TezosToolkit,
    forceRefresh = false
  ): Promise<PoolData> {
    // Try cache first (unless forceRefresh)
    if (!forceRefresh) {
      const cached = PoolDataCache.get(this.poolConfig.id);
      if (cached) {
        return cached;
      }
    }

    const contract = await toolkit.contract.at(this.poolConfig.address);
    // eslint-disable-next-line
    const storage = await contract.storage<any>();

    const poolData: PoolData = storage
      ? {
          tokenAPool: new BigNumber(storage.xtzPool),
          tokenBPool: new BigNumber(storage.tokenPool),
          lpTokenSupply: new BigNumber(storage.lqtTotal),
        }
      : {
          tokenAPool: new BigNumber(0),
          tokenBPool: new BigNumber(0),
          lpTokenSupply: new BigNumber(0),
        };

    // Update cache
    PoolDataCache.set(this.poolConfig.id, poolData);

    return poolData;
  }

  private calcXtzToToken(
    xtzIn: BigNumber,
    xtzPool: BigNumber,
    tokenPool: BigNumber
  ): BigNumber {
    // Step 1: Apply burn to input (0.1%)
    // amount_net_burn = (xtzIn * 999) / 1000
    const amountNetBurn = xtzIn.times(this.BURN).div(1000);

    // Step 2: Calculate tokens bought with fee
    // tokens_bought = (amount_net_burn * 999 * tokenPool) / (xtzPool * 1000 + amount_net_burn * 999)
    const numerator = amountNetBurn.times(this.FEE).times(tokenPool);
    const denominator = xtzPool.times(1000).plus(amountNetBurn.times(this.FEE));

    return numerator.div(denominator).integerValue(BigNumber.ROUND_DOWN);
  }

  private calcTokenToXtz(
    tokenIn: BigNumber,
    xtzPool: BigNumber,
    tokenPool: BigNumber
  ): BigNumber {
    // Step 1: Calculate XTZ bought (before burn)
    // xtz_bought = (tokensSold * 999 * xtzPool) / (tokenPool * 1000 + tokensSold * 999)
    const numerator = tokenIn.times(this.FEE).times(xtzPool);
    const denominator = tokenPool.times(1000).plus(tokenIn.times(this.FEE));
    const xtzBought = numerator.div(denominator);

    // Step 2: Apply burn to output (0.1%)
    // xtz_bought_net_burn = (xtz_bought * 999) / 1000
    const xtzBoughtNetBurn = xtzBought.times(this.BURN).div(1000);

    return xtzBoughtNetBurn.integerValue(BigNumber.ROUND_DOWN);
  }

  private async executeXtzToToken(
    toolkit: TezosToolkit,
    userAddress: string,
    xtzAmount: BigNumber,
    minTokensBought: BigNumber
  ): Promise<string> {
    try {
      const deadline = new Date(Date.now() + 60000).toISOString();
      const lbContract = await toolkit.wallet.at(this.poolConfig.address);

      // Estimate gas
      const estimate = await toolkit.estimate
        .transfer(
          lbContract.methods
            .xtzToToken(userAddress, minTokensBought.toNumber(), deadline)
            .toTransferParams({
              amount: xtzAmount.toNumber(),
              mutez: true,
            })
        )
        .catch((error) => {
          console.error("Gas estimation failed:", error);
          throw Errors.GAS_ESTIMATION;
        });

      if (!estimate) {
        throw Errors.GAS_ESTIMATION;
      }

      const op = await lbContract.methods
        .xtzToToken(userAddress, minTokensBought.toNumber(), deadline)
        .send({
          amount: xtzAmount.toNumber(),
          mutez: true,
          fee: estimate.suggestedFeeMutez,
          gasLimit: estimate.gasLimit,
          storageLimit: estimate.storageLimit,
        })
        .catch((error) => {
          console.error("Transaction send failed:", error);
          throw Errors.TRANSACTION_FAILED;
        });

      await op.confirmation().catch((error) => {
        console.error("Transaction confirmation failed:", error);
        throw Errors.TRANSACTION_FAILED;
      });

      return op.opHash;
    } catch (error) {
      if (Object.values(Errors).includes(error as Errors)) {
        throw error;
      }
      throw Errors.INTERNAL;
    }
  }

  private async executeTokenToXtz(
    toolkit: TezosToolkit,
    userAddress: string,
    tokenAmount: BigNumber,
    minXtzBought: BigNumber
  ): Promise<string> {
    try {
      const deadline = new Date(Date.now() + 60000).toISOString();
      const tokenAddress = PoolRegistry.getAssetAddress(this.poolConfig.tokenB);

      const lbContract = await toolkit.wallet.at(this.poolConfig.address);
      const tokenContract = await toolkit.wallet.at(tokenAddress);

      // Prepare operations
      const approve0 = tokenContract.methods.approve(
        this.poolConfig.address,
        0
      );
      const approve = tokenContract.methods.approve(
        this.poolConfig.address,
        tokenAmount.integerValue(BigNumber.ROUND_DOWN).toNumber()
      );
      const transfer = lbContract.methods.tokenToXtz(
        userAddress,
        tokenAmount.integerValue(BigNumber.ROUND_DOWN).toNumber(),
        minXtzBought.toNumber(),
        deadline
      );

      // Estimate gas
      const estimate = await toolkit.estimate
        .batch([
          { kind: OpKind.TRANSACTION, ...approve0.toTransferParams() },
          { kind: OpKind.TRANSACTION, ...approve.toTransferParams() },
          { kind: OpKind.TRANSACTION, ...transfer.toTransferParams() },
        ])
        .catch((error) => {
          console.error("Gas estimation failed:", error);
          throw Errors.GAS_ESTIMATION;
        });
      if (!estimate) throw Errors.GAS_ESTIMATION;

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
          ...transfer.toTransferParams({
            fee: estimate[2].suggestedFeeMutez,
            gasLimit: estimate[2].gasLimit,
            storageLimit: estimate[2].storageLimit,
          }),
        },
      ]);

      const batchOp = await batch.send().catch((error) => {
        console.error("Batch send failed:", error);
        throw Errors.TRANSACTION_FAILED;
      });
      await batchOp.confirmation().catch((error) => {
        console.error("Batch confirmation failed:", error);
        throw Errors.TRANSACTION_FAILED;
      });
      return batchOp.opHash;
    } catch (error) {
      if (Object.values(Errors).includes(error as Errors)) {
        throw error;
      }
      throw Errors.INTERNAL;
    }
  }

  private removeSlippage(slippage: number, amount: BigNumber): BigNumber {
    return amount
      .minus(amount.times(slippage).div(100))
      .integerValue(BigNumber.ROUND_DOWN);
  }

  private addSlippage(slippage: BigNumber, amount: BigNumber): BigNumber {
    return amount
      .plus(amount.times(slippage).div(100))
      .integerValue(BigNumber.ROUND_DOWN);
  }
}
