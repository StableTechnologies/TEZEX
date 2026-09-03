import {
  observeImplementationFingerprint,
  parseImplementationSelectors,
} from "./token-control-monitor.js";

function required(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`Required environment variable ${key} is not set`);
  return value;
}

function rpcUrls(): string[] {
  const urls = required("TOKEN_MONITOR_RPC_URLS")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""));
  if (
    urls.length < 2
    || new Set(urls.map((value) => new URL(value).origin)).size !== urls.length
    || urls.some((value) => new URL(value).protocol !== "https:")
  ) {
    throw new Error("TOKEN_MONITOR_RPC_URLS requires two independent HTTPS origins");
  }
  return urls;
}

async function headLevel(rpc: string): Promise<number> {
  const response = await fetch(`${rpc}/chains/main/blocks/head/header`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`RPC head request failed with HTTP ${response.status}`);
  const value = await response.json() as { level?: unknown };
  if (!Number.isSafeInteger(value.level) || Number(value.level) < 2) {
    throw new Error("RPC returned an invalid head level");
  }
  return Number(value.level);
}

async function main(): Promise<void> {
  const rpcs = rpcUrls();
  const selectors = parseImplementationSelectors(
    required("TOKEN_MONITOR_IMPLEMENTATION_SELECTORS"),
  );
  const explicit = process.env.TOKEN_MONITOR_BLOCK?.trim();
  const block = explicit
    ? Number(explicit)
    : Math.min(...await Promise.all(rpcs.map(headLevel))) - 2;
  if (!Number.isSafeInteger(block) || block < 1) {
    throw new Error("TOKEN_MONITOR_BLOCK must be a positive block level");
  }
  const fingerprints = await Promise.all(rpcs.map((rpc) =>
    observeImplementationFingerprint(rpc, block, selectors, 15_000)
  ));
  if (new Set(fingerprints).size !== 1) {
    throw new Error(
      `Independent RPC sources disagree: ${JSON.stringify(fingerprints)}`,
    );
  }
  console.log(JSON.stringify({
    block,
    selectors: selectors.length,
    implementationSha256: fingerprints[0],
    rpcOrigins: rpcs.map((rpc) => new URL(rpc).origin),
  }, null, 2));
}

main().catch((error: unknown) => {
  console.error(
    `Token implementation inspection failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
