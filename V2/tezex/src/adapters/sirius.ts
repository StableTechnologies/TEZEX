import { TezosToolkit } from "@taquito/taquito";
import {
  AddLiquidityEstimate,
  IPoolAdapter,
  PoolConfig,
  PoolData,
  RemoveLiquidityEstimate,
  SwapEstimate,
  isSupportedPoolConfiguration,
} from "../types/pools";
import BigNumber from "bignumber.js";
import { ExecutionKit, Token } from "../types/general";
import { PoolRegistry } from "./poolRegistry";
import { PoolDataCache } from "../utils/poolDataCache";
import { getTxDeadline } from "../functions/util";
import { DAppClient } from "@airgap/beacon-dapp";
import { transferParamsToBeaconOp } from "../functions/transactions";
import { isValidSlippage } from "../functions/transactionSafety";

interface SiriusStorage {
  xtzPool: BigNumber.Value;
  tokenPool: BigNumber.Value;
  lqtTotal: BigNumber.Value;
  tokenAddress: string;
  lqtAddress: string;
}

export class SiriusAdapter implements IPoolAdapter {
  private readonly FEE = 999; // 0.1% fee
  private readonly BURN = 999; // 0.1% burned

  constructor(public poolConfig: PoolConfig) {
    if (!isSupportedPoolConfiguration(poolConfig)) {
      throw new Error("Sirius supports only the direct XTZ/tzBTC pool");
    }
  }

  async estimateSwap(
    toolkit: TezosToolkit,
    inputToken: Token,
    inputAmount: BigNumber
  ): Promise<SwapEstimate> {
    this.assertSupportedInputToken(inputToken);
    this.assertPositiveInteger("swap input", inputAmount);
    const poolData = await this.getPoolData(toolkit);
    this.assertActivePool(poolData);
    const { tokenAPool: xtzPool, tokenBPool: tokenPool } = poolData;

    const isXtzInput = inputToken === Token.XTZ;
    let outputAmount: BigNumber;

    if (isXtzInput) {
      outputAmount = this.calcXtzToToken(inputAmount, xtzPool, tokenPool);
    } else {
      outputAmount = this.calcTokenToXtz(inputAmount, xtzPool, tokenPool);
    }
    this.assertPositiveInteger("swap output", outputAmount);

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
    this.assertSupportedInputToken(inputToken);
    this.assertPositiveInteger("first liquidity amount", tokenAAmount);
    this.assertPositiveInteger("second liquidity amount", tokenBAmount);
    const poolData = await this.getPoolData(toolkit);
    this.assertActivePool(poolData);
    const { tokenAPool: xtzPool, lpTokenSupply: lqtTotal } = poolData;

    const xtzAmount = inputToken === Token.XTZ ? tokenAAmount : tokenBAmount;

    const lpTokenAmount = xtzAmount
      .integerValue(BigNumber.ROUND_DOWN)
      .times(lqtTotal)
      .dividedBy(xtzPool)
      .integerValue(BigNumber.ROUND_DOWN);
    this.assertPositiveInteger("SIRS minted", lpTokenAmount);

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
    this.assertPositiveInteger("SIRS burned", lpTokenAmount);
    const poolData = await this.getPoolData(toolkit);
    this.assertActivePool(poolData);
    const {
      tokenAPool: xtzPool,
      tokenBPool: tokenPool,
      lpTokenSupply: lqtTotal,
    } = poolData;

    const xtzReceived = lpTokenAmount
      .times(xtzPool)
      .dividedBy(lqtTotal)
      .integerValue(BigNumber.ROUND_DOWN);
    const tokenReceived = lpTokenAmount
      .times(tokenPool)
      .dividedBy(lqtTotal)
      .integerValue(BigNumber.ROUND_DOWN);
    this.assertPositiveInteger("XTZ withdrawn", xtzReceived);
    this.assertPositiveInteger("tzBTC withdrawn", tokenReceived);

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
      this.assertSupportedInputToken(inputToken);
      this.assertPositiveInteger("liquidity input", inputAmount);
      const storage = await this.getPoolData(toolkit);
      this.assertActivePool(storage);
      const { tokenAPool: xtzPool, tokenBPool: tokenPool } = storage;

      const isXtzInput = inputToken === Token.XTZ;

      if (isXtzInput) {
        // User input XTZ, calculate required token
        // Formula: ceildiv(xtzAmount * tokenPool, xtzPool)
        const numerator = inputAmount.times(tokenPool);
        const requiredToken = numerator
          .dividedBy(xtzPool)
          .integerValue(BigNumber.ROUND_CEIL);

        this.assertPositiveInteger("required tzBTC", requiredToken);
        return requiredToken;
      } else {
        // User input token, calculate required XTZ
        // Formula: floordiv(tokenAmount * xtzPool, tokenPool)
        const numerator = inputAmount.times(xtzPool);
        const requiredXtz = numerator
          .dividedBy(tokenPool)
          .integerValue(BigNumber.ROUND_DOWN);

        this.assertPositiveInteger("required XTZ", requiredXtz);
        return requiredXtz;
      }
    } catch (error) {
      console.error("Error calculating required token:", error);
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
    this.assertSupportedInputToken(inputToken);
    this.assertPositiveInteger("swap input", inputAmount);
    this.assertPositiveInteger("quoted swap output", minOutputAmount);
    this.assertValidSlippage(slippage);
    const isXtzInput = inputToken === Token.XTZ;

    const minWithSlippage = this.removeSlippage(slippage, minOutputAmount);
    this.assertPositiveInteger("minimum swap output", minWithSlippage);

    let opHash: string;
    if (isXtzInput) {
      opHash = await this.executeXtzToToken(
        client,
        toolkit,
        userAddress,
        inputAmount,
        minWithSlippage
      );
    } else {
      opHash = await this.executeTokenToXtz(
        client,
        toolkit,
        userAddress,
        inputAmount,
        minWithSlippage
      );
    }
    void this.getPoolData(toolkit, true).catch((error) => {
      console.warn("Post-submit Sirius pool refresh failed:", error);
    });
    return opHash;
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
      this.assertPositiveInteger("XTZ deposit", tokenAAmount);
      this.assertPositiveInteger("tzBTC deposit", tokenBAmount);
      this.assertPositiveInteger("quoted SIRS", minLpTokens);
      this.assertValidSlippage(slippage);
      const deadline = getTxDeadline().toISOString();
      const tokenAddress = PoolRegistry.getAssetAddress(this.poolConfig.tokenB);

      // Calculate max tokens with slippage
      const maxTokensSold = this.addSlippage(
        new BigNumber(slippage),
        tokenBAmount
      );
      const minLqtMinted = this.removeSlippage(slippage, minLpTokens);
      this.assertPositiveInteger("maximum tzBTC deposit", maxTokensSold);
      this.assertPositiveInteger("minimum SIRS minted", minLqtMinted);

      const lbContract = await toolkit.contract.at(this.poolConfig.address);
      const tokenContract = await toolkit.contract.at(tokenAddress);

      // Prepare operations
      const approve0 = tokenContract.methodsObject.approve({
        spender: this.poolConfig.address,
        value: 0,
      });
      const approve1 = tokenContract.methodsObject.approve({
        spender: this.poolConfig.address,
        value: this.toSafeNumber("maximum tzBTC deposit", maxTokensSold),
      });
      const addLiq = lbContract.methodsObject.addLiquidity({
        owner: userAddress,
        minLqtMinted: this.toSafeNumber("minimum SIRS minted", minLqtMinted),
        maxTokensDeposited: this.toSafeNumber(
          "maximum tzBTC deposit",
          maxTokensSold
        ),
        deadline,
      });

      // Convert to Beacon format
      const operations = [
        transferParamsToBeaconOp(approve0.toTransferParams()),
        transferParamsToBeaconOp(approve1.toTransferParams()),
        transferParamsToBeaconOp(
          addLiq.toTransferParams({
            amount: this.toSafeNumber("XTZ deposit", tokenAAmount),
            mutez: true,
          })
        ),
        transferParamsToBeaconOp(approve0.toTransferParams()),
      ];
      const response = await client.requestOperation({
        operationDetails: operations,
      });

      void this.getPoolData(toolkit, true).catch((error) => {
        console.warn("Post-submit Sirius pool refresh failed:", error);
      });
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing Sirius add liquidity:", error);
      throw error;
    }
  }

  async executeRemoveLiquidity(
    kit: ExecutionKit,
    userAddress: string,
    lpTokenAmount: BigNumber,
    slippage: number
  ): Promise<string> {
    const { client, toolkit } = kit;
    try {
      this.assertPositiveInteger("SIRS burned", lpTokenAmount);
      this.assertValidSlippage(slippage);
      // Entrypoint signature:
      // removeLiquidity(address to, nat lqtBurned, mutez minXtzWithdrawn, nat minTokensWithdrawn, timestamp deadline)
      const deadline = getTxDeadline().toISOString();

      // Get expected amounts
      const estimate = await this.estimateRemoveLiquidity(
        toolkit,
        lpTokenAmount
      );

      const lbContract = await toolkit.wallet.at(this.poolConfig.address);

      const minXtzWithdrawn = this.removeSlippage(
        slippage,
        estimate.tokenAAmount
      );
      const minTokensWithdrawn = this.removeSlippage(
        slippage,
        estimate.tokenBAmount
      );
      this.assertPositiveInteger("minimum XTZ withdrawn", minXtzWithdrawn);
      this.assertPositiveInteger("minimum tzBTC withdrawn", minTokensWithdrawn);

      const operation = lbContract.methodsObject.removeLiquidity({
        to: userAddress,
        lqtBurned: this.toSafeNumber("SIRS burned", lpTokenAmount),
        minXtzWithdrawn: this.toSafeNumber(
          "minimum XTZ withdrawn",
          minXtzWithdrawn
        ),
        minTokensWithdrawn: this.toSafeNumber(
          "minimum tzBTC withdrawn",
          minTokensWithdrawn
        ),
        deadline,
      });
      // Execute
      const operationRequest = transferParamsToBeaconOp(
        operation.toTransferParams()
      );
      const response = await client.requestOperation({
        operationDetails: [operationRequest],
      });

      void this.getPoolData(toolkit, true).catch((error) => {
        console.warn("Post-submit Sirius pool refresh failed:", error);
      });
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing Sirius remove liquidity:", error);
      throw error;
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
    const storage = await contract.storage<SiriusStorage>();

    if (storage) {
      this.assertStorageAddress(
        "underlying token",
        storage.tokenAddress,
        PoolRegistry.getAssetAddress(this.poolConfig.tokenB)
      );
      this.assertStorageAddress(
        "SIRS",
        storage.lqtAddress,
        PoolRegistry.getAssetAddress(this.poolConfig.lpToken)
      );
    }

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
    const amountNetBurn = xtzIn
      .times(this.BURN)
      .div(1000)
      .integerValue(BigNumber.ROUND_DOWN);

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
    const xtzBought = numerator
      .div(denominator)
      .integerValue(BigNumber.ROUND_DOWN);

    // Step 2: Apply burn to output (0.1%)
    // xtz_bought_net_burn = (xtz_bought * 999) / 1000
    const xtzBoughtNetBurn = xtzBought.times(this.BURN).div(1000);

    return xtzBoughtNetBurn.integerValue(BigNumber.ROUND_DOWN);
  }

  private async executeXtzToToken(
    client: DAppClient,
    toolkit: TezosToolkit,
    userAddress: string,
    xtzAmount: BigNumber,
    minTokensBought: BigNumber
  ): Promise<string> {
    try {
      const deadline = getTxDeadline().toISOString();
      // Entrypoint signature:
      // xtzToToken(address to, nat minTokensBought, timestamp deadline)
      const lbContract = await toolkit.contract.at(this.poolConfig.address);

      const operation = lbContract.methodsObject.xtzToToken({
        to: userAddress,
        minTokensBought: this.toSafeNumber(
          "minimum tzBTC bought",
          minTokensBought
        ),
        deadline,
      });

      // Convert to Beacon format
      const operationRequest = transferParamsToBeaconOp(
        operation.toTransferParams({
          amount: this.toSafeNumber("XTZ sold", xtzAmount),
          mutez: true,
        })
      );
      const response = await client.requestOperation({
        operationDetails: [operationRequest],
      });

      return response.transactionHash;
    } catch (error) {
      console.error("Error executing Sirius XTZ-to-token swap:", error);
      throw error;
    }
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
      // Entrypoint signature:
      // tokenToXtz(address to, nat tokensSold, mutez minXtzBought, timestamp deadline)
      const tokenAddress = PoolRegistry.getAssetAddress(this.poolConfig.tokenB);

      const lbContract = await toolkit.contract.at(this.poolConfig.address);
      const tokenContract = await toolkit.contract.at(tokenAddress);

      // Prepare operations
      const approve0 = tokenContract.methodsObject.approve({
        spender: this.poolConfig.address,
        value: 0,
      });
      const approve = tokenContract.methodsObject.approve({
        spender: this.poolConfig.address,
        value: this.toSafeNumber("tzBTC sold", tokenAmount),
      });
      const transfer = lbContract.methodsObject.tokenToXtz({
        to: userAddress,
        tokensSold: this.toSafeNumber("tzBTC sold", tokenAmount),
        minXtzBought: this.toSafeNumber("minimum XTZ bought", minXtzBought),
        deadline,
      });

      // Convert to Beacon format
      const operations = [
        transferParamsToBeaconOp(approve0.toTransferParams()),
        transferParamsToBeaconOp(approve.toTransferParams()),
        transferParamsToBeaconOp(transfer.toTransferParams()),
        transferParamsToBeaconOp(approve0.toTransferParams()),
      ];
      const response = await client.requestOperation({
        operationDetails: operations,
      });
      return response.transactionHash;
    } catch (error) {
      console.error("Error executing Sirius token-to-XTZ swap:", error);
      throw error;
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

  private assertSupportedInputToken(inputToken: Token): void {
    if (inputToken !== Token.XTZ && inputToken !== Token.TzBTC) {
      throw new Error(`Unsupported Sirius input token: ${inputToken}`);
    }
  }

  private assertPositiveInteger(name: string, value: BigNumber): void {
    if (!value.isFinite() || !value.isInteger() || value.lte(0)) {
      throw new Error(`${name} must be a positive integer`);
    }
  }

  private assertActivePool(poolData: PoolData): void {
    this.assertPositiveInteger("Sirius XTZ reserve", poolData.tokenAPool);
    this.assertPositiveInteger("Sirius tzBTC reserve", poolData.tokenBPool);
    this.assertPositiveInteger("Sirius SIRS supply", poolData.lpTokenSupply);
  }

  private assertValidSlippage(slippage: number): void {
    if (!isValidSlippage(slippage)) {
      throw new Error("Sirius slippage tolerance is outside safe limits");
    }
  }

  private assertStorageAddress(
    name: string,
    actual: string,
    expected: string
  ): void {
    if (actual !== expected) {
      throw new Error(
        `Sirius ${name} storage mismatch: expected ${expected}, received ${actual}`
      );
    }
  }

  private toSafeNumber(name: string, value: BigNumber): number {
    this.assertPositiveInteger(name, value);
    if (value.gt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`${name} exceeds the exact JavaScript integer range`);
    }
    return value.toNumber();
  }
}
