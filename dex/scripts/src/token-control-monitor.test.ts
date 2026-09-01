import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { b58Encode, PrefixV2 } from "@taquito/utils";

import {
  classifyTokenOperation,
  dispatchMonitorAlerts,
  evaluateTokenControlMonitor,
  fetchIndexedTransactions,
  loadMonitorCheckpoint,
  observeImplementationFingerprint,
  parseImplementationSelectors,
  parseTokenControlMonitorConfig,
  persistMonitorCheckpoint,
  type FetchLike,
  type IndexedTransaction,
  type MonitorCheckpoint,
  type MonitorReport,
  type TokenControlMonitorConfig,
} from "./token-control-monitor.js";
import { scriptCodeSha256 } from "./token-code-hash.js";

const contractAddress = b58Encode(
  new Uint8Array(20).fill(7),
  PrefixV2.ContractHash,
);
const code = [{ prim: "parameter", args: [{ prim: "unit" }] }];
const codeHash = scriptCodeSha256(code);

function environment(): NodeJS.ProcessEnv {
  return {
    TOKEN_MONITOR_ADDRESS: contractAddress,
    TOKEN_MONITOR_TOKEN_ID: "0",
    TOKEN_MONITOR_CODE_SHA256: codeHash,
    TOKEN_MONITOR_CHAIN_ID: "NetXMonitor",
    TOKEN_MONITOR_RPC_URLS: "https://rpc-one.invalid,https://rpc-two.invalid",
    TOKEN_MONITOR_TZKT_API: "https://indexer.invalid",
    TOKEN_INTEGRATION_OWNER: "token-security-owner",
    TOKEN_INCIDENT_CHANNEL: "security-incident",
    TOKEN_MONITOR_START_LEVEL: "100",
    TOKEN_MONITOR_PROFILE: "generic",
  };
}

function config(overrides: Partial<TokenControlMonitorConfig> = {}): TokenControlMonitorConfig {
  return { ...parseTokenControlMonitorConfig(environment()), ...overrides };
}

function operation(
  entrypoint: string,
  status = "applied",
  value: unknown = {},
): IndexedTransaction {
  return {
    id: 101,
    level: 105,
    timestamp: "2026-08-26T00:00:00Z",
    hash: "operation-hash",
    status,
    sender: { address: "tz1-sender" },
    target: { address: contractAddress },
    parameter: { entrypoint, value },
    errors: status === "applied" ? null : [{ id: "failure" }],
  };
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("requires an exact token identity and two independent RPC origins", () => {
  const parsed = parseTokenControlMonitorConfig(environment());
  assert.equal(parsed.tokenAddress, contractAddress);
  assert.equal(parsed.expectedCodeSha256, codeHash);
  assert.deepEqual(parsed.rpcUrls, [
    "https://rpc-one.invalid",
    "https://rpc-two.invalid",
  ]);
  assert.equal(parsed.startLevel, 100);
  assert.equal(parsed.profile, "generic");

  const oneRpc = environment();
  oneRpc.TOKEN_MONITOR_RPC_URLS = "https://rpc-one.invalid";
  assert.throws(
    () => parseTokenControlMonitorConfig(oneRpc),
    /at least two independent HTTPS origins/,
  );

  const wrongHash = environment();
  wrongHash.TOKEN_MONITOR_CODE_SHA256 = "not-a-hash";
  assert.throws(() => parseTokenControlMonitorConfig(wrongHash), /SHA-256/);

  const wrongAddress = environment();
  wrongAddress.TOKEN_MONITOR_ADDRESS = "not-a-contract";
  assert.throws(() => parseTokenControlMonitorConfig(wrongAddress), /originated/);
});

test("exact profiles require a reviewed mutable-implementation fingerprint", async () => {
  const exact = environment();
  exact.TOKEN_MONITOR_PROFILE = "tzbtc";
  assert.throws(
    () => parseTokenControlMonitorConfig(exact),
    /require.*IMPLEMENTATION_SHA256.*IMPLEMENTATION_SELECTORS/,
  );
  exact.TOKEN_MONITOR_IMPLEMENTATION_SHA256 = "d".repeat(64);
  exact.TOKEN_MONITOR_IMPLEMENTATION_SELECTORS =
    "31:exprtu6vJPJCkTXVHfqSY4e3WUVnRgozHnAZoFRrEyCE8XfHRi9LZm";
  const parsed = parseTokenControlMonitorConfig(exact);
  assert.equal(parsed.profile, "tzbtc");
  assert.deepEqual(parsed.implementationSelectors, [{
    bigMapId: 31,
    keyHash: "exprtu6vJPJCkTXVHfqSY4e3WUVnRgozHnAZoFRrEyCE8XfHRi9LZm",
  }]);

  const selectors = parseImplementationSelectors(
    "32:exprtcKu2vMv9vGVGWRmbxA7BByz1adTZzyXSinuE8816jZruUmMCB,"
      + "31:exprtu6vJPJCkTXVHfqSY4e3WUVnRgozHnAZoFRrEyCE8XfHRi9LZm",
  );
  const urls: string[] = [];
  const digest = await observeImplementationFingerprint(
    "https://rpc.invalid",
    123,
    selectors,
    1_000,
    async (input) => {
      urls.push(String(input));
      return json({ int: String(urls.length) });
    },
  );
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.match(urls[0], /blocks\/123\/context\/big_maps\/31\/expr/);
  assert.match(urls[1], /blocks\/123\/context\/big_maps\/32\/expr/);
});

test("classifies every required control family without flagging ordinary transfers", () => {
  const cases: Array<[string, string, string]> = [
    ["set_paused", "applied", "pause-or-unpause"],
    ["set_administrator", "applied", "administrator-or-authority-change"],
    ["upgrade_implementation", "applied", "upgrade-or-migration"],
    ["blacklist", "applied", "freeze-revoke-or-seizure"],
    ["mint", "applied", "mint-burn-or-issuance"],
    ["transfer", "failed", "transfer-or-balance-failure"],
    ["custom_call", "backtracked", "operation-failure"],
  ];
  for (const [entrypoint, status, category] of cases) {
    assert.equal(classifyTokenOperation(operation(entrypoint, status))?.category, category);
  }
  assert.equal(classifyTokenOperation(operation("transfer")), null);
  assert.equal(classifyTokenOperation(operation("update_operators")), null);
  assert.equal(classifyTokenOperation(operation("get_paused")), null);
  assert.equal(classifyTokenOperation(operation("get_issuer")), null);
  assert.equal(
    classifyTokenOperation(operation("main", "applied", {
      action: { set_master_minter: "tz1-new" },
    }))?.category,
    "administrator-or-authority-change",
  );
});

test("uses exact fail-closed USDt and tzBTC entrypoint profiles", () => {
  const usdtCases: Array<[string, string | null]> = [
    ["transfer", null],
    ["update_operators", null],
    ["update_entrypoints", "upgrade-or-migration"],
    ["execute", "upgrade-or-migration"],
    ["transfer_frozen_assets", "freeze-revoke-or-seizure"],
    ["propose_administrator", "administrator-or-authority-change"],
    ["remove_administrator", "administrator-or-authority-change"],
    ["add_token", "mint-burn-or-issuance"],
    ["future_entrypoint", "unexpected-entrypoint"],
  ];
  for (const [entrypoint, expected] of usdtCases) {
    assert.equal(
      classifyTokenOperation(operation(entrypoint), "usdt")?.category ?? null,
      expected,
      entrypoint,
    );
  }

  const tzbtcCases: Array<[string, string | null]> = [
    ["transfer", null],
    ["approve", null],
    ["getBalance", null],
    ["addOperator", "administrator-or-authority-change"],
    ["removeOperator", "administrator-or-authority-change"],
    ["setRedeemAddress", "administrator-or-authority-change"],
    ["run", "upgrade-or-migration"],
    ["epwSetCode", "upgrade-or-migration"],
    ["future_entrypoint", "unexpected-entrypoint"],
  ];
  for (const [entrypoint, expected] of tzbtcCases) {
    assert.equal(
      classifyTokenOperation(operation(entrypoint), "tzbtc")?.category ?? null,
      expected,
      entrypoint,
    );
  }
});

test("checkpoint identity is immutable and persistence is owner-only", async () => {
  const directory = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "tezex-token-monitor-"),
  );
  try {
    const monitorConfig = config({ checkpointFile: path.join(directory, "state.json") });
    const initial = await loadMonitorCheckpoint(
      monitorConfig,
      new Date("2026-08-26T00:00:00Z"),
    );
    assert.equal(initial.lastScannedLevel, 99);
    await persistMonitorCheckpoint(monitorConfig.checkpointFile, initial);
    assert.deepEqual(await loadMonitorCheckpoint(monitorConfig), initial);
    assert.equal(
      (await fs.promises.stat(monitorConfig.checkpointFile)).mode & 0o777,
      0o600,
    );

    const changedReview = config({
      checkpointFile: monitorConfig.checkpointFile,
      expectedCodeSha256: "f".repeat(64),
    });
    await assert.rejects(
      loadMonitorCheckpoint(changedReview),
      /different token, code review, chain, or start level/,
    );
  } finally {
    await fs.promises.rm(directory, { recursive: true, force: true });
  }
});

test("transaction scanning paginates by monotonic operation ID", async () => {
  const urls: string[] = [];
  const pages = [
    [operation("transfer"), { ...operation("mint"), id: 102 }],
    [{ ...operation("burn"), id: 103 }],
  ];
  const fetcher: FetchLike = async (input) => {
    urls.push(String(input));
    return json(pages.shift() ?? []);
  };
  const result = await fetchIndexedTransactions(
    config({ pageSize: 2 }),
    99,
    110,
    fetcher,
  );
  assert.deepEqual(result.map((item) => item.id), [101, 102, 103]);
  assert.match(urls[0], /level\.gt=99/);
  assert.match(urls[0], /level\.le=110/);
  assert.doesNotMatch(urls[0], /id\.gt/);
  assert.match(urls[1], /id\.gt=102/);
});

test("healthy sources scan confirmed operations and advance the checkpoint", async () => {
  const monitorConfig = config();
  const checkpoint: MonitorCheckpoint = {
    version: 3,
    profile: "generic",
    expectedImplementationSha256: null,
    implementationSelectorsSha256:
      "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e546b32b6a93a81f80e1b2c",
    tokenAddress: contractAddress,
    tokenId: "0",
    expectedCodeSha256: codeHash,
    expectedChainId: "NetXMonitor",
    startLevel: 100,
    lastScannedLevel: 99,
    lastScannedBlockHash: null,
    updatedAt: "2026-08-26T00:00:00Z",
  };
  const fetcher: FetchLike = async (input) => {
    const url = String(input);
    if (url.endsWith("/chains/main/chain_id")) return json("NetXMonitor");
    if (url.endsWith("/chains/main/blocks/head/header")) {
      return json({ level: 110, hash: "block-hash" });
    }
    if (url.endsWith("/chains/main/blocks/108/hash")) return json("common-block");
    if (url.includes("/context/contracts/")) return json({ code });
    if (url.endsWith("/v1/head")) {
      return json({
        chainId: "NetXMonitor",
        level: 110,
        knownLevel: 110,
        synced: true,
        lastSync: "2026-08-26T00:00:00Z",
      });
    }
    if (url.includes("/v1/operations/transactions")) {
      return json([operation("set_paused"), { ...operation("transfer"), id: 102 }]);
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  const evaluation = await evaluateTokenControlMonitor(
    monitorConfig,
    checkpoint,
    { now: new Date("2026-08-26T00:00:30Z"), fetcher },
  );
  assert.equal(evaluation.report.range.safeLevel, 108);
  assert.equal(evaluation.report.indexedOperations, 2);
  assert.equal(evaluation.report.alerts[0]?.category, "pause-or-unpause");
  assert.equal(evaluation.report.classifications.ordinary, 1);
  assert.equal(evaluation.nextCheckpoint?.lastScannedLevel, 108);
  assert.equal(evaluation.nextCheckpoint?.lastScannedBlockHash, "common-block");
});

test("code mismatch and stale indexer fail closed without advancing", async () => {
  const monitorConfig = config();
  const checkpoint = await loadMonitorCheckpoint(
    monitorConfig,
    new Date("2026-08-26T00:00:00Z"),
  );
  const fetcher: FetchLike = async (input) => {
    const url = String(input);
    if (url.endsWith("/chains/main/chain_id")) return json("NetXMonitor");
    if (url.endsWith("/chains/main/blocks/head/header")) {
      return json({ level: 120, hash: "block-hash" });
    }
    if (url.endsWith("/chains/main/blocks/118/hash")) return json("common-block");
    if (url.includes("/context/contracts/")) {
      return json({ code: [{ prim: "changed" }] });
    }
    if (url.endsWith("/v1/head")) {
      return json({
        chainId: "NetXMonitor",
        level: 100,
        knownLevel: 120,
        synced: false,
        lastSync: "2026-08-25T23:00:00Z",
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  const evaluation = await evaluateTokenControlMonitor(
    monitorConfig,
    checkpoint,
    { now: new Date("2026-08-26T00:00:30Z"), fetcher },
  );
  assert.equal(evaluation.report.range.safeLevel, null);
  assert.equal(evaluation.nextCheckpoint, undefined);
  assert.ok(
    evaluation.report.alerts.some((alert) => alert.category === "code-hash-mismatch"),
  );
  assert.ok(
    evaluation.report.alerts.some((alert) => alert.category === "indexer-unhealthy"),
  );
});

test("RPC sources on different common blocks fail closed", async () => {
  const monitorConfig = config();
  const checkpoint = await loadMonitorCheckpoint(
    monitorConfig,
    new Date("2026-08-26T00:00:00Z"),
  );
  const fetcher: FetchLike = async (input) => {
    const url = String(input);
    if (url.endsWith("/chains/main/chain_id")) return json("NetXMonitor");
    if (url.endsWith("/chains/main/blocks/head/header")) {
      return json({ level: 110, hash: "head-block" });
    }
    if (url.endsWith("/chains/main/blocks/108/hash")) {
      return json(url.includes("rpc-one") ? "fork-a" : "fork-b");
    }
    if (url.includes("/context/contracts/")) return json({ code });
    if (url.endsWith("/v1/head")) {
      return json({
        chainId: "NetXMonitor",
        level: 110,
        knownLevel: 110,
        synced: true,
        lastSync: "2026-08-26T00:00:00Z",
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  const evaluation = await evaluateTokenControlMonitor(
    monitorConfig,
    checkpoint,
    { now: new Date("2026-08-26T00:00:30Z"), fetcher },
  );
  assert.equal(evaluation.report.range.safeLevel, null);
  assert.equal(evaluation.nextCheckpoint, undefined);
  assert.ok(
    evaluation.report.alerts.some((alert) => alert.category === "rpc-disagreement"),
  );
});

test("a changed prior checkpoint block fails closed before scanning", async () => {
  const monitorConfig = config();
  const checkpoint: MonitorCheckpoint = {
    version: 3,
    profile: "generic",
    expectedImplementationSha256: null,
    implementationSelectorsSha256:
      "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e546b32b6a93a81f80e1b2c",
    tokenAddress: contractAddress,
    tokenId: "0",
    expectedCodeSha256: codeHash,
    expectedChainId: "NetXMonitor",
    startLevel: 100,
    lastScannedLevel: 105,
    lastScannedBlockHash: "original-block",
    updatedAt: "2026-08-26T00:00:00Z",
  };
  const fetcher: FetchLike = async (input) => {
    const url = String(input);
    if (url.endsWith("/chains/main/chain_id")) return json("NetXMonitor");
    if (url.endsWith("/chains/main/blocks/head/header")) {
      return json({ level: 110, hash: "head-block" });
    }
    if (url.endsWith("/chains/main/blocks/108/hash")) return json("common-block");
    if (url.endsWith("/chains/main/blocks/105/hash")) return json("replacement-block");
    if (url.includes("/context/contracts/")) return json({ code });
    if (url.endsWith("/v1/head")) {
      return json({
        chainId: "NetXMonitor",
        level: 110,
        knownLevel: 110,
        synced: true,
        lastSync: "2026-08-26T00:00:00Z",
      });
    }
    throw new Error(`Unexpected URL ${url}`);
  };
  const evaluation = await evaluateTokenControlMonitor(
    monitorConfig,
    checkpoint,
    { now: new Date("2026-08-26T00:00:30Z"), fetcher },
  );
  assert.equal(evaluation.nextCheckpoint, undefined);
  assert.equal(evaluation.report.indexedOperations, 0);
  assert.ok(
    evaluation.report.alerts.some(
      (alert) => alert.category === "checkpoint-anchor-mismatch",
    ),
  );
});

test("webhook credentials stay in headers and delivery failures reject", async () => {
  const monitorConfig = config({
    alertWebhookUrl: "https://alerts.invalid/token",
    alertWebhookBearer: "secret-not-printed",
  });
  const report = {
    schemaVersion: 2,
    observedAt: "2026-08-26T00:00:00Z",
    integrationOwner: "token-security-owner",
    incidentChannel: "security-incident",
    token: {
      address: contractAddress,
      tokenId: "0",
      expectedCodeSha256: codeHash,
      profile: "generic",
      expectedImplementationSha256: null,
    },
    range: { previousLevel: 99, safeLevel: 100 },
    health: { rpc: [], indexer: null },
    indexedOperations: 1,
    classifications: { "pause-or-unpause": 1 },
    alerts: [{
      id: "alert",
      category: "pause-or-unpause",
      severity: "high",
      summary: "pause",
      source: "operation",
    }],
    checkpointAdvanced: true,
  } satisfies MonitorReport;
  let delivered: RequestInit | undefined;
  await dispatchMonitorAlerts(monitorConfig, report, async (_input, init) => {
    delivered = init;
    return new Response(null, { status: 204 });
  });
  assert.equal(
    (delivered?.headers as Record<string, string>).authorization,
    "Bearer secret-not-printed",
  );
  assert.doesNotMatch(String(delivered?.body), /secret-not-printed/);

  await assert.rejects(
    dispatchMonitorAlerts(monitorConfig, report, async () => json({}, 503)),
    /HTTP 503/,
  );
});
