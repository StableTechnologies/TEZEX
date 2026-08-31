import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  loadTokenTokenDeploymentState,
  persistTokenTokenDeploymentState,
  shareableTokenTokenDeploymentState,
  TOKEN_TOKEN_DEPLOYMENT_STATE_VERSION,
  type TokenTokenDeploymentState,
} from "./token-token-deployment-state.js";

function state(): TokenTokenDeploymentState {
  return {
    version: TOKEN_TOKEN_DEPLOYMENT_STATE_VERSION,
    fingerprint: "fingerprint",
    network: "mainnet",
    rpc: "https://rpc.example.invalid/credential",
    chainId: "NetXdQprcVkpaWU",
    sourceCommit: "a".repeat(40),
    sourceDirty: false,
    compilerVersion: "1.11.5",
    signerMode: "remote",
    artifacts: {
      pool: { path: "/private/pool.tz", sha256: "a".repeat(64), codeSha256: "b".repeat(64) },
      lqt: { path: "/private/lqt.tz", sha256: "c".repeat(64), codeSha256: "d".repeat(64) },
    },
    deployer: "tz1-deployer",
    config: {
      tokenA: { standard: "FA2", address: "KT1-a", tokenId: "0", codeSha256: "e".repeat(64) },
      tokenB: { standard: "FA1.2", address: "KT1-b", tokenId: "0", codeSha256: "f".repeat(64) },
      seedAmountA: "1000000",
      seedAmountB: "100000",
      seedReceiver: "KT1-receiver",
      finalManager: "KT1-manager",
      feeRecipient: "KT1-recipient",
      roleThresholds: { manager: 2, feeRecipient: 2 },
      tokenOperations: { integrationOwner: "ops", incidentChannel: "incidents" },
      poolMetadataUri: "ipfs://pool",
      lqtContractMetadataUri: "ipfs://contract",
      lqtTokenMetadataUri: "ipfs://token",
    },
    steps: {},
  };
}

test("token-to-token state is atomic, owner-only, and versioned", async () => {
  const directory = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), "tezex-token-token-state-"),
  );
  const filename = path.join(directory, "state.json");
  const expected = state();
  await persistTokenTokenDeploymentState(filename, expected);
  assert.deepEqual(await loadTokenTokenDeploymentState(filename), expected);
  assert.equal((await fs.promises.stat(filename)).mode & 0o777, 0o600);

  const stale = { ...expected, version: 1 };
  await fs.promises.writeFile(filename, JSON.stringify(stale));
  await assert.rejects(
    loadTokenTokenDeploymentState(filename),
    /Unsupported token-to-token deployment-state version/,
  );
});

test("shareable state removes RPC credentials and absolute artifact paths", () => {
  const shared = shareableTokenTokenDeploymentState(state());
  assert.equal(shared.rpc, "");
  assert.equal(shared.artifacts.pool.path, "pool.tz");
  assert.equal(shared.artifacts.lqt.path, "lqt.tz");
});
