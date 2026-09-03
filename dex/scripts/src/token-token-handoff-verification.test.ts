import assert from "node:assert/strict";
import test from "node:test";

import type { TokenTokenDeploymentState } from "./token-token-deployment-state.js";
import { assertFinalTokenTokenHandoff } from "./token-token-handoff-verification.js";

function fixture(): {
  state: TokenTokenDeploymentState;
  evidence: Parameters<typeof assertFinalTokenTokenHandoff>[1];
} {
  const pool = "KT1-pool";
  const state: TokenTokenDeploymentState = {
    version: 3,
    fingerprint: "fingerprint",
    network: "mainnet",
    rpc: "https://rpc.example.invalid",
    chainId: "NetXdQprcVkpaWU",
    sourceCommit: "a".repeat(40),
    sourceDirty: false,
    compilerVersion: "1.11.5",
    signerMode: "remote",
    artifacts: {
      pool: { path: "pool.tz", sha256: "a".repeat(64), codeSha256: "b".repeat(64) },
      lqt: { path: "lqt.tz", sha256: "c".repeat(64), codeSha256: "d".repeat(64) },
    },
    deployer: "tz1-deployer",
    config: {
      tokenA: {
        standard: "FA2", address: "KT1-a", tokenId: "0", codeSha256: "e".repeat(64),
        controlProfile: "generic", implementationSelectors: [],
      },
      tokenB: {
        standard: "FA1.2", address: "KT1-b", tokenId: "0", codeSha256: "f".repeat(64),
        controlProfile: "generic", implementationSelectors: [],
      },
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
      confirmations: 2,
    },
    steps: {
      pool: { address: pool, operation: "op-pool", status: "applied" },
      lqt: { address: "KT1-lqt", operation: "op-lqt", status: "applied" },
      verified: { at: "2026-08-31T00:00:00.000Z" },
    },
  };
  return {
    state,
    evidence: {
      poolStorage: {
        token_a: { fa2: { token: "KT1-a", id: "0" } },
        token_b: { fa12: "KT1-b" },
        protocol_fee_recipient: "KT1-recipient",
        pending_fee_recipient: null,
        active: true,
        paused: true,
        entered: false,
        manager: "KT1-manager",
        pending_manager: null,
        reserve_a: "1000000",
        reserve_b: "100000",
        protocol_fee_a: "0",
        protocol_fee_b: "0",
        lqt_total: "316227",
      },
      lqtAdmin: pool,
      lqtTotalSupply: "316227",
      lockedLqtBalance: "1000",
      providerLqtBalance: "315227",
      balanceA: 1_000_000n,
      balanceB: 100_000n,
    },
  };
}

test("accepts an exact completed token-to-token handoff", () => {
  const { state, evidence } = fixture();
  assert.doesNotThrow(() => assertFinalTokenTokenHandoff(state, evidence));
});

test("rejects incomplete roles, unpreserved seed, and broken LQT allocation", () => {
  const paused = fixture();
  paused.evidence.poolStorage.paused = false;
  assert.throws(
    () => assertFinalTokenTokenHandoff(paused.state, paused.evidence),
    /handoff is incomplete/,
  );

  const reserve = fixture();
  reserve.evidence.poolStorage.reserve_a = "999999";
  assert.throws(
    () => assertFinalTokenTokenHandoff(reserve.state, reserve.evidence),
    /Seed reserves/,
  );

  const lqt = fixture();
  lqt.evidence.providerLqtBalance = "315226";
  assert.throws(
    () => assertFinalTokenTokenHandoff(lqt.state, lqt.evidence),
    /LQT administration/,
  );
});
