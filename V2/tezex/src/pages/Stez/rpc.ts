import { NetworkInfo } from "../../contexts/network";

export const USHUAIA_PROTOCOL =
  "PsUshuai9QapM5TGj1JpuVGkdxz5GykdnEvS6Rh8SUVrARvZLCY";

export type StezAvailability =
  | "available"
  | "disabled"
  | "unsupported"
  | "unreachable";

export interface StezSnapshot {
  availability: StezAvailability;
  endpoint: string;
  chainId: string;
  protocolHash: string;
  blockHash: string;
  blockLevel: bigint;
  blockTimestamp: string;
  contractHash: string | null;
  totalSupplyUnits: bigint | null;
  totalBackingMutez: bigint | null;
  rateNumeratorMutez: bigint | null;
  rateDenominatorTokenUnits: bigint | null;
  walletXtzMutez: bigint | null;
  walletStezUnits: bigint | null;
  redeemedFrozenMutez: bigint | null;
  redeemedFinalizableMutez: bigint | null;
  checkedAt: number;
  detail: string;
}

interface RpcErrorDetails {
  status: number;
  body: string;
}

class RpcResponseError extends Error {
  status: number;
  body: string;

  constructor(details: RpcErrorDetails) {
    super(`Tezos RPC request failed (${details.status})`);
    this.status = details.status;
    this.body = details.body;
  }
}

interface BlockHeader {
  level: number;
  timestamp: string;
}

interface BlockProtocols {
  protocol: string;
}

interface ExchangeRate {
  numerator: string | number;
  denominator: string | number;
}

interface ContractEntrypoints {
  entrypoints?: Record<
    string,
    { prim?: string; args?: unknown[]; annots?: string[] }
  >;
}

const normalizeEndpoint = (endpoint: string) => endpoint.replace(/\/+$/, "");

const endpointsFor = (info: NetworkInfo) =>
  Array.from(
    new Set(
      [info.tezosServer, ...(info.rpcFallbacks ?? [])].map(normalizeEndpoint)
    )
  );

const parseBody = <T>(body: string): T => {
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error("Tezos RPC returned an invalid response");
  }
};

const fetchRpc = async <T>(
  endpoint: string,
  path: string,
  signal?: AbortSignal
): Promise<T> => {
  const response = await fetch(`${endpoint}${path}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  const body = await response.text();
  if (!response.ok) {
    throw new RpcResponseError({ status: response.status, body });
  }
  return parseBody<T>(body);
};

const isTransportFailure = (error: unknown) => {
  if (error instanceof RpcResponseError) {
    return error.status === 408 || error.status === 429 || error.status >= 500;
  }
  return true;
};

const isFeatureDisabled = (error: unknown) =>
  error instanceof RpcResponseError &&
  (error.body.includes("non_activated_feature") ||
    error.body.includes('"feature":"stez"'));

const toBigInt = (value: string | number | bigint): bigint => {
  if (typeof value === "bigint") return value;
  return BigInt(String(value));
};

const hasCompatibleTransactionEntrypoints = (response: ContractEntrypoints) => {
  const entrypoints = response.entrypoints;
  return (
    entrypoints?.deposit?.prim === "unit" &&
    entrypoints?.redeem?.prim === "nat" &&
    entrypoints?.finalize_redeem?.prim === "key_hash"
  );
};

const unavailableSnapshot = (
  availability: Exclude<StezAvailability, "available">,
  metadata: Pick<
    StezSnapshot,
    | "endpoint"
    | "chainId"
    | "protocolHash"
    | "blockHash"
    | "blockLevel"
    | "blockTimestamp"
  >,
  detail: string
): StezSnapshot => ({
  availability,
  ...metadata,
  contractHash: null,
  totalSupplyUnits: null,
  totalBackingMutez: null,
  rateNumeratorMutez: null,
  rateDenominatorTokenUnits: null,
  walletXtzMutez: null,
  walletStezUnits: null,
  redeemedFrozenMutez: null,
  redeemedFinalizableMutez: null,
  checkedAt: Date.now(),
  detail,
});

const connectToNetwork = async (info: NetworkInfo, signal?: AbortSignal) => {
  let lastError: unknown;

  for (const endpoint of endpointsFor(info)) {
    try {
      const chainId = await fetchRpc<string>(
        endpoint,
        "/chains/main/chain_id",
        signal
      );
      if (chainId !== info.chainId) continue;

      const blockHash = await fetchRpc<string>(
        endpoint,
        "/chains/main/blocks/head/hash",
        signal
      );
      const [protocols, header] = await Promise.all([
        fetchRpc<BlockProtocols>(
          endpoint,
          `/chains/main/blocks/${blockHash}/protocols`,
          signal
        ),
        fetchRpc<BlockHeader>(
          endpoint,
          `/chains/main/blocks/${blockHash}/header`,
          signal
        ),
      ]);

      return {
        endpoint,
        chainId,
        protocolHash: protocols.protocol,
        blockHash,
        blockLevel: BigInt(header.level),
        blockTimestamp: header.timestamp,
      };
    } catch (error) {
      lastError = error;
      if (!isTransportFailure(error)) break;
    }
  }

  throw lastError ?? new Error("No compatible Tezos RPC responded");
};

export async function loadStezSnapshot(
  info: NetworkInfo,
  walletAddress?: string | null,
  signal?: AbortSignal
): Promise<StezSnapshot> {
  let metadata: Awaited<ReturnType<typeof connectToNetwork>>;

  try {
    metadata = await connectToNetwork(info, signal);
  } catch (error) {
    if (signal?.aborted) throw error;
    return unavailableSnapshot(
      "unreachable",
      {
        endpoint: normalizeEndpoint(info.tezosServer),
        chainId: info.chainId,
        protocolHash: "",
        blockHash: "",
        blockLevel: BigInt(0),
        blockTimestamp: "",
      },
      "The selected network could not be checked. No transaction controls have been enabled."
    );
  }

  const contextPath = `/chains/main/blocks/${metadata.blockHash}/context`;
  let contractHash: string;

  try {
    contractHash = await fetchRpc<string>(
      metadata.endpoint,
      `${contextPath}/stez/contract_hash`,
      signal
    );
  } catch (error) {
    if (signal?.aborted) throw error;
    if (isFeatureDisabled(error)) {
      return unavailableSnapshot(
        "disabled",
        metadata,
        "This protocol includes sTEZ, but the feature is not activated on the selected network."
      );
    }
    return unavailableSnapshot(
      "unsupported",
      metadata,
      "The selected network does not expose the sTEZ capability required by this interface."
    );
  }

  try {
    const entrypoints = await fetchRpc<ContractEntrypoints>(
      metadata.endpoint,
      `${contextPath}/contracts/${contractHash}/entrypoints`,
      signal
    );
    if (!hasCompatibleTransactionEntrypoints(entrypoints)) {
      return unavailableSnapshot(
        "unsupported",
        metadata,
        "The detected sTEZ contract does not expose the transaction interface required by TEZEX."
      );
    }

    const accountPath = walletAddress
      ? `${contextPath}/contracts/${walletAddress}`
      : null;
    const globalRequests = Promise.all([
      fetchRpc<string | number>(
        metadata.endpoint,
        `${contextPath}/stez/total_supply`,
        signal
      ),
      fetchRpc<string | number>(
        metadata.endpoint,
        `${contextPath}/stez/total_amount_of_tez`,
        signal
      ),
      fetchRpc<ExchangeRate>(
        metadata.endpoint,
        `${contextPath}/stez/exchange_rate`,
        signal
      ),
    ]);
    const accountRequests = accountPath
      ? Promise.all([
          fetchRpc<string | number>(
            metadata.endpoint,
            `${accountPath}/balance`,
            signal
          ),
          fetchRpc<string | number>(
            metadata.endpoint,
            `${accountPath}/stez_balance`,
            signal
          ),
          fetchRpc<string | number>(
            metadata.endpoint,
            `${accountPath}/stez_redeemed_frozen_balance`,
            signal
          ),
          fetchRpc<string | number>(
            metadata.endpoint,
            `${accountPath}/stez_redeemed_finalizable_balance`,
            signal
          ),
        ])
      : Promise.resolve(null);

    const [[totalSupply, totalBacking, rate], account] = await Promise.all([
      globalRequests,
      accountRequests,
    ]);

    return {
      availability: "available",
      ...metadata,
      contractHash,
      totalSupplyUnits: toBigInt(totalSupply),
      totalBackingMutez: toBigInt(totalBacking),
      rateNumeratorMutez: toBigInt(rate.numerator),
      rateDenominatorTokenUnits: toBigInt(rate.denominator),
      walletXtzMutez: account ? toBigInt(account[0]) : null,
      walletStezUnits: account ? toBigInt(account[1]) : null,
      redeemedFrozenMutez: account ? toBigInt(account[2]) : null,
      redeemedFinalizableMutez: account ? toBigInt(account[3]) : null,
      checkedAt: Date.now(),
      detail:
        "sTEZ is active and the current position was read from one fixed Tezos block.",
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return unavailableSnapshot(
      "unreachable",
      metadata,
      "sTEZ was detected, but its current state could not be read safely from the selected RPC."
    );
  }
}

export const quoteStezDeposit = (
  depositMutez: bigint,
  numeratorMutez: bigint,
  denominatorUnits: bigint
) => (depositMutez * denominatorUnits) / numeratorMutez;

export const quoteStezRedeem = (
  tokenUnits: bigint,
  numeratorMutez: bigint,
  denominatorUnits: bigint
) => (tokenUnits * numeratorMutez) / denominatorUnits;

export const stezUnderlyingValue = quoteStezRedeem;

const pause = (milliseconds: number) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export async function waitForStezOperation(
  endpoint: string,
  operationHash: string,
  attempts = 30
) {
  const normalized = normalizeEndpoint(endpoint);

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const recentBlocks = await Promise.all(
      [0, 1, 2].map(async (depth) => {
        try {
          return await fetchRpc<string[][]>(
            normalized,
            `/chains/main/blocks/head~${depth}/operation_hashes`
          );
        } catch {
          return [];
        }
      })
    );

    if (recentBlocks.some((passes) => passes.flat().includes(operationHash))) {
      return;
    }

    if (attempt < attempts - 1) await pause(4_000);
  }

  throw new Error(
    "The operation was submitted, but confirmation has not appeared on Weeklynet yet."
  );
}
