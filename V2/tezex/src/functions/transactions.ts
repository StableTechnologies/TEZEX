import { BigNumber } from "bignumber.js";
import {
  Errors,
  SuccessRecord,
  Transaction,
  Token,
  TransactingComponent,
  ExecutionKit,
  TokenType,
  Asset,
} from "../types/general";
import {
  ContractAbstraction,
  ContractProvider,
  TransferParams,
} from "@taquito/taquito";
import { PoolRegistry } from "../adapters/poolRegistry";
import { IPoolAdapter } from "../types/pools";
import {
  PartialTezosTransactionOperation,
  TezosOperationType,
} from "@airgap/beacon-sdk";

const MUTEZ_IN_TEZ = 1_000_000;

export async function processTransaction(
  transaction: Transaction,
  userAddress: string,
  kit: ExecutionKit
): Promise<SuccessRecord> {
  const adapter = PoolRegistry.getAdapter(transaction.poolId);

  switch (transaction.component) {
    case TransactingComponent.SWAP:
      return await swapTransaction(transaction, userAddress, kit, adapter);
    case TransactingComponent.ADD_LIQUIDITY:
      return await addLiquidityTransaction(
        transaction,
        userAddress,
        kit,
        adapter
      );
    case TransactingComponent.REMOVE_LIQUIDITY:
      return await removeLiquidityTransaction(
        transaction,
        userAddress,
        kit,
        adapter
      );
  }
}

const swapTransaction = async (
  transaction: Transaction,
  userAddress: string,
  kit: ExecutionKit,
  adapter: IPoolAdapter
): Promise<SuccessRecord> => {
  const inputToken = transaction.sendAsset[0].name as Token;
  const inputAmount = transaction.sendAmount[0].mantissa;
  const minOutputAmount = transaction.receiveAmount[0].mantissa;
  const slippage = transaction.slippage;

  const opHash = await adapter.executeSwap(
    kit,
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
  kit: ExecutionKit,
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
    kit,
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
  kit: ExecutionKit,
  adapter: IPoolAdapter
): Promise<SuccessRecord> => {
  const lpTokenAmount = transaction.sendAmount[0].mantissa;

  const opHash = await adapter.executeRemoveLiquidity(
    kit,
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
  USDt: 6,
  LP_XTZUSDt: 6,
  BTCtz: 8,
  LP_XTZBTCtz: 8,
  ETHtz: 18,
  LP_XTZETHtz: 12,
  LP_tzBTCBTCtz: 18,
  LP_USDtzUSDt: 18,
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

/**
 * Convert Taquito TransferParams to Beacon TezosTransactionOperation
 */
export function transferParamsToBeaconOp(
  transferParams: TransferParams
): PartialTezosTransactionOperation {
  // Convert amount to mutez string
  const amountInMutez = transferParams.mutez
    ? transferParams.amount.toString()
    : (transferParams.amount * MUTEZ_IN_TEZ).toString();

  const operation: PartialTezosTransactionOperation = {
    kind: TezosOperationType.TRANSACTION,
    destination: transferParams.to,
    amount: amountInMutez,
  };

  // Add optional fields if present
  if (transferParams.parameter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    operation.parameters = transferParams.parameter as any;
  }

  if (transferParams.fee !== undefined) {
    operation.fee = transferParams.fee.toString();
  }

  if (transferParams.gasLimit !== undefined) {
    operation.gas_limit = transferParams.gasLimit.toString();
  }

  if (transferParams.storageLimit !== undefined) {
    operation.storage_limit = transferParams.storageLimit.toString();
  }

  return operation;
}

interface BuildApproveOpParams {
  tokenContract: ContractAbstraction<ContractProvider>;
  token: Asset;
  ownerAddress: string;
  spenderAddress: string;
  amount: number; // For FA2 tokens, this will be 0 for revocation and any other number for approval.
}

export function buildApproveOp(params: BuildApproveOpParams): TransferParams {
  if (params.token.type === TokenType.FA12) {
    return params.tokenContract.methodsObject
      .approve({ spender: params.spenderAddress, value: params.amount })
      .toTransferParams();
  }

  const operatorParam = {
    owner: params.ownerAddress,
    operator: params.spenderAddress,
    token_id: params.token.tokenId,
  };

  const action = params.amount === 0 ? "remove_operator" : "add_operator";

  return params.tokenContract.methodsObject
    .update_operators([{ [action]: operatorParam }])
    .toTransferParams();
}
