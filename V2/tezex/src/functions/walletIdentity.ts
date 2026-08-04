import {
  AccountInfo,
  DAppClient,
  NetworkType,
  RequestOperationInput,
  TezosOperationType,
} from "@airgap/beacon-dapp";
import BigNumber from "bignumber.js";

import {
  Asset,
  Token,
  TokenType,
  Transaction,
  TransactionSubmissionContext,
  TransactingComponent,
} from "../types/general";
import { PoolConfig, PoolType, StablePoolConfig } from "../types/pools";
import { TRANSACTION_DEADLINE_MS } from "./transactionSafety";

const IMPLICIT_ADDRESS_PREFIX = /^tz[1-4]/;
const CONTRACT_ADDRESS_PREFIX = /^KT1/;

export class WalletIdentityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletIdentityError";
  }
}

export interface ConfiguredNetworkIdentity {
  type: NetworkType;
  chainId: string;
  primaryRpcUrl: string;
  allowedRpcUrls: string[];
}

export interface WalletSubmissionRuntime {
  address: string | null;
  accountIdentifier: string | null;
  connectionRevision: number;
  network: ConfiguredNetworkIdentity;
  rpcUrl: string;
  readChainId: () => Promise<string>;
}

export interface GuardedClientOptions {
  client: DAppClient;
  submission: TransactionSubmissionContext;
  transactionNetwork: NetworkType;
  operationPolicy: OperationRequestPolicy;
  getRuntime: () => WalletSubmissionRuntime;
  onMismatch?: (error: WalletIdentityError) => void;
}

type OperatorAction = "add_operator" | "remove_operator";

export interface OperationExpectation {
  destination: string;
  entrypoint: string;
  amount: string;
  parameterValues: string[];
  hasDeadline?: boolean;
  operatorAction?: OperatorAction;
}

export interface OperationRequestPolicy {
  recipient: string;
  allowedDestinations: string[];
  operations: OperationExpectation[];
}

export function canonicalizeRpcUrl(rpcUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(rpcUrl);
  } catch {
    throw new WalletIdentityError("The configured wallet RPC URL is invalid.");
  }

  parsed.hash = "";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "");
  parsed.searchParams.sort();
  return parsed.toString().replace(/\/?$/, "");
}

export function createConfiguredNetworkIdentity(input: {
  type: NetworkType;
  chainId: string;
  primaryRpcUrl: string;
  fallbackRpcUrls?: string[];
}): ConfiguredNetworkIdentity {
  const primaryRpcUrl = canonicalizeRpcUrl(input.primaryRpcUrl);
  const allowedRpcUrls = Array.from(
    new Set(
      [input.primaryRpcUrl, ...(input.fallbackRpcUrls ?? [])].map(
        canonicalizeRpcUrl
      )
    )
  );

  return {
    type: input.type,
    chainId: input.chainId,
    primaryRpcUrl,
    allowedRpcUrls,
  };
}

export function networkIdentityFingerprint(
  identity: ConfiguredNetworkIdentity
): string {
  return [
    identity.type,
    identity.chainId,
    identity.primaryRpcUrl,
    ...identity.allowedRpcUrls,
  ].join("|");
}

export function accountMatchesConfiguredNetwork(
  account: AccountInfo,
  configuredNetwork: ConfiguredNetworkIdentity
): boolean {
  if (account.network.type !== configuredNetwork.type) return false;

  try {
    const accountRpcUrl = account.network.rpcUrl;
    if (configuredNetwork.type === NetworkType.CUSTOM) {
      return Boolean(
        accountRpcUrl &&
          canonicalizeRpcUrl(accountRpcUrl) === configuredNetwork.primaryRpcUrl
      );
    }

    return (
      !accountRpcUrl ||
      configuredNetwork.allowedRpcUrls.includes(
        canonicalizeRpcUrl(accountRpcUrl)
      )
    );
  } catch {
    return false;
  }
}

function assertSubmissionMatchesRuntime(
  submission: TransactionSubmissionContext,
  transactionNetwork: NetworkType,
  runtime: WalletSubmissionRuntime
): void {
  if (!runtime.address || runtime.address !== submission.owner) {
    throw new WalletIdentityError(
      "The active wallet owner changed after this transaction was prepared."
    );
  }
  if (
    !runtime.accountIdentifier ||
    runtime.accountIdentifier !== submission.accountIdentifier
  ) {
    throw new WalletIdentityError(
      "The active wallet connection changed after this transaction was prepared."
    );
  }
  if (runtime.connectionRevision !== submission.connectionRevision) {
    throw new WalletIdentityError(
      "The wallet reconnected after this transaction was prepared."
    );
  }
  if (
    transactionNetwork !== runtime.network.type ||
    submission.networkType !== runtime.network.type ||
    submission.chainId !== runtime.network.chainId ||
    canonicalizeRpcUrl(submission.rpcUrl) !== runtime.network.primaryRpcUrl
  ) {
    throw new WalletIdentityError(
      "The active network changed after this transaction was prepared."
    );
  }

  const runtimeRpcUrl = canonicalizeRpcUrl(runtime.rpcUrl);
  if (!runtime.network.allowedRpcUrls.includes(runtimeRpcUrl)) {
    throw new WalletIdentityError(
      "The active RPC is not part of the configured network."
    );
  }
}

function assertActiveAccount(
  account: AccountInfo | undefined,
  submission: TransactionSubmissionContext,
  runtime: WalletSubmissionRuntime
): asserts account is AccountInfo {
  if (!account) {
    throw new WalletIdentityError("No active Beacon account is available.");
  }
  if (
    account.address !== submission.owner ||
    account.accountIdentifier !== submission.accountIdentifier
  ) {
    throw new WalletIdentityError(
      "Beacon's active signing account does not match the transaction owner."
    );
  }
  if (!accountMatchesConfiguredNetwork(account, runtime.network)) {
    throw new WalletIdentityError(
      "Beacon's active network does not match the configured network."
    );
  }
}

function collectEmbeddedAddresses(
  value: unknown,
  addresses: Set<string>
): void {
  if (typeof value === "string") {
    if (
      IMPLICIT_ADDRESS_PREFIX.test(value) ||
      CONTRACT_ADDRESS_PREFIX.test(value)
    ) {
      addresses.add(value);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectEmbeddedAddresses(entry, addresses));
    return;
  }
  if (value && typeof value === "object") {
    Object.values(value).forEach((entry) =>
      collectEmbeddedAddresses(entry, addresses)
    );
  }
}

const exactNat = (value: BigNumber.Value): string =>
  new BigNumber(value).integerValue(BigNumber.ROUND_DOWN).toFixed(0);

const removeSlippage = (value: BigNumber, slippage: number): string =>
  value
    .times(1 - slippage / 100)
    .integerValue(BigNumber.ROUND_DOWN)
    .toFixed(0);

const addSlippage = (value: BigNumber, slippage: number): string =>
  value
    .times(1 + slippage / 100)
    .integerValue(BigNumber.ROUND_DOWN)
    .toFixed(0);

const findAssetAmount = (
  assets: Transaction["sendAsset"] | Transaction["receiveAsset"],
  amounts: Transaction["sendAmount"] | Transaction["receiveAmount"],
  token: Token,
  field: string
): BigNumber => {
  const index = assets.findIndex((asset) => asset.name === token);
  const amount = index >= 0 ? amounts[index] : undefined;
  if (!amount) {
    throw new WalletIdentityError(
      `The ${field} does not match the selected pool assets.`
    );
  }
  return amount.mantissa;
};

const approvalExpectation = (input: {
  asset: Asset;
  owner: string;
  pool: string;
  amount: BigNumber.Value;
  action?: OperatorAction;
  forceFa12?: boolean;
}): OperationExpectation => {
  const amount = exactNat(input.amount);
  if (input.forceFa12 || input.asset.type === TokenType.FA12) {
    return {
      destination: input.asset.address,
      entrypoint: "approve",
      amount: "0",
      parameterValues: [input.pool, amount],
    };
  }

  return {
    destination: input.asset.address,
    entrypoint: "update_operators",
    amount: "0",
    parameterValues: [
      input.owner,
      input.pool,
      String(input.asset.tokenId ?? 0),
    ],
    operatorAction:
      input.action ?? (amount === "0" ? "remove_operator" : "add_operator"),
  };
};

const poolExpectation = (input: {
  pool: string;
  entrypoint: string;
  amount?: BigNumber.Value;
  parameterValues: BigNumber.Value[];
  hasDeadline?: boolean;
}): OperationExpectation => ({
  destination: input.pool,
  entrypoint: input.entrypoint,
  amount: exactNat(input.amount ?? 0),
  parameterValues: input.parameterValues.map((value) =>
    typeof value === "string" && !/^\d+$/.test(value) ? value : exactNat(value)
  ),
  hasDeadline: input.hasDeadline ?? true,
});

export function createOperationRequestPolicy(
  transaction: Transaction,
  poolConfig: PoolConfig
): OperationRequestPolicy {
  const owner = transaction.submissionContext?.owner;
  if (
    !owner ||
    transaction.submissionContext?.recipient !== poolConfig.address
  ) {
    throw new WalletIdentityError(
      "The transaction operation policy does not match its submission context."
    );
  }

  const pool = poolConfig.address;
  const operations: OperationExpectation[] = [];

  switch (transaction.component) {
    case TransactingComponent.SWAP: {
      const inputAsset = transaction.sendAsset[0];
      const inputAmount = transaction.sendAmount[0]?.mantissa;
      const quotedOutput = transaction.receiveAmount[0]?.mantissa;
      if (!inputAsset || !inputAmount || !quotedOutput) {
        throw new WalletIdentityError(
          "The swap operation policy is missing an asset amount."
        );
      }
      const minimumOutput = removeSlippage(quotedOutput, transaction.slippage);

      if (poolConfig.type === PoolType.STABLE) {
        const stable = poolConfig as StablePoolConfig;
        const inputIsTokenA = inputAsset.name === stable.tokenA;
        const idxFrom = inputIsTokenA ? stable.tokenAIdx : stable.tokenBIdx;
        const idxTo = inputIsTokenA ? stable.tokenBIdx : stable.tokenAIdx;
        const reset = approvalExpectation({
          asset: inputAsset,
          owner,
          pool,
          amount: 0,
        });
        if (inputAsset.type === TokenType.FA12) operations.push(reset);
        operations.push(
          approvalExpectation({
            asset: inputAsset,
            owner,
            pool,
            amount: inputAmount,
          }),
          poolExpectation({
            pool,
            entrypoint: "swap",
            parameterValues: [
              stable.poolId,
              idxFrom,
              idxTo,
              exactNat(inputAmount),
              minimumOutput,
              owner,
            ],
          }),
          reset
        );
        break;
      }

      if (inputAsset.name === Token.XTZ) {
        operations.push(
          poolExpectation({
            pool,
            entrypoint: "xtzToToken",
            amount: inputAmount,
            parameterValues: [owner, minimumOutput],
          })
        );
        break;
      }

      const forceFa12 = poolConfig.type === PoolType.SIRIUS;
      const reset = approvalExpectation({
        asset: inputAsset,
        owner,
        pool,
        amount: 0,
        forceFa12,
      });
      if (forceFa12 || inputAsset.type === TokenType.FA12) {
        operations.push(reset);
      }
      operations.push(
        approvalExpectation({
          asset: inputAsset,
          owner,
          pool,
          amount: inputAmount,
          forceFa12,
        }),
        poolExpectation({
          pool,
          entrypoint: "tokenToXtz",
          parameterValues: [owner, exactNat(inputAmount), minimumOutput],
        })
      );
      break;
    }

    case TransactingComponent.ADD_LIQUIDITY: {
      const tokenAAmount = findAssetAmount(
        transaction.sendAsset,
        transaction.sendAmount,
        poolConfig.tokenA,
        "liquidity deposit"
      );
      const tokenBAmount = findAssetAmount(
        transaction.sendAsset,
        transaction.sendAmount,
        poolConfig.tokenB,
        "liquidity deposit"
      );
      const quotedLp = transaction.receiveAmount[0]?.mantissa;
      if (!quotedLp) {
        throw new WalletIdentityError(
          "The liquidity operation policy is missing its LP-token amount."
        );
      }

      if (poolConfig.type === PoolType.STABLE) {
        const stable = poolConfig as StablePoolConfig;
        const assetA = transaction.sendAsset.find(
          (asset) => asset.name === stable.tokenA
        );
        const assetB = transaction.sendAsset.find(
          (asset) => asset.name === stable.tokenB
        );
        if (!assetA || !assetB) {
          throw new WalletIdentityError(
            "The stable-liquidity policy is missing a pool asset."
          );
        }
        const resetA = approvalExpectation({
          asset: assetA,
          owner,
          pool,
          amount: 0,
        });
        const resetB = approvalExpectation({
          asset: assetB,
          owner,
          pool,
          amount: 0,
        });
        if (assetA.type === TokenType.FA12) operations.push(resetA);
        if (assetB.type === TokenType.FA12) operations.push(resetB);
        operations.push(
          approvalExpectation({
            asset: assetA,
            owner,
            pool,
            amount: tokenAAmount,
          }),
          approvalExpectation({
            asset: assetB,
            owner,
            pool,
            amount: tokenBAmount,
          }),
          poolExpectation({
            pool,
            entrypoint: "invest",
            parameterValues: [
              stable.poolId,
              removeSlippage(quotedLp, transaction.slippage),
              stable.tokenAIdx,
              exactNat(tokenAAmount),
              stable.tokenBIdx,
              exactNat(tokenBAmount),
            ],
          }),
          resetA,
          resetB
        );
        break;
      }

      const tokenAsset = transaction.sendAsset.find(
        (asset) => asset.name === poolConfig.tokenB
      );
      if (!tokenAsset) {
        throw new WalletIdentityError(
          "The liquidity operation policy is missing the pool token."
        );
      }
      const forceFa12 = poolConfig.type === PoolType.SIRIUS;
      const reset = approvalExpectation({
        asset: tokenAsset,
        owner,
        pool,
        amount: 0,
        forceFa12,
      });
      if (forceFa12 || tokenAsset.type === TokenType.FA12) {
        operations.push(reset);
      }
      const maximumTokenAmount = addSlippage(
        tokenBAmount,
        transaction.slippage
      );
      const minimumLp =
        poolConfig.type === PoolType.SIRIUS
          ? exactNat(quotedLp)
          : removeSlippage(quotedLp, transaction.slippage);
      operations.push(
        approvalExpectation({
          asset: tokenAsset,
          owner,
          pool,
          amount: maximumTokenAmount,
          forceFa12,
        }),
        poolExpectation({
          pool,
          entrypoint: "addLiquidity",
          amount: tokenAAmount,
          parameterValues: [owner, minimumLp, maximumTokenAmount],
        }),
        reset
      );
      break;
    }

    case TransactingComponent.REMOVE_LIQUIDITY: {
      const lpAmount = transaction.sendAmount[0]?.mantissa;
      if (!lpAmount) {
        throw new WalletIdentityError(
          "The withdrawal operation policy is missing its LP-token amount."
        );
      }
      const tokenAMinimum = removeSlippage(
        findAssetAmount(
          transaction.receiveAsset,
          transaction.receiveAmount,
          poolConfig.tokenA,
          "liquidity withdrawal"
        ),
        transaction.slippage
      );
      const tokenBMinimum = removeSlippage(
        findAssetAmount(
          transaction.receiveAsset,
          transaction.receiveAmount,
          poolConfig.tokenB,
          "liquidity withdrawal"
        ),
        transaction.slippage
      );

      if (poolConfig.type === PoolType.STABLE) {
        const stable = poolConfig as StablePoolConfig;
        operations.push(
          poolExpectation({
            pool,
            entrypoint: "divest",
            parameterValues: [
              stable.poolId,
              exactNat(lpAmount),
              stable.tokenAIdx,
              tokenAMinimum,
              stable.tokenBIdx,
              tokenBMinimum,
            ],
          })
        );
      } else {
        operations.push(
          poolExpectation({
            pool,
            entrypoint: "removeLiquidity",
            parameterValues: [
              owner,
              exactNat(lpAmount),
              tokenAMinimum,
              tokenBMinimum,
            ],
          })
        );
      }
      break;
    }
  }

  return {
    recipient: pool,
    allowedDestinations: Array.from(
      new Set([pool, ...operations.map((operation) => operation.destination)])
    ),
    operations,
  };
}

const collectParameterScalars = (value: unknown, scalars: string[]): void => {
  if (BigNumber.isBigNumber(value)) {
    scalars.push(value.toFixed());
    return;
  }
  if (value instanceof Date) {
    scalars.push(value.toISOString());
    return;
  }
  if (value instanceof Map) {
    value.forEach((entryValue, key) => {
      collectParameterScalars(key, scalars);
      collectParameterScalars(entryValue, scalars);
    });
    return;
  }
  if (typeof value === "string" || typeof value === "number") {
    scalars.push(String(value));
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry) => collectParameterScalars(entry, scalars));
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  if (typeof record.int === "string") {
    scalars.push(record.int);
    return;
  }
  if (typeof record.string === "string") {
    scalars.push(record.string);
    return;
  }
  if (typeof record.bytes === "string") {
    scalars.push(record.bytes);
    return;
  }
  if (typeof record.prim === "string") {
    collectParameterScalars(record.args, scalars);
    return;
  }
  Object.values(record).forEach((entry) =>
    collectParameterScalars(entry, scalars)
  );
};

const isCurrentDeadline = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    return false;
  }
  const deadline = Date.parse(value);
  const now = Date.now();
  return (
    Number.isFinite(deadline) &&
    deadline >= now - 60_000 &&
    deadline <= now + TRANSACTION_DEADLINE_MS + 60_000
  );
};

const sameScalarMultiset = (actual: string[], expected: string[]): boolean =>
  actual.length === expected.length &&
  [...actual]
    .sort()
    .every((value, index) => value === [...expected].sort()[index]);

const findOperatorAction = (value: unknown): OperatorAction | undefined => {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const action = findOperatorAction(entry);
      if (action) return action;
    }
    return undefined;
  }
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if ("add_operator" in record) return "add_operator";
  if ("remove_operator" in record) return "remove_operator";
  if (record.prim === "Left") return "add_operator";
  if (record.prim === "Right") return "remove_operator";
  return findOperatorAction(record.args);
};

export function assertOperationRequestMatchesSubmission(
  request: RequestOperationInput,
  submission: TransactionSubmissionContext,
  policy: OperationRequestPolicy
): void {
  const allowed = new Set(policy.allowedDestinations);
  if (
    policy.recipient !== submission.recipient ||
    !allowed.has(submission.recipient)
  ) {
    throw new WalletIdentityError(
      "The transaction recipient is not part of the active pool configuration."
    );
  }
  if (request.operationDetails.length !== policy.operations.length) {
    throw new WalletIdentityError(
      "The operation batch length does not match the prepared transaction."
    );
  }

  request.operationDetails.forEach((operation, index) => {
    const expected = policy.operations[index];
    if (operation.kind !== TezosOperationType.TRANSACTION) {
      throw new WalletIdentityError(
        "TEZEX refused an unexpected non-transaction wallet operation."
      );
    }
    if (
      !expected ||
      operation.destination !== expected.destination ||
      !allowed.has(operation.destination)
    ) {
      throw new WalletIdentityError(
        "A wallet operation target or order does not match the prepared transaction."
      );
    }
    if (String(operation.amount) !== expected.amount) {
      throw new WalletIdentityError(
        "A wallet operation amount does not match the prepared transaction."
      );
    }
    if (
      operation.parameters?.entrypoint !== expected.entrypoint ||
      operation.parameters?.value === undefined
    ) {
      throw new WalletIdentityError(
        "A wallet operation entrypoint does not match the prepared transaction."
      );
    }

    const parameterScalars: string[] = [];
    collectParameterScalars(operation.parameters.value, parameterScalars);
    const deadlines = parameterScalars.filter(isCurrentDeadline);
    const ordinaryScalars = parameterScalars.filter(
      (value) => !isCurrentDeadline(value)
    );
    if (
      deadlines.length !== (expected.hasDeadline ? 1 : 0) ||
      !sameScalarMultiset(ordinaryScalars, expected.parameterValues)
    ) {
      throw new WalletIdentityError(
        "Wallet operation parameters do not match the prepared transaction."
      );
    }
    if (
      expected.operatorAction &&
      findOperatorAction(operation.parameters.value) !== expected.operatorAction
    ) {
      throw new WalletIdentityError(
        "An FA2 operator update does not match the prepared transaction."
      );
    }

    const embeddedAddresses = new Set<string>();
    collectEmbeddedAddresses(operation.parameters, embeddedAddresses);
    embeddedAddresses.forEach((address) => {
      if (IMPLICIT_ADDRESS_PREFIX.test(address)) {
        if (address !== submission.owner) {
          throw new WalletIdentityError(
            "A transaction recipient or approval owner does not match the active account."
          );
        }
      } else if (!allowed.has(address)) {
        throw new WalletIdentityError(
          "A transaction parameter contains an unexpected contract address."
        );
      }
    });
  });
}

function runtimeFingerprint(runtime: WalletSubmissionRuntime): string {
  return [
    runtime.address,
    runtime.accountIdentifier,
    runtime.connectionRevision,
    networkIdentityFingerprint(runtime.network),
    canonicalizeRpcUrl(runtime.rpcUrl),
  ].join("|");
}

export function createGuardedDAppClient({
  client,
  submission,
  transactionNetwork,
  operationPolicy,
  getRuntime,
  onMismatch,
}: GuardedClientOptions): DAppClient {
  const guardedClient = Object.create(client) as DAppClient;

  guardedClient.requestOperation = async (request) => {
    try {
      const runtimeBefore = getRuntime();
      assertSubmissionMatchesRuntime(
        submission,
        transactionNetwork,
        runtimeBefore
      );

      const accountBefore = await client.getActiveAccount();
      assertActiveAccount(accountBefore, submission, runtimeBefore);

      const chainId = await runtimeBefore.readChainId();
      if (chainId !== runtimeBefore.network.chainId) {
        throw new WalletIdentityError(
          "The configured RPC returned an unexpected chain ID."
        );
      }

      const accountImmediatelyBeforeRequest = await client.getActiveAccount();
      const runtimeImmediatelyBeforeRequest = getRuntime();
      if (
        runtimeFingerprint(runtimeImmediatelyBeforeRequest) !==
        runtimeFingerprint(runtimeBefore)
      ) {
        throw new WalletIdentityError(
          "The wallet account or network changed during transaction preparation."
        );
      }
      assertSubmissionMatchesRuntime(
        submission,
        transactionNetwork,
        runtimeImmediatelyBeforeRequest
      );
      assertActiveAccount(
        accountImmediatelyBeforeRequest,
        submission,
        runtimeImmediatelyBeforeRequest
      );
      assertOperationRequestMatchesSubmission(
        request,
        submission,
        operationPolicy
      );

      return await client.requestOperation(request);
    } catch (error) {
      if (error instanceof WalletIdentityError) onMismatch?.(error);
      throw error;
    }
  };

  return guardedClient;
}
