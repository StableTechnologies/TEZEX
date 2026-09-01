import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  ValidationResult,
  validateContractAddress,
} from "@taquito/utils";

import { canonicalJson, scriptCodeSha256 } from "./token-code-hash.js";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const NAT_PATTERN = /^(0|[1-9][0-9]*)$/;
const CHECKPOINT_VERSION = 3;

export type TokenControlProfile = "generic" | "usdt" | "tzbtc";

export function parseTokenControlProfile(
  value: string | undefined,
  key = "TOKEN_MONITOR_PROFILE",
): TokenControlProfile {
  const profile = value?.trim().toLowerCase() || "generic";
  if (profile !== "generic" && profile !== "usdt" && profile !== "tzbtc") {
    throw new Error(`${key} must be generic, usdt, or tzbtc`);
  }
  return profile;
}

export type AlertSeverity = "critical" | "high";

export type AlertCategory =
  | "pause-or-unpause"
  | "administrator-or-authority-change"
  | "upgrade-or-migration"
  | "freeze-revoke-or-seizure"
  | "mint-burn-or-issuance"
  | "transfer-or-balance-failure"
  | "operation-failure"
  | "source-unavailable"
  | "chain-mismatch"
  | "rpc-disagreement"
  | "code-hash-mismatch"
  | "implementation-fingerprint-mismatch"
  | "unexpected-entrypoint"
  | "checkpoint-anchor-mismatch"
  | "indexer-unhealthy";

export interface TokenControlMonitorConfig {
  profile: TokenControlProfile;
  tokenAddress: string;
  tokenId: string;
  expectedCodeSha256: string;
  expectedImplementationSha256?: string;
  implementationSelectors: ImplementationSelector[];
  expectedChainId: string;
  rpcUrls: string[];
  tzktApiUrl: string;
  tzktApiKey?: string;
  integrationOwner: string;
  incidentChannel: string;
  startLevel: number;
  confirmations: number;
  maxRpcLevelSkew: number;
  maxIndexerLag: number;
  maxIndexerAgeSeconds: number;
  requestTimeoutMs: number;
  pageSize: number;
  checkpointFile: string;
  alertWebhookUrl?: string;
  alertWebhookBearer?: string;
}

export interface MonitorCheckpoint {
  version: number;
  tokenAddress: string;
  tokenId: string;
  expectedCodeSha256: string;
  expectedImplementationSha256: string | null;
  implementationSelectorsSha256: string;
  expectedChainId: string;
  profile: TokenControlProfile;
  startLevel: number;
  lastScannedLevel: number;
  lastScannedBlockHash: string | null;
  updatedAt: string;
}

export interface IndexedTransaction {
  id: number;
  level: number;
  timestamp: string;
  hash: string;
  status: string;
  sender?: { address?: string; alias?: string } | null;
  target?: { address?: string; alias?: string } | null;
  parameter?: { entrypoint?: string; value?: unknown } | null;
  errors?: unknown;
}

export interface RpcObservation {
  rpcUrl: string;
  chainId: string;
  level: number;
  blockHash: string;
  commonLevel?: number;
  commonBlockHash?: string;
  codeSha256: string;
  implementationSha256?: string;
}

export interface ImplementationSelector {
  bigMapId: number;
  keyHash: string;
}

export interface IndexerObservation {
  apiUrl: string;
  chainId: string;
  level: number;
  knownLevel: number;
  synced: boolean;
  lastSync: string;
}

export interface MonitorAlert {
  id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  summary: string;
  source: "operation" | "rpc" | "indexer";
  operation?: {
    id: number;
    level: number;
    hash: string;
    status: string;
    entrypoint: string;
    sender: string | null;
    timestamp: string;
  };
  details?: Record<string, unknown>;
}

export interface MonitorReport {
  schemaVersion: number;
  observedAt: string;
  integrationOwner: string;
  incidentChannel: string;
  token: {
    address: string;
    tokenId: string;
    expectedCodeSha256: string;
    profile: TokenControlProfile;
    expectedImplementationSha256: string | null;
  };
  range: {
    previousLevel: number;
    safeLevel: number | null;
  };
  health: {
    rpc: RpcObservation[];
    indexer: IndexerObservation | null;
  };
  indexedOperations: number;
  classifications: Record<string, number>;
  alerts: MonitorAlert[];
  checkpointAdvanced: boolean;
}

export interface MonitorEvaluation {
  report: MonitorReport;
  nextCheckpoint?: MonitorCheckpoint;
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Required environment variable ${key} is not set`);
  return value;
}

function optional(env: NodeJS.ProcessEnv, key: string): string | undefined {
  return env[key]?.trim() || undefined;
}

function natural(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback?: string,
): string {
  const value = optional(env, key) ?? fallback;
  if (value === undefined || !NAT_PATTERN.test(value)) {
    throw new Error(`${key} must be an unsigned base-10 integer`);
  }
  return BigInt(value).toString();
}

function safeInteger(
  env: NodeJS.ProcessEnv,
  key: string,
  fallback?: number,
  minimum = 0,
): number {
  const raw = optional(env, key) ?? (fallback === undefined ? undefined : String(fallback));
  if (raw === undefined || !NAT_PATTERN.test(raw)) {
    throw new Error(`${key} must be an unsigned base-10 integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${key} must be a safe integer of at least ${minimum}`);
  }
  return value;
}

function httpsUrl(value: string, key: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${key} must be an absolute HTTPS URL`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${key} must be an absolute HTTPS URL`);
  }
  parsed.hash = "";
  return parsed.toString().replace(/\/$/, "");
}

function parseRpcUrls(env: NodeJS.ProcessEnv): string[] {
  const values = required(env, "TOKEN_MONITOR_RPC_URLS")
    .split(",")
    .map((value) => httpsUrl(value.trim(), "TOKEN_MONITOR_RPC_URLS"));
  const origins = new Set(values.map((value) => new URL(value).origin));
  if (values.length < 2 || origins.size !== values.length) {
    throw new Error(
      "TOKEN_MONITOR_RPC_URLS must contain at least two independent HTTPS origins",
    );
  }
  return values;
}

export function parseImplementationSelectors(
  value: string,
  key = "TOKEN_MONITOR_IMPLEMENTATION_SELECTORS",
): ImplementationSelector[] {
  const selectors = value.split(",").map((item) => {
    const [rawBigMapId, keyHash, extra] = item.trim().split(":");
    if (
      extra !== undefined
      || !rawBigMapId
      || !/^(0|[1-9][0-9]*)$/.test(rawBigMapId)
      || !keyHash
      || !/^expr[1-9A-HJ-NP-Za-km-z]+$/.test(keyHash)
    ) {
      throw new Error(
        `${key} must be comma-separated <big-map-id>:<expr-hash> entries`,
      );
    }
    const bigMapId = Number(rawBigMapId);
    if (!Number.isSafeInteger(bigMapId)) {
      throw new Error("Token implementation big-map ID is too large");
    }
    return { bigMapId, keyHash };
  });
  const unique = new Map(
    selectors.map((selector) => [`${selector.bigMapId}:${selector.keyHash}`, selector]),
  );
  if (unique.size !== selectors.length) {
    throw new Error(`${key} contains duplicates`);
  }
  return [...unique.values()].sort(
    (left, right) => left.bigMapId - right.bigMapId
      || left.keyHash.localeCompare(right.keyHash),
  );
}

function selectorsSha256(selectors: ImplementationSelector[]): string {
  return createHash("sha256").update(canonicalJson(selectors)).digest("hex");
}

export function parseTokenControlMonitorConfig(
  env: NodeJS.ProcessEnv = process.env,
): TokenControlMonitorConfig {
  const tokenAddress = required(env, "TOKEN_MONITOR_ADDRESS");
  if (validateContractAddress(tokenAddress) !== ValidationResult.VALID) {
    throw new Error("TOKEN_MONITOR_ADDRESS must be a valid originated contract address");
  }
  const expectedCodeSha256 = required(
    env,
    "TOKEN_MONITOR_CODE_SHA256",
  ).toLowerCase();
  if (!SHA256_PATTERN.test(expectedCodeSha256)) {
    throw new Error("TOKEN_MONITOR_CODE_SHA256 must be a lowercase SHA-256 digest");
  }
  const startLevel = safeInteger(env, "TOKEN_MONITOR_START_LEVEL", undefined, 1);
  const checkpointFile = optional(env, "TOKEN_MONITOR_CHECKPOINT")
    ?? path.join(
      "deployments",
      "token-monitor",
      `${tokenAddress}-${natural(env, "TOKEN_MONITOR_TOKEN_ID", "0")}.json`,
    );
  const alertWebhookUrl = optional(env, "TOKEN_MONITOR_ALERT_WEBHOOK_URL");

  const profile = parseTokenControlProfile(
    optional(env, "TOKEN_MONITOR_PROFILE"),
  );
  const expectedImplementationSha256 = optional(
    env,
    "TOKEN_MONITOR_IMPLEMENTATION_SHA256",
  )?.toLowerCase();
  if (
    expectedImplementationSha256
    && !SHA256_PATTERN.test(expectedImplementationSha256)
  ) {
    throw new Error(
      "TOKEN_MONITOR_IMPLEMENTATION_SHA256 must be a lowercase SHA-256 digest",
    );
  }
  const rawSelectors = optional(env, "TOKEN_MONITOR_IMPLEMENTATION_SELECTORS");
  const implementationSelectors = rawSelectors
    ? parseImplementationSelectors(
      rawSelectors,
      "TOKEN_MONITOR_IMPLEMENTATION_SELECTORS",
    )
    : [];
  if (
    profile !== "generic"
    && (!expectedImplementationSha256 || implementationSelectors.length === 0)
  ) {
    throw new Error(
      "Exact USDt/tzBTC profiles require TOKEN_MONITOR_IMPLEMENTATION_SHA256 and TOKEN_MONITOR_IMPLEMENTATION_SELECTORS",
    );
  }
  const pageSize = safeInteger(env, "TOKEN_MONITOR_PAGE_SIZE", 500, 1);
  if (pageSize > 10_000) {
    throw new Error("TOKEN_MONITOR_PAGE_SIZE cannot exceed the TzKT limit of 10000");
  }

  return {
    profile,
    tokenAddress,
    tokenId: natural(env, "TOKEN_MONITOR_TOKEN_ID", "0"),
    expectedCodeSha256,
    expectedImplementationSha256,
    implementationSelectors,
    expectedChainId: required(env, "TOKEN_MONITOR_CHAIN_ID"),
    rpcUrls: parseRpcUrls(env),
    tzktApiUrl: httpsUrl(
      required(env, "TOKEN_MONITOR_TZKT_API"),
      "TOKEN_MONITOR_TZKT_API",
    ),
    tzktApiKey: optional(env, "TOKEN_MONITOR_TZKT_API_KEY"),
    integrationOwner: required(env, "TOKEN_INTEGRATION_OWNER"),
    incidentChannel: required(env, "TOKEN_INCIDENT_CHANNEL"),
    startLevel,
    confirmations: safeInteger(env, "TOKEN_MONITOR_CONFIRMATIONS", 2),
    maxRpcLevelSkew: safeInteger(env, "TOKEN_MONITOR_MAX_RPC_LEVEL_SKEW", 2),
    maxIndexerLag: safeInteger(env, "TOKEN_MONITOR_MAX_INDEXER_LAG", 3),
    maxIndexerAgeSeconds: safeInteger(
      env,
      "TOKEN_MONITOR_MAX_INDEXER_AGE_SECONDS",
      180,
      1,
    ),
    requestTimeoutMs: safeInteger(
      env,
      "TOKEN_MONITOR_REQUEST_TIMEOUT_MS",
      15_000,
      1,
    ),
    pageSize,
    checkpointFile,
    alertWebhookUrl: alertWebhookUrl
      ? httpsUrl(alertWebhookUrl, "TOKEN_MONITOR_ALERT_WEBHOOK_URL")
      : undefined,
    alertWebhookBearer: optional(env, "TOKEN_MONITOR_ALERT_WEBHOOK_BEARER"),
  };
}

function newCheckpoint(
  config: TokenControlMonitorConfig,
  now: Date,
): MonitorCheckpoint {
  return {
    version: CHECKPOINT_VERSION,
    tokenAddress: config.tokenAddress,
    tokenId: config.tokenId,
    expectedCodeSha256: config.expectedCodeSha256,
    expectedImplementationSha256: config.expectedImplementationSha256 ?? null,
    implementationSelectorsSha256: selectorsSha256(
      config.implementationSelectors,
    ),
    expectedChainId: config.expectedChainId,
    profile: config.profile,
    startLevel: config.startLevel,
    lastScannedLevel: config.startLevel - 1,
    lastScannedBlockHash: null,
    updatedAt: now.toISOString(),
  };
}

export async function loadMonitorCheckpoint(
  config: TokenControlMonitorConfig,
  now = new Date(),
): Promise<MonitorCheckpoint> {
  let parsed: MonitorCheckpoint;
  try {
    parsed = JSON.parse(
      await fs.promises.readFile(path.resolve(config.checkpointFile), "utf8"),
    ) as MonitorCheckpoint;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return newCheckpoint(config, now);
    }
    throw error;
  }
  if (parsed.version !== CHECKPOINT_VERSION) {
    throw new Error(`Unsupported token-monitor checkpoint version ${String(parsed.version)}`);
  }
  const identityMatches =
    parsed.tokenAddress === config.tokenAddress
    && parsed.tokenId === config.tokenId
    && parsed.expectedCodeSha256 === config.expectedCodeSha256
    && (
      parsed.expectedImplementationSha256
        === (config.expectedImplementationSha256 ?? null)
    )
    && (
      parsed.implementationSelectorsSha256
        === selectorsSha256(config.implementationSelectors)
    )
    && parsed.expectedChainId === config.expectedChainId
    && parsed.profile === config.profile
    && parsed.startLevel === config.startLevel;
  if (!identityMatches) {
    throw new Error(
      "Token-monitor checkpoint belongs to a different token, code review, chain, or start level",
    );
  }
  if (
    !Number.isSafeInteger(parsed.lastScannedLevel)
    || parsed.lastScannedLevel < config.startLevel - 1
  ) {
    throw new Error("Token-monitor checkpoint contains an invalid scanned level");
  }
  if (
    parsed.lastScannedBlockHash !== null
    && (
      typeof parsed.lastScannedBlockHash !== "string"
      || parsed.lastScannedBlockHash.length === 0
    )
  ) {
    throw new Error("Token-monitor checkpoint contains an invalid block-hash anchor");
  }
  if (
    parsed.lastScannedLevel >= config.startLevel
    && parsed.lastScannedBlockHash === null
  ) {
    throw new Error("Token-monitor checkpoint is missing its block-hash anchor");
  }
  return parsed;
}

export async function persistMonitorCheckpoint(
  filename: string,
  checkpoint: MonitorCheckpoint,
): Promise<void> {
  const absolute = path.resolve(filename);
  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  await fs.promises.writeFile(
    temporary,
    `${JSON.stringify(checkpoint, null, 2)}\n`,
    { mode: 0o600 },
  );
  await fs.promises.rename(temporary, absolute);
  await fs.promises.chmod(absolute, 0o600);
}

function endpoint(base: string, suffix: string): string {
  return `${base.replace(/\/$/, "")}${suffix}`;
}

async function fetchJson(
  url: string,
  timeoutMs: number,
  fetcher: FetchLike,
  headers?: Record<string, string>,
): Promise<unknown> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(url, {
        headers: { accept: "application/json", ...headers },
        signal: controller.signal,
      });
      if (response.ok) return await response.json();
      if ((response.status === 429 || response.status === 503) && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1_000, 5_000)
          : 250 * (2 ** attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new Error(`HTTP ${response.status} from ${new URL(url).origin}`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`RPC retry budget exhausted for ${new URL(url).origin}`);
}

function integer(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer`);
  }
  return value;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

export async function observeRpc(
  rpcUrl: string,
  tokenAddress: string,
  timeoutMs: number,
  fetcher: FetchLike = fetch,
): Promise<RpcObservation> {
  const [chainIdValue, headerValue, scriptValue] = await Promise.all([
    fetchJson(
      endpoint(rpcUrl, "/chains/main/chain_id"),
      timeoutMs,
      fetcher,
    ),
    fetchJson(
      endpoint(rpcUrl, "/chains/main/blocks/head/header"),
      timeoutMs,
      fetcher,
    ),
    fetchJson(
      endpoint(
        rpcUrl,
        `/chains/main/blocks/head/context/contracts/${encodeURIComponent(tokenAddress)}/script`,
      ),
      timeoutMs,
      fetcher,
    ),
  ]);
  const header = headerValue as { level?: unknown; hash?: unknown };
  const script = scriptValue as { code?: unknown };
  if (!script || !Array.isArray(script.code)) {
    throw new Error(`Token contract has no script code at ${new URL(rpcUrl).origin}`);
  }
  return {
    // Reports expose only the origin so credentials embedded in an RPC path,
    // query string, or userinfo cannot leak into alert payloads.
    rpcUrl: new URL(rpcUrl).origin,
    chainId: text(chainIdValue, "RPC chain ID"),
    level: integer(header?.level, "RPC head level"),
    blockHash: text(header?.hash, "RPC head block hash"),
    codeSha256: scriptCodeSha256(script.code),
  };
}

export async function observeImplementationFingerprint(
  rpcUrl: string,
  block: number | string,
  selectors: ImplementationSelector[],
  timeoutMs: number,
  fetcher: FetchLike = fetch,
): Promise<string> {
  if (selectors.length === 0) {
    throw new Error("At least one implementation selector is required");
  }
  const entries: Array<ImplementationSelector & { value: unknown }> = [];
  // Read sequentially per origin to stay within public-RPC burst limits. The
  // two independent origins are still observed concurrently by callers.
  for (const selector of selectors) {
    const value = await fetchJson(
      endpoint(
        rpcUrl,
        `/chains/main/blocks/${encodeURIComponent(String(block))}/context/big_maps/${selector.bigMapId}/${encodeURIComponent(selector.keyHash)}`,
      ),
      timeoutMs,
      fetcher,
    );
    entries.push({ ...selector, value });
  }
  return createHash("sha256")
    .update(canonicalJson(entries))
    .digest("hex");
}

export async function observeIndexer(
  config: TokenControlMonitorConfig,
  fetcher: FetchLike = fetch,
): Promise<IndexerObservation> {
  const value = await fetchJson(
    endpoint(config.tzktApiUrl, "/v1/head"),
    config.requestTimeoutMs,
    fetcher,
    config.tzktApiKey ? { apikey: config.tzktApiKey } : undefined,
  );
  const head = value as Record<string, unknown>;
  return {
    apiUrl: new URL(config.tzktApiUrl).origin,
    chainId: text(head.chainId, "TzKT chain ID"),
    level: integer(head.level, "TzKT indexed level"),
    knownLevel: integer(head.knownLevel, "TzKT known level"),
    synced: head.synced === true,
    lastSync: text(head.lastSync, "TzKT last-sync timestamp"),
  };
}

function healthAlert(
  category: AlertCategory,
  severity: AlertSeverity,
  summary: string,
  source: "rpc" | "indexer",
  details: Record<string, unknown>,
): MonitorAlert {
  const digest = createHash("sha256")
    .update(canonicalJson({ category, summary, source, details }))
    .digest("hex")
    .slice(0, 16);
  return {
    id: `health:${category}:${digest}`,
    category,
    severity,
    summary,
    source,
    details,
  };
}

interface HealthEvaluation {
  rpc: RpcObservation[];
  indexer: IndexerObservation | null;
  alerts: MonitorAlert[];
  safeLevel: number | null;
  safeBlockHash: string | null;
}

export async function evaluateHealth(
  config: TokenControlMonitorConfig,
  now: Date,
  fetcher: FetchLike = fetch,
): Promise<HealthEvaluation> {
  const [rpcResults, indexerResult] = await Promise.all([
    Promise.allSettled(
      config.rpcUrls.map((rpcUrl) =>
        observeRpc(rpcUrl, config.tokenAddress, config.requestTimeoutMs, fetcher)
      ),
    ),
    Promise.allSettled([observeIndexer(config, fetcher)]),
  ]);
  const rpc: RpcObservation[] = [];
  const alerts: MonitorAlert[] = [];
  let verifiedCommonLevel: number | null = null;
  let verifiedCommonBlockHash: string | null = null;
  rpcResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      rpc.push(result.value);
    } else {
      alerts.push(healthAlert(
        "source-unavailable",
        "critical",
        "An independent RPC source could not be read",
        "rpc",
        {
          rpcOrigin: new URL(config.rpcUrls[index]).origin,
          error: result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        },
      ));
    }
  });
  let indexer: IndexerObservation | null = null;
  const indexedResult = indexerResult[0];
  if (indexedResult.status === "fulfilled") {
    indexer = indexedResult.value;
  } else {
    alerts.push(healthAlert(
      "source-unavailable",
      "critical",
      "The configured indexer could not be read",
      "indexer",
      {
        indexerOrigin: new URL(config.tzktApiUrl).origin,
        error: indexedResult.reason instanceof Error
          ? indexedResult.reason.message
          : String(indexedResult.reason),
      },
    ));
  }

  for (const observation of rpc) {
    if (observation.chainId !== config.expectedChainId) {
      alerts.push(healthAlert(
        "chain-mismatch",
        "critical",
        "An RPC source reports the wrong Tezos chain",
        "rpc",
        {
          rpcOrigin: new URL(observation.rpcUrl).origin,
          expected: config.expectedChainId,
          actual: observation.chainId,
        },
      ));
    }
    if (observation.codeSha256 !== config.expectedCodeSha256) {
      alerts.push(healthAlert(
        "code-hash-mismatch",
        "critical",
        "The token script code differs from the reviewed hash",
        "rpc",
        {
          rpcOrigin: new URL(observation.rpcUrl).origin,
          expected: config.expectedCodeSha256,
          actual: observation.codeSha256,
        },
      ));
    }
  }

  if (rpc.length === config.rpcUrls.length) {
    const chains = new Set(rpc.map((item) => item.chainId));
    const hashes = new Set(rpc.map((item) => item.codeSha256));
    const levels = rpc.map((item) => item.level);
    const levelSkew = Math.max(...levels) - Math.min(...levels);
    // Compare a confirmed block rather than the newest announced head. Some
    // public RPC gateways briefly expose a head header before the same level
    // is available through their historical block route.
    const commonLevel = Math.max(
      0,
      Math.min(...levels, ...(indexer ? [indexer.level] : []))
        - config.confirmations,
    );
    const commonBlockResults = await Promise.allSettled(
      config.rpcUrls.map((rpcUrl) =>
        fetchJson(
          endpoint(rpcUrl, `/chains/main/blocks/${commonLevel}/hash`),
          config.requestTimeoutMs,
          fetcher,
        ).then((value) => text(value, "RPC common-level block hash"))
      ),
    );
    const commonBlockHashes: string[] = [];
    commonBlockResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const commonBlockHash = result.value;
        commonBlockHashes.push(commonBlockHash);
        rpc[index].commonLevel = commonLevel;
        rpc[index].commonBlockHash = commonBlockHash;
      } else {
        alerts.push(healthAlert(
          "source-unavailable",
          "critical",
          "An RPC source could not prove the common finalized block",
          "rpc",
          {
            rpcOrigin: new URL(config.rpcUrls[index]).origin,
            commonLevel,
            error: result.reason instanceof Error
              ? result.reason.message
              : String(result.reason),
          },
        ));
      }
    });
    const commonBlocks = new Set(commonBlockHashes);
    if (
      chains.size !== 1
      || hashes.size !== 1
      || levelSkew > config.maxRpcLevelSkew
      || commonBlocks.size !== 1
      || commonBlockHashes.length !== config.rpcUrls.length
    ) {
      alerts.push(healthAlert(
        "rpc-disagreement",
        "critical",
        "Independent RPC sources disagree",
        "rpc",
        {
          observations: rpc.map((item) => ({
            origin: new URL(item.rpcUrl).origin,
            chainId: item.chainId,
            level: item.level,
            commonLevel: item.commonLevel,
            commonBlockHash: item.commonBlockHash,
            codeSha256: item.codeSha256,
          })),
          maximumLevelSkew: config.maxRpcLevelSkew,
        },
      ));
    } else {
      verifiedCommonLevel = commonLevel;
      verifiedCommonBlockHash = commonBlockHashes[0];
      if (config.implementationSelectors.length > 0) {
        const implementationResults = await Promise.allSettled(
          config.rpcUrls.map((rpcUrl) => observeImplementationFingerprint(
            rpcUrl,
            commonLevel,
            config.implementationSelectors,
            config.requestTimeoutMs,
            fetcher,
          )),
        );
        const fingerprints: string[] = [];
        implementationResults.forEach((result, index) => {
          if (result.status === "fulfilled") {
            fingerprints.push(result.value);
            rpc[index].implementationSha256 = result.value;
          } else {
            alerts.push(healthAlert(
              "source-unavailable",
              "critical",
              "An RPC source could not read the token implementation selectors",
              "rpc",
              {
                rpcOrigin: new URL(config.rpcUrls[index]).origin,
                commonLevel,
                error: result.reason instanceof Error
                  ? result.reason.message
                  : String(result.reason),
              },
            ));
          }
        });
        if (
          fingerprints.length !== config.rpcUrls.length
          || new Set(fingerprints).size !== 1
        ) {
          alerts.push(healthAlert(
            "rpc-disagreement",
            "critical",
            "Independent RPC sources disagree on mutable token implementation state",
            "rpc",
            { commonLevel, fingerprints },
          ));
        } else if (
          config.expectedImplementationSha256
          && fingerprints[0] !== config.expectedImplementationSha256
        ) {
          alerts.push(healthAlert(
            "implementation-fingerprint-mismatch",
            "critical",
            "Mutable token implementation or control state differs from the reviewed fingerprint",
            "rpc",
            {
              commonLevel,
              expected: config.expectedImplementationSha256,
              actual: fingerprints[0],
            },
          ));
        }
      }
    }
  }

  if (indexer) {
    const lastSyncMs = Date.parse(indexer.lastSync);
    const ageSeconds = Number.isFinite(lastSyncMs)
      ? Math.max(0, Math.floor((now.getTime() - lastSyncMs) / 1000))
      : Number.POSITIVE_INFINITY;
    const highestRpcLevel = rpc.length > 0
      ? Math.max(...rpc.map((item) => item.level))
      : indexer.knownLevel;
    const lag = highestRpcLevel - indexer.level;
    if (
      indexer.chainId !== config.expectedChainId
      || !indexer.synced
      || ageSeconds > config.maxIndexerAgeSeconds
      || lag > config.maxIndexerLag
    ) {
      alerts.push(healthAlert(
        indexer.chainId !== config.expectedChainId
          ? "chain-mismatch"
          : "indexer-unhealthy",
        "critical",
        "The configured indexer is stale, unsynchronized, or on the wrong chain",
        "indexer",
        {
          expectedChainId: config.expectedChainId,
          actualChainId: indexer.chainId,
          indexedLevel: indexer.level,
          knownLevel: indexer.knownLevel,
          highestRpcLevel,
          lag,
          maximumLag: config.maxIndexerLag,
          synced: indexer.synced,
          lastSync: indexer.lastSync,
          ageSeconds,
          maximumAgeSeconds: config.maxIndexerAgeSeconds,
        },
      ));
    }
  }

  let safeLevel: number | null = null;
  let safeBlockHash: string | null = null;
  if (
    alerts.length === 0
    && rpc.length === config.rpcUrls.length
    && indexer !== null
    && verifiedCommonLevel !== null
    && verifiedCommonBlockHash !== null
  ) {
    safeLevel = Math.min(indexer.level, ...rpc.map((item) => item.level))
      - config.confirmations;
    if (safeLevel !== verifiedCommonLevel) {
      throw new Error("Internal monitor error: confirmed level was not cross-verified");
    }
    safeBlockHash = verifiedCommonBlockHash;
  }
  return { rpc, indexer, alerts, safeLevel, safeBlockHash };
}

async function verifyCheckpointAnchor(
  config: TokenControlMonitorConfig,
  checkpoint: MonitorCheckpoint,
  fetcher: FetchLike,
): Promise<MonitorAlert[]> {
  if (checkpoint.lastScannedBlockHash === null) return [];
  const results = await Promise.allSettled(
    config.rpcUrls.map((rpcUrl) =>
      fetchJson(
        endpoint(
          rpcUrl,
          `/chains/main/blocks/${checkpoint.lastScannedLevel}/hash`,
        ),
        config.requestTimeoutMs,
        fetcher,
      ).then((value) => text(value, "RPC checkpoint block hash"))
    ),
  );
  const alerts: MonitorAlert[] = [];
  const currentHashes: Array<{ origin: string; hash: string }> = [];
  results.forEach((result, index) => {
    const origin = new URL(config.rpcUrls[index]).origin;
    if (result.status === "fulfilled") {
      currentHashes.push({ origin, hash: result.value });
    } else {
      alerts.push(healthAlert(
        "source-unavailable",
        "critical",
        "An RPC source could not verify the prior checkpoint block",
        "rpc",
        {
          rpcOrigin: origin,
          checkpointLevel: checkpoint.lastScannedLevel,
          error: result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        },
      ));
    }
  });
  if (
    currentHashes.length !== config.rpcUrls.length
    || currentHashes.some(
      (item) => item.hash !== checkpoint.lastScannedBlockHash,
    )
  ) {
    alerts.push(healthAlert(
      "checkpoint-anchor-mismatch",
      "critical",
      "The prior checkpoint no longer matches the confirmed chain",
      "rpc",
      {
        checkpointLevel: checkpoint.lastScannedLevel,
        expectedBlockHash: checkpoint.lastScannedBlockHash,
        currentHashes,
      },
    ));
  }
  return alerts;
}

function transaction(value: unknown): IndexedTransaction {
  const item = value as Record<string, unknown>;
  const parameter = item.parameter as IndexedTransaction["parameter"];
  const parsed: IndexedTransaction = {
    id: integer(item.id, "TzKT transaction id"),
    level: integer(item.level, "TzKT transaction level"),
    timestamp: text(item.timestamp, "TzKT transaction timestamp"),
    hash: text(item.hash, "TzKT transaction hash"),
    status: text(item.status, "TzKT transaction status"),
    sender: item.sender as IndexedTransaction["sender"],
    target: item.target as IndexedTransaction["target"],
    parameter,
    errors: item.errors,
  };
  if (parameter && typeof parameter.entrypoint !== "string") {
    throw new Error(`TzKT transaction ${parsed.id} has a malformed parameter`);
  }
  return parsed;
}

export async function fetchIndexedTransactions(
  config: TokenControlMonitorConfig,
  afterLevel: number,
  throughLevel: number,
  fetcher: FetchLike = fetch,
): Promise<IndexedTransaction[]> {
  if (throughLevel <= afterLevel) return [];
  const operations: IndexedTransaction[] = [];
  let lastId: number | undefined;
  while (true) {
    const query = new URLSearchParams({
      target: config.tokenAddress,
      "level.gt": String(afterLevel),
      "level.le": String(throughLevel),
      "sort.asc": "id",
      limit: String(config.pageSize),
      select: "id,level,timestamp,hash,status,sender,target,parameter,errors",
    });
    if (lastId !== undefined) query.set("id.gt", String(lastId));
    const value = await fetchJson(
      endpoint(config.tzktApiUrl, `/v1/operations/transactions?${query}`),
      config.requestTimeoutMs,
      fetcher,
      config.tzktApiKey ? { apikey: config.tzktApiKey } : undefined,
    );
    if (!Array.isArray(value)) throw new Error("TzKT transactions response is not an array");
    const page = value.map(transaction);
    for (const operation of page) {
      if (
        operation.level <= afterLevel
        || operation.level > throughLevel
        || operation.target?.address !== config.tokenAddress
        || (lastId !== undefined && operation.id <= lastId)
      ) {
        throw new Error("TzKT returned an out-of-range or non-monotonic transaction");
      }
      operations.push(operation);
      lastId = operation.id;
    }
    if (page.length < config.pageSize) break;
    if (page.length === 0) break;
  }
  return operations;
}

function normalizedEntrypoint(operation: IndexedTransaction): string {
  return (operation.parameter?.entrypoint ?? "default")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function objectKeys(value: unknown, output: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) objectKeys(item, output);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      output.push(key.toLowerCase().replace(/[^a-z0-9]/g, ""));
      objectKeys(item, output);
    }
  }
  return output;
}

function includesAny(value: string, candidates: readonly string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

type TokenOperationClassification = {
  category: AlertCategory;
  severity: AlertSeverity;
  summary: string;
};

const PROFILE_ORDINARY_ENTRYPOINTS: Record<Exclude<TokenControlProfile, "generic">, ReadonlySet<string>> = {
  usdt: new Set(["default", "balanceof", "transfer", "updateoperators"]),
  tzbtc: new Set([
    "default",
    "approve",
    "getallowance",
    "getbalance",
    "getowner",
    "getredeemaddress",
    "gettokenmetadata",
    "gettotalburned",
    "gettotalminted",
    "gettotalsupply",
    "getversion",
    "safeentrypoints",
    "transfer",
  ]),
};

function exactProfileClassification(
  profile: Exclude<TokenControlProfile, "generic">,
  entrypoint: string,
): TokenOperationClassification | null {
  if (PROFILE_ORDINARY_ENTRYPOINTS[profile].has(entrypoint)) return null;

  const upgrade = profile === "usdt"
    ? new Set(["execute", "updateentrypoints"])
    : new Set([
      "epwapplymigration",
      "epwbeginupgrade",
      "epwfinishupgrade",
      "epwsetcode",
      "run",
      "upgrade",
    ]);
  if (upgrade.has(entrypoint)) {
    return {
      category: "upgrade-or-migration",
      severity: "critical",
      summary: "A token implementation, upgrade, migration, or arbitrary execution control was exercised",
    };
  }

  const freeze = profile === "usdt"
    ? new Set(["freeze", "revoke", "transferfrozenassets", "unfreeze"])
    : new Set<string>();
  if (freeze.has(entrypoint)) {
    return {
      category: "freeze-revoke-or-seizure",
      severity: "critical",
      summary: "A token freeze, revoke, or frozen-asset transfer control was exercised",
    };
  }

  const authority = profile === "usdt"
    ? new Set(["proposeadministrator", "removeadministrator", "setadministrator"])
    : new Set([
      "acceptownership",
      "addoperator",
      "removeoperator",
      "setredeemaddress",
      "transferownership",
    ]);
  if (authority.has(entrypoint)) {
    return {
      category: "administrator-or-authority-change",
      severity: "critical",
      summary: "A token administrator, owner, operator, or redemption authority changed",
    };
  }

  if (entrypoint === "pause" || entrypoint === "unpause") {
    return {
      category: "pause-or-unpause",
      severity: "high",
      summary: "A token pause control was exercised",
    };
  }
  if (
    entrypoint === "mint"
    || entrypoint === "burn"
    || entrypoint === "addtoken"
  ) {
    return {
      category: "mint-burn-or-issuance",
      severity: "high",
      summary: "A token mint, burn, or issuance control was exercised",
    };
  }
  return {
    category: "unexpected-entrypoint",
    severity: "critical",
    summary: `An unallowlisted ${profile} entrypoint was applied`,
  };
}

export function classifyTokenOperation(
  operation: IndexedTransaction,
  profile: TokenControlProfile = "generic",
):
  | { category: AlertCategory; severity: AlertSeverity; summary: string }
  | null {
  const entrypoint = normalizedEntrypoint(operation);
  const keys = objectKeys(operation.parameter?.value).join(" ");
  const readOnlyEntrypoint = entrypoint.startsWith("get")
    || entrypoint.startsWith("view");
  const shape = `${readOnlyEntrypoint ? "" : entrypoint} ${keys}`;
  if (operation.status !== "applied") {
    const interfaceCall = includesAny(entrypoint, [
      "transfer",
      "balanceof",
      "getbalance",
    ]);
    return {
      category: interfaceCall
        ? "transfer-or-balance-failure"
        : "operation-failure",
      severity: "high",
      summary: interfaceCall
        ? "A token transfer or balance operation did not apply"
        : "An operation targeting the token contract did not apply",
    };
  }
  if (profile !== "generic") {
    return exactProfileClassification(profile, entrypoint);
  }
  if (includesAny(shape, ["upgrade", "migrate", "migration", "setimplementation", "setcode"])) {
    return {
      category: "upgrade-or-migration",
      severity: "critical",
      summary: "A token upgrade or migration control was exercised",
    };
  }
  if (includesAny(shape, ["unpause", "pause", "setpaused", "setpause"])) {
    return {
      category: "pause-or-unpause",
      severity: "high",
      summary: "A token pause control was exercised",
    };
  }
  if (includesAny(shape, [
    "freeze",
    "unfreeze",
    "blacklist",
    "revoke",
    "seize",
    "seizure",
    "wipe",
    "blockaddress",
    "unblockaddress",
  ])) {
    return {
      category: "freeze-revoke-or-seizure",
      severity: "critical",
      summary: "A token freeze, revoke, blacklist, or seizure control was exercised",
    };
  }
  if (includesAny(shape, [
    "setadministrator",
    "setadmin",
    "changeadmin",
    "transferownership",
    "acceptownership",
    "setowner",
    "addissuer",
    "removeissuer",
    "setissuer",
    "addminter",
    "removeminter",
    "setminter",
    "configureminter",
    "setmasterminter",
  ])) {
    return {
      category: "administrator-or-authority-change",
      severity: "critical",
      summary: "A token administrator, owner, issuer, or minter control was exercised",
    };
  }
  if (
    includesAny(shape, ["mint", "burn", "issuance", "destroy"])
    || entrypoint === "issue"
  ) {
    return {
      category: "mint-burn-or-issuance",
      severity: "high",
      summary: "A token mint, burn, or issuance operation was applied",
    };
  }
  return null;
}

function operationAlert(
  operation: IndexedTransaction,
  classification: NonNullable<ReturnType<typeof classifyTokenOperation>>,
): MonitorAlert {
  const entrypoint = operation.parameter?.entrypoint ?? "default";
  return {
    id: `operation:${operation.id}:${classification.category}`,
    category: classification.category,
    severity: classification.severity,
    summary: classification.summary,
    source: "operation",
    operation: {
      id: operation.id,
      level: operation.level,
      hash: operation.hash,
      status: operation.status,
      entrypoint,
      sender: operation.sender?.address ?? null,
      timestamp: operation.timestamp,
    },
  };
}

export async function evaluateTokenControlMonitor(
  config: TokenControlMonitorConfig,
  checkpoint: MonitorCheckpoint,
  options: { now?: Date; fetcher?: FetchLike } = {},
): Promise<MonitorEvaluation> {
  const now = options.now ?? new Date();
  const fetcher = options.fetcher ?? fetch;
  const health = await evaluateHealth(config, now, fetcher);
  const base = {
    schemaVersion: 2,
    observedAt: now.toISOString(),
    integrationOwner: config.integrationOwner,
    incidentChannel: config.incidentChannel,
    token: {
      address: config.tokenAddress,
      tokenId: config.tokenId,
      expectedCodeSha256: config.expectedCodeSha256,
      profile: config.profile,
      expectedImplementationSha256:
        config.expectedImplementationSha256 ?? null,
    },
    range: {
      previousLevel: checkpoint.lastScannedLevel,
      safeLevel: health.safeLevel,
    },
    health: { rpc: health.rpc, indexer: health.indexer },
  };
  if (health.safeLevel === null) {
    return {
      report: {
        ...base,
        indexedOperations: 0,
        classifications: {},
        alerts: health.alerts,
        checkpointAdvanced: false,
      },
    };
  }
  if (checkpoint.lastScannedLevel > health.safeLevel) {
    const alert = healthAlert(
      "checkpoint-anchor-mismatch",
      "critical",
      "The checkpoint is ahead of the independently confirmed chain",
      "rpc",
      {
        checkpointLevel: checkpoint.lastScannedLevel,
        confirmedSafeLevel: health.safeLevel,
      },
    );
    return {
      report: {
        ...base,
        indexedOperations: 0,
        classifications: {},
        alerts: [...health.alerts, alert],
        checkpointAdvanced: false,
      },
    };
  }
  const checkpointAlerts = await verifyCheckpointAnchor(
    config,
    checkpoint,
    fetcher,
  );
  if (checkpointAlerts.length > 0) {
    return {
      report: {
        ...base,
        indexedOperations: 0,
        classifications: {},
        alerts: [...health.alerts, ...checkpointAlerts],
        checkpointAdvanced: false,
      },
    };
  }
  const operations = await fetchIndexedTransactions(
    config,
    checkpoint.lastScannedLevel,
    health.safeLevel,
    fetcher,
  );
  const classifications: Record<string, number> = { ordinary: 0 };
  const alerts = [...health.alerts];
  for (const operation of operations) {
    const classification = classifyTokenOperation(operation, config.profile);
    const key = classification?.category ?? "ordinary";
    classifications[key] = (classifications[key] ?? 0) + 1;
    if (classification) alerts.push(operationAlert(operation, classification));
  }
  const nextCheckpoint: MonitorCheckpoint = {
    ...checkpoint,
    lastScannedLevel: Math.max(checkpoint.lastScannedLevel, health.safeLevel),
    lastScannedBlockHash: health.safeLevel > checkpoint.lastScannedLevel
      ? health.safeBlockHash
      : checkpoint.lastScannedBlockHash,
    updatedAt: now.toISOString(),
  };
  return {
    report: {
      ...base,
      indexedOperations: operations.length,
      classifications,
      alerts,
      checkpointAdvanced: nextCheckpoint.lastScannedLevel
        > checkpoint.lastScannedLevel,
    },
    nextCheckpoint,
  };
}

export async function dispatchMonitorAlerts(
  config: TokenControlMonitorConfig,
  report: MonitorReport,
  fetcher: FetchLike = fetch,
): Promise<void> {
  if (report.alerts.length === 0 || !config.alertWebhookUrl) return;
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };
  if (config.alertWebhookBearer) {
    headers.authorization = `Bearer ${config.alertWebhookBearer}`;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetcher(config.alertWebhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(report),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Alert webhook rejected the report with HTTP ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}
