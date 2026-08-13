import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { b58Encode, PrefixV2 } from "@taquito/utils";

import { parseTokenTokenConfig } from "./token-token-config.js";
import {
  calculateInitialLqt,
  integerSquareRoot,
  protocolFee,
  quoteOutput,
} from "./token-token-math.js";
import {
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
  });
  assert.deepEqual(config.tokenB, {
    standard: "FA1.2",
    address: contractAddress(2),
    tokenId: "0",
    codeSha256: "c".repeat(64),
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

test("does not expose a mainnet deployment mode", () => {
  const parse = parseTokenTokenConfig as unknown as (
    network: string,
    env: NodeJS.ProcessEnv,
  ) => unknown;
  assert.throws(() => parse("mainnet", validEnv()), /limited to Previewnet\/testnet/);
});
