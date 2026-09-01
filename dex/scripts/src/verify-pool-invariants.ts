import path from "node:path";

import { TezosToolkit } from "@taquito/taquito";

import {
  loadDeploymentState,
  type NativePoolDeploymentState,
} from "./deployment-state.js";
import {
  loadTokenTokenDeploymentState,
  type TokenTokenDeploymentState,
} from "./token-token-deployment-state.js";
import {
  assertNativePoolInvariants,
  assertTokenTokenPoolInvariants,
} from "./pool-invariant-verification.js";
import { scriptCodeSha256 } from "./token-code-hash.js";
import { assertPoolIdentityStorage } from "./token-token-storage.js";
import { getTokenBalance } from "./util.js";
import { observeImplementationFingerprint } from "./token-control-monitor.js";

function required(value: string | undefined, message: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function expectedPaused(): boolean {
  const value = process.env.POOL_EXPECTED_PAUSED?.trim().toLowerCase() ?? "false";
  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error("POOL_EXPECTED_PAUSED must be true or false");
}

function stateArgument(variable: string): string {
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith("--state="));
  return path.resolve(required(
    argument?.slice("--state=".length) || process.env[variable],
    `Set ${variable} or pass --state=<deployment-state.json>`,
  ));
}

async function codeHash(tezos: TezosToolkit, address: string): Promise<string> {
  const script = await tezos.rpc.getScript(address);
  if (!script.code) throw new Error(`Contract ${address} has no script code`);
  return scriptCodeSha256(script.code);
}

async function assertCodeHashes(
  tezos: TezosToolkit,
  entries: Array<{ address: string; expected: string; label: string }>,
): Promise<void> {
  const actual = await Promise.all(
    entries.map(async (entry) => ({ ...entry, actual: await codeHash(tezos, entry.address) })),
  );
  const mismatch = actual.find((entry) => entry.actual !== entry.expected);
  if (mismatch) {
    throw new Error(
      `${mismatch.label} code hash mismatch: expected ${mismatch.expected}, got ${mismatch.actual}`,
    );
  }
}

async function metadataValue(
  storage: Record<string, unknown>,
  field: "metadata" | "token_metadata",
  key: string,
): Promise<unknown> {
  const map = storage[field] as { get?: (key: string) => Promise<unknown> };
  if (!map || typeof map.get !== "function") {
    throw new Error(`LQT storage does not expose ${field}`);
  }
  return await map.get(key);
}

function uriBytes(uri: string): string {
  return Buffer.from(uri, "utf8").toString("hex");
}

async function verifyLqtMetadata(
  storage: Record<string, unknown>,
  contractUri: string,
  tokenUri: string,
): Promise<void> {
  const contractValue = await metadataValue(storage, "metadata", "");
  if (String(contractValue ?? "") !== uriBytes(contractUri)) {
    throw new Error("LQT contract metadata URI differs from the release manifest");
  }
  const tokenValue = await metadataValue(storage, "token_metadata", "0") as
    | { token_info?: { get?: (key: string) => unknown } }
    | undefined;
  const tokenInfo = tokenValue?.token_info;
  if (
    !tokenInfo
    || typeof tokenInfo.get !== "function"
    || String(tokenInfo.get("") ?? "") !== uriBytes(tokenUri)
  ) {
    throw new Error("LQT token metadata URI differs from the release manifest");
  }
}

async function verifyChain(
  tezos: TezosToolkit,
  expectedChainId: string,
): Promise<void> {
  const actual = await tezos.rpc.getChainId();
  if (actual !== expectedChainId) {
    throw new Error(`RPC chain ID mismatch: expected ${expectedChainId}, got ${actual}`);
  }
}

async function verifyImplementationPin(
  rpcUrl: string,
  expected: string | null | undefined,
  selectors: Parameters<typeof observeImplementationFingerprint>[2] | undefined,
  label: string,
): Promise<void> {
  if (!expected) return;
  if (!selectors || selectors.length === 0) {
    throw new Error(`${label} implementation fingerprint has no selectors`);
  }
  const actual = await observeImplementationFingerprint(
    rpcUrl,
    "head",
    selectors,
    15_000,
  );
  if (actual !== expected) {
    throw new Error(
      `${label} mutable implementation fingerprint mismatch: expected ${expected}, got ${actual}`,
    );
  }
}

async function verifyNative(
  state: NativePoolDeploymentState,
  pauseExpectation: boolean,
): Promise<Record<string, unknown>> {
  if (state.config.poolType !== "mod") {
    throw new Error("The launch invariant verifier supports hardened modified pools only");
  }
  const poolAddress = required(state.steps.dex?.address, "Deployment state has no DEX address");
  const lqtAddress = required(state.steps.lqt?.address, "Deployment state has no LQT address");
  const tezos = new TezosToolkit(process.env.DEPLOYMENT_VERIFY_RPC?.trim() || state.rpc);
  await verifyChain(tezos, state.chainId);
  await assertCodeHashes(tezos, [
    { address: poolAddress, expected: state.artifacts.dex.codeSha256, label: "Pool" },
    { address: lqtAddress, expected: state.artifacts.lqt.codeSha256, label: "LQT" },
    { address: state.config.tokenAddress, expected: state.artifacts.tokenCodeSha256, label: "Token" },
  ]);
  await verifyImplementationPin(
    tezos.rpc.getRpcUrl(),
    state.config.tokenOperations.implementationSha256,
    state.config.tokenOperations.implementationSelectors,
    "Token",
  );
  const [pool, lqt] = await Promise.all([
    tezos.contract.at(poolAddress),
    tezos.contract.at(lqtAddress),
  ]);
  const [poolStorage, lqtStorage, xtzBalance, tokenBalance, delegate] = await Promise.all([
    pool.storage() as Promise<Record<string, unknown>>,
    lqt.storage() as Promise<Record<string, unknown>>,
    tezos.tz.getBalance(poolAddress),
    getTokenBalance(
      tezos,
      state.config.tokenAddress,
      poolAddress,
      state.config.tokenStandard,
      state.config.tokenId,
      process.env.DEPLOYMENT_VERIFY_TZKT_API?.trim(),
    ),
    tezos.rpc.getDelegate(poolAddress),
  ]);
  if (String(poolStorage.tokenAddress) !== state.config.tokenAddress) {
    throw new Error("Pool token address differs from the release manifest");
  }
  if (String(poolStorage.lqtAddress) !== lqtAddress) {
    throw new Error("Pool LQT address differs from the release manifest");
  }
  const lqtTokens = lqtStorage.tokens as { get?: (owner: string) => Promise<unknown> };
  if (!lqtTokens || typeof lqtTokens.get !== "function") {
    throw new Error("LQT storage does not expose the expected ledger");
  }
  const locked = await lqtTokens.get(poolAddress);
  await verifyLqtMetadata(
    lqtStorage,
    state.config.metadataUri,
    state.config.tokenMetadataUri,
  );
  assertNativePoolInvariants({
    poolAddress,
    poolStorage,
    lqtAdmin: lqtStorage.admin,
    lqtTotalSupply: lqtStorage.total_supply,
    lockedLqtBalance: locked ?? 0,
    actualXtzBalance: xtzBalance,
    actualTokenBalance: tokenBalance,
    expectedManager: state.config.finalManager,
    expectedFeeRecipient: state.config.protocolFeeRecipient,
    expectedPaused: pauseExpectation,
    actualDelegate: delegate,
    expectedDelegate: process.env.EXPECTED_POOL_DELEGATE?.trim() || null,
  });
  return {
    kind: "native",
    chainId: state.chainId,
    poolAddress,
    lqtAddress,
    paused: pauseExpectation,
  };
}

async function verifyTokenToken(
  state: TokenTokenDeploymentState,
  pauseExpectation: boolean,
): Promise<Record<string, unknown>> {
  const poolAddress = required(state.steps.pool?.address, "Deployment state has no pool address");
  const lqtAddress = required(state.steps.lqt?.address, "Deployment state has no LQT address");
  const tezos = new TezosToolkit(process.env.DEPLOYMENT_VERIFY_RPC?.trim() || state.rpc);
  await verifyChain(tezos, state.chainId);
  await assertCodeHashes(tezos, [
    { address: poolAddress, expected: state.artifacts.pool.codeSha256, label: "Pool" },
    { address: lqtAddress, expected: state.artifacts.lqt.codeSha256, label: "LQT" },
    { address: state.config.tokenA.address, expected: state.config.tokenA.codeSha256, label: "Token A" },
    { address: state.config.tokenB.address, expected: state.config.tokenB.codeSha256, label: "Token B" },
  ]);
  await Promise.all([
    verifyImplementationPin(
      tezos.rpc.getRpcUrl(),
      state.config.tokenA.implementationSha256,
      state.config.tokenA.implementationSelectors,
      "Token A",
    ),
    verifyImplementationPin(
      tezos.rpc.getRpcUrl(),
      state.config.tokenB.implementationSha256,
      state.config.tokenB.implementationSelectors,
      "Token B",
    ),
  ]);
  const [pool, lqt] = await Promise.all([
    tezos.contract.at(poolAddress),
    tezos.contract.at(lqtAddress),
  ]);
  const [poolStorage, lqtStorage, balanceA, balanceB] = await Promise.all([
    pool.storage() as Promise<Record<string, unknown>>,
    lqt.storage() as Promise<Record<string, unknown>>,
    getTokenBalance(
      tezos,
      state.config.tokenA.address,
      poolAddress,
      state.config.tokenA.standard,
      state.config.tokenA.tokenId,
      process.env.DEPLOYMENT_VERIFY_TZKT_API?.trim(),
    ),
    getTokenBalance(
      tezos,
      state.config.tokenB.address,
      poolAddress,
      state.config.tokenB.standard,
      state.config.tokenB.tokenId,
      process.env.DEPLOYMENT_VERIFY_TZKT_API?.trim(),
    ),
  ]);
  assertPoolIdentityStorage(poolStorage, {
    tokenA: state.config.tokenA,
    tokenB: state.config.tokenB,
    feeRecipient: state.config.feeRecipient,
  });
  if (String(poolStorage.lqt_address) !== lqtAddress) {
    throw new Error("Pool LQT address differs from the release manifest");
  }
  const lqtTokens = lqtStorage.tokens as { get?: (owner: string) => Promise<unknown> };
  if (!lqtTokens || typeof lqtTokens.get !== "function") {
    throw new Error("LQT storage does not expose the expected ledger");
  }
  const locked = await lqtTokens.get(poolAddress);
  await verifyLqtMetadata(
    lqtStorage,
    state.config.lqtContractMetadataUri,
    state.config.lqtTokenMetadataUri,
  );
  assertTokenTokenPoolInvariants({
    poolAddress,
    poolStorage,
    lqtAdmin: lqtStorage.admin,
    lqtTotalSupply: lqtStorage.total_supply,
    lockedLqtBalance: locked ?? 0,
    actualBalanceA: balanceA,
    actualBalanceB: balanceB,
    expectedManager: state.config.finalManager,
    expectedFeeRecipient: state.config.feeRecipient,
    expectedPaused: pauseExpectation,
  });
  return {
    kind: "token-token",
    chainId: state.chainId,
    poolAddress,
    lqtAddress,
    paused: pauseExpectation,
  };
}

async function main(): Promise<void> {
  const kind = required(
    process.env.POOL_INVARIANT_KIND,
    "Set POOL_INVARIANT_KIND=native or token-token",
  );
  const pauseExpectation = expectedPaused();
  let result: Record<string, unknown>;
  if (kind === "native") {
    const state = await loadDeploymentState(stateArgument("DEX_DEPLOYMENT_STATE"));
    if (!state) throw new Error("Native deployment state does not exist");
    result = await verifyNative(state, pauseExpectation);
  } else if (kind === "token-token") {
    const state = await loadTokenTokenDeploymentState(
      stateArgument("TOKEN_TOKEN_DEPLOYMENT_STATE"),
    );
    if (!state) throw new Error("Token-to-token deployment state does not exist");
    result = await verifyTokenToken(state, pauseExpectation);
  } else {
    throw new Error("POOL_INVARIANT_KIND must be native or token-token");
  }
  console.log(JSON.stringify({ status: "ok", ...result }, null, 2));
}

main().catch((error: unknown) => {
  console.error(
    `Pool invariant verification failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
