import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { b58Encode, PrefixV2 } from "@taquito/utils";

import {
  assertTokenTokenDeploymentChain,
  parseTokenTokenConfig,
  TEZOS_MAINNET_CHAIN_ID,
} from "./token-token-config.js";
import {
  calculateInitialLqt,
  integerSquareRoot,
  protocolFee,
  quoteOutput,
} from "./token-token-math.js";
import {
  assertPoolIdentityStorage,
  buildEmptyLqtStorage,
  buildTokenTokenInitialStorage,
} from "./token-token-storage.js";

const contractAddress = (byte: number): string =>
  b58Encode(new Uint8Array(20).fill(byte), PrefixV2.ContractHash);
const implicitAddress = (byte: number): string =>
  b58Encode(new Uint8Array(20).fill(byte), PrefixV2.Ed25519PublicKeyHash);

function validEnv(): NodeJS.ProcessEnv {
  return {
    PREVIEWNET_RPC: "https://preview.example.invalid",
    PREVIEWNET_TZKT_API: "https://preview-indexer.example.invalid",
    PREVIEWNET_CHAIN_ID: "NetXPreview",
    PREVIEWNET_PRIVATE_KEY: "unencrypted:test-only-placeholder",
    TOKEN_A_STANDARD: "FA2",
    TOKEN_A_ADDRESS: contractAddress(1),
    TOKEN_A_ID: "0",
    TOKEN_A_CODE_SHA256: "b".repeat(64),
    TOKEN_B_STANDARD: "FA1.2",
    TOKEN_B_ADDRESS: contractAddress(2),
    TOKEN_B_CODE_SHA256: "c".repeat(64),
    SEED_AMOUNT_A: "1000000",
    SEED_AMOUNT_B: "100000000",
    FINAL_MANAGER: implicitAddress(3),
    PROTOCOL_FEE_RECIPIENT: implicitAddress(4),
    TOKEN_TOKEN_POOL_METADATA_URI: "ipfs://poolcid",
    TOKEN_TOKEN_LQT_CONTRACT_METADATA_URI: "ipfs://contractcid",
    TOKEN_TOKEN_LQT_TOKEN_METADATA_URI: "ipfs://tokencid",
    TOKEN_TOKEN_ARTIFACT_SHA256: "a".repeat(64),
  };
}

function validMainnetEnv(): NodeJS.ProcessEnv {
  return {
    ...validEnv(),
    MAINNET_RPC: "https://mainnet.example.invalid",
    MAINNET_TZKT_API: "https://mainnet-indexer.example.invalid",
    MAINNET_PRIVATE_KEY: "unencrypted:test-only-placeholder",
    FINAL_MANAGER: contractAddress(3),
    PROTOCOL_FEE_RECIPIENT: contractAddress(4),
    SEED_RECEIVER: contractAddress(3),
    MANAGER_MULTISIG_THRESHOLD: "2",
    PROTOCOL_FEE_RECIPIENT_MULTISIG_THRESHOLD: "2",
    TOKEN_INTEGRATION_OWNER: "operations-team",
    TOKEN_INCIDENT_CHANNEL: "incident-channel",
    TOKEN_TOKEN_LQT_ARTIFACT_SHA256: "d".repeat(64),
    EXPECTED_SOURCE_COMMIT: "e".repeat(40),
    MANAGER_MULTISIG_CODE_SHA256: "f".repeat(64),
    MANAGER_MULTISIG_OWNERS:
      `${implicitAddress(10)},${implicitAddress(11)},${implicitAddress(12)}`,
    PROTOCOL_FEE_RECIPIENT_MULTISIG_CODE_SHA256: "1".repeat(64),
    PROTOCOL_FEE_RECIPIENT_MULTISIG_OWNERS:
      `${implicitAddress(10)},${implicitAddress(11)},${implicitAddress(12)}`,
  };
}

function storageType(filename: string): unknown {
  const source = fs.readFileSync(path.join("..", "compiled_contracts", filename), "utf8");
  const script = new Parser().parseScript(source);
  assert.ok(Array.isArray(script));
  const section = script.find(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "prim" in item &&
      item.prim === "storage",
  ) as { args?: unknown[] } | undefined;
  assert.ok(section?.args?.[0]);
  return section.args[0];
}

test("parses a generic mixed-standard Previewnet configuration", () => {
  const config = parseTokenTokenConfig("previewnet", validEnv());
  assert.deepEqual(config.tokenA, {
    standard: "FA2",
    address: contractAddress(1),
    tokenId: "0",
    codeSha256: "b".repeat(64),
    controlProfile: "generic",
    implementationSha256: undefined,
    implementationSelectors: [],
  });
  assert.deepEqual(config.tokenB, {
    standard: "FA1.2",
    address: contractAddress(2),
    tokenId: "0",
    codeSha256: "c".repeat(64),
    controlProfile: "generic",
    implementationSha256: undefined,
    implementationSelectors: [],
  });
  assert.equal(config.finalManager, implicitAddress(3));
  assert.equal(config.confirmations, 2);
});

test("accepts FA1.2/FA1.2 and FA2/FA2 without changing the artifact", () => {
  const fa12 = validEnv();
  fa12.TOKEN_A_STANDARD = "FA1.2";
  delete fa12.TOKEN_A_ID;
  assert.equal(parseTokenTokenConfig("previewnet", fa12).tokenA.tokenId, "0");

  const fa2 = validEnv();
  fa2.TOKEN_B_STANDARD = "FA2";
  fa2.TOKEN_B_ID = "7";
  assert.equal(parseTokenTokenConfig("previewnet", fa2).tokenB.tokenId, "7");
});

test("rejects identical assets and incompatible same-address descriptors", () => {
  const env = validEnv();
  env.TOKEN_B_ADDRESS = env.TOKEN_A_ADDRESS;
  assert.throws(
    () => parseTokenTokenConfig("previewnet", env),
    /incompatible token standards/,
  );

  const identical = validEnv();
  identical.TOKEN_B_STANDARD = "FA2";
  identical.TOKEN_B_ADDRESS = identical.TOKEN_A_ADDRESS;
  identical.TOKEN_B_ID = identical.TOKEN_A_ID;
  assert.throws(
    () => parseTokenTokenConfig("previewnet", identical),
    /distinct assets/,
  );
});

test("accepts distinct FA2 token IDs from the same reviewed contract", () => {
  const env = validEnv();
  env.TOKEN_B_STANDARD = "FA2";
  env.TOKEN_B_ADDRESS = env.TOKEN_A_ADDRESS;
  env.TOKEN_B_ID = "7";
  env.TOKEN_B_CODE_SHA256 = env.TOKEN_A_CODE_SHA256;
  const config = parseTokenTokenConfig("previewnet", env);
  assert.equal(config.tokenA.address, config.tokenB.address);
  assert.equal(config.tokenB.tokenId, "7");
});

test("validates geometric-mean minimum liquidity instead of each seed", () => {
  const env = validEnv();
  env.SEED_AMOUNT_A = "1";
  env.SEED_AMOUNT_B = "1000000";
  assert.throws(
    () => parseTokenTokenConfig("previewnet", env),
    /geometric-mean LQT supply/,
  );
  env.SEED_AMOUNT_B = "1004004";
  assert.equal(calculateInitialLqt(env.SEED_AMOUNT_A, env.SEED_AMOUNT_B), "1002");
  assert.doesNotThrow(() => parseTokenTokenConfig("previewnet", env));
});

test("requires immutable IPFS metadata and exact artifact hash", () => {
  const metadata = validEnv();
  metadata.TOKEN_TOKEN_POOL_METADATA_URI = "https://mutable.invalid/pool.json";
  assert.throws(
    () => parseTokenTokenConfig("previewnet", metadata),
    /immutable ipfs/,
  );
  const hash = validEnv();
  hash.TOKEN_TOKEN_ARTIFACT_SHA256 = "not-a-hash";
  assert.throws(
    () => parseTokenTokenConfig("previewnet", hash),
    /SHA-256/,
  );
  const lqtHash = validEnv();
  lqtHash.TOKEN_TOKEN_LQT_ARTIFACT_SHA256 = "not-a-hash";
  assert.throws(
    () => parseTokenTokenConfig("previewnet", lqtHash),
    /TOKEN_TOKEN_LQT_ARTIFACT_SHA256.*SHA-256/,
  );
});

test("exact token-control profiles require mutable implementation pins", () => {
  const missing = validEnv();
  missing.TOKEN_A_CONTROL_PROFILE = "usdt";
  assert.throws(
    () => parseTokenTokenConfig("previewnet", missing),
    /Exact TOKEN_A_CONTROL_PROFILE requires implementation/,
  );
  missing.TOKEN_A_IMPLEMENTATION_SHA256 = "9".repeat(64);
  missing.TOKEN_A_IMPLEMENTATION_SELECTORS =
    "31:exprtu6vJPJCkTXVHfqSY4e3WUVnRgozHnAZoFRrEyCE8XfHRi9LZm";
  const config = parseTokenTokenConfig("previewnet", missing);
  assert.equal(config.tokenA.controlProfile, "usdt");
  assert.equal(config.tokenA.implementationSha256, "9".repeat(64));
  assert.equal(config.tokenA.implementationSelectors.length, 1);
});

test("rejects malformed token and control addresses before any RPC call", () => {
  const token = validEnv();
  token.TOKEN_A_ADDRESS = "not-a-contract";
  assert.throws(() => parseTokenTokenConfig("previewnet", token), /originated contract/);
  const manager = validEnv();
  manager.FINAL_MANAGER = "not-an-address";
  assert.throws(() => parseTokenTokenConfig("previewnet", manager), /valid Tezos address/);
  const receiver = validEnv();
  receiver.SEED_RECEIVER = "not-an-address";
  assert.throws(() => parseTokenTokenConfig("previewnet", receiver), /valid Tezos address/);
});

test("integer square root and fee math match contract ordering", () => {
  assert.equal(integerSquareRoot(0n), 0n);
  assert.equal(integerSquareRoot(1n), 1n);
  assert.equal(integerSquareRoot(100_000_000_000_000n), 10_000_000n);
  assert.equal(integerSquareRoot(100_000_000_000_001n), 10_000_000n);
  assert.equal(protocolFee(1_999n), 0n);
  assert.equal(protocolFee(2_000n), 1n);
  const output = quoteOutput(100_000n, 1_000_000n, 100_000_000n);
  assert.equal(output, 9_066_108n);
});

test("encodes pool and empty external LQT storage against compiled schemas", () => {
  const config = parseTokenTokenConfig("previewnet", validEnv());
  const deployer = implicitAddress(5);
  const poolSchema = new Schema(storageType("token_token_pool.tz") as never);
  const lqtSchema = new Schema(storageType("lqt.tz") as never);
  assert.doesNotThrow(() =>
    poolSchema.Encode(buildTokenTokenInitialStorage(config, deployer)),
  );
  assert.doesNotThrow(() =>
    lqtSchema.Encode(buildEmptyLqtStorage(config, contractAddress(6))),
  );
});

test("verifies immutable pool assets and protocol-fee recipient storage", () => {
  const config = parseTokenTokenConfig("previewnet", validEnv());
  const poolSchema = new Schema(storageType("token_token_pool.tz") as never);
  const encodedStorage = poolSchema.Encode(
    buildTokenTokenInitialStorage(config, implicitAddress(5)),
  );
  const storage = poolSchema.Execute(encodedStorage) as Record<string, unknown>;
  assert.doesNotThrow(() => assertPoolIdentityStorage(storage, config));

  assert.throws(
    () =>
      assertPoolIdentityStorage(
        { ...storage, token_a: storage.token_b },
        config,
      ),
    /token_a does not match/,
  );
  assert.throws(
    () =>
      assertPoolIdentityStorage(
        { ...storage, token_b: storage.token_a },
        config,
      ),
    /token_b does not match/,
  );
  assert.throws(
    () =>
      assertPoolIdentityStorage(
        { ...storage, protocol_fee_recipient: implicitAddress(6) },
        config,
      ),
    /protocol_fee_recipient does not match/,
  );
  assert.throws(
    () =>
      assertPoolIdentityStorage(
        { ...storage, pending_fee_recipient: implicitAddress(7) },
        config,
      ),
    /pending_fee_recipient is unexpectedly set/,
  );
});

test("parses Mainnet only with explicit production release controls", () => {
  const config = parseTokenTokenConfig("mainnet", validMainnetEnv());
  assert.equal(config.expectedChainId, TEZOS_MAINNET_CHAIN_ID);
  assert.equal(config.finalManager, contractAddress(3));
  assert.equal(config.seedReceiver, contractAddress(3));
  assert.equal(config.managerThreshold, 2);
  assert.equal(config.feeRecipientThreshold, 2);
  assert.equal(config.lqtArtifactSha256, "d".repeat(64));
  assert.equal(config.tokenIntegrationOwner, "operations-team");
  assert.equal(config.tokenIncidentChannel, "incident-channel");
  assert.equal(config.expectedSourceCommit, "e".repeat(40));
  assert.equal(config.managerMultisig?.threshold, 2);
  assert.equal(config.feeRecipientMultisig?.threshold, 2);
});

test("Mainnet rejects missing artifact, role, LP-owner, and operations gates", () => {
  const cases: Array<[string, RegExp]> = [
    ["TOKEN_TOKEN_LQT_ARTIFACT_SHA256", /LQT_ARTIFACT/],
    ["SEED_RECEIVER", /SEED_RECEIVER/],
    ["MANAGER_MULTISIG_THRESHOLD", /multisig/],
    ["PROTOCOL_FEE_RECIPIENT_MULTISIG_THRESHOLD", /multisig/],
    ["TOKEN_INTEGRATION_OWNER", /INTEGRATION_OWNER/],
    ["TOKEN_INCIDENT_CHANNEL", /INCIDENT_CHANNEL/],
    ["EXPECTED_SOURCE_COMMIT", /EXPECTED_SOURCE_COMMIT/],
    ["MANAGER_MULTISIG_CODE_SHA256", /MANAGER multisig verification/],
    ["MANAGER_MULTISIG_OWNERS", /MANAGER multisig verification/],
    [
      "PROTOCOL_FEE_RECIPIENT_MULTISIG_CODE_SHA256",
      /PROTOCOL_FEE_RECIPIENT multisig verification/,
    ],
  ];
  for (const [key, message] of cases) {
    const env = validMainnetEnv();
    delete env[key];
    assert.throws(() => parseTokenTokenConfig("mainnet", env), message);
  }

  const implicitManager = validMainnetEnv();
  implicitManager.FINAL_MANAGER = implicitAddress(3);
  assert.throws(
    () => parseTokenTokenConfig("mainnet", implicitManager),
    /originated multisig role addresses/,
  );
});

test("Mainnet requires at least two confirmations", () => {
  const env = validMainnetEnv();
  env.CONFIRMATIONS = "1";
  assert.throws(
    () => parseTokenTokenConfig("mainnet", env),
    /at least 2 confirmations/,
  );
});

test("rejects Mainnet even when hidden behind Previewnet environment names", () => {
  const env = validEnv();
  env.PREVIEWNET_RPC = "https://rpc.tzkt.io/mainnet";
  env.PREVIEWNET_CHAIN_ID = TEZOS_MAINNET_CHAIN_ID;
  assert.throws(
    () => parseTokenTokenConfig("previewnet", env),
    /refuses Tezos Mainnet/,
  );

  assert.throws(
    () =>
      assertTokenTokenDeploymentChain(
        "previewnet",
        "NetXPreview",
        TEZOS_MAINNET_CHAIN_ID,
      ),
    /refuses Tezos Mainnet/,
  );
  assert.throws(
    () =>
      assertTokenTokenDeploymentChain(
        "previewnet",
        "NetXPreview",
        "NetXWrong",
      ),
    /RPC chain ID mismatch/,
  );
  assert.doesNotThrow(() =>
    assertTokenTokenDeploymentChain("previewnet", "NetXPreview", "NetXPreview"),
  );
  assert.doesNotThrow(() =>
    assertTokenTokenDeploymentChain(
      "mainnet",
      TEZOS_MAINNET_CHAIN_ID,
      TEZOS_MAINNET_CHAIN_ID,
    ),
  );
  assert.throws(
    () =>
      assertTokenTokenDeploymentChain(
        "mainnet",
        "NetXPreview",
        "NetXPreview",
      ),
    /permanent Tezos Mainnet chain ID/,
  );
});

test("supports exactly one local or remote signer mode", () => {
  const remote = validMainnetEnv();
  delete remote.MAINNET_PRIVATE_KEY;
  remote.MAINNET_REMOTE_SIGNER_URL = "https://signer.example.invalid";
  remote.MAINNET_REMOTE_SIGNER_PKH = implicitAddress(9);
  const config = parseTokenTokenConfig("mainnet", remote);
  assert.equal(config.privateKey, undefined);
  assert.equal(config.remoteSignerPkh, implicitAddress(9));

  const both = validMainnetEnv();
  both.MAINNET_REMOTE_SIGNER_URL = "https://signer.example.invalid";
  both.MAINNET_REMOTE_SIGNER_PKH = implicitAddress(9);
  assert.throws(
    () => parseTokenTokenConfig("mainnet", both),
    /exactly one.*signer mode/,
  );
});
