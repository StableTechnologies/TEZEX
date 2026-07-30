import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { b58Encode, PrefixV2 } from "@taquito/utils";
import { parseTokenTokenConfig } from "./token-token-config.js";
import { buildTokenTokenInitialStorage } from "./token-token-storage.js";

function validEnv(): NodeJS.ProcessEnv {
  return {
    TESTNET_PRIVATE_KEY: "unencrypted:test-only-placeholder",
    TOKEN_A_ADDRESS: "KT1TokenAPlaceholder",
    TOKEN_A_ID: "0",
    TOKEN_B_ADDRESS: "KT1TokenBPlaceholder",
    TOKEN_B_ID: "1",
    SEED_AMOUNT_A: "1000000",
    SEED_AMOUNT_B: "2000000",
    PROTOCOL_FEE_RECIPIENT: "KT1FeeRecipientPlaceholder",
    TOKEN_TOKEN_POOL_METADATA_URI: "ipfs://pool-metadata-placeholder",
    LP_TOKEN_METADATA_URI: "ipfs://lp-metadata-placeholder",
    LP_TOKEN_DECIMALS: "6",
  };
}

test("parses an asset-agnostic deployment config", () => {
  const config = parseTokenTokenConfig("testnet", validEnv());
  assert.equal(config.tokenA.tokenId, "0");
  assert.equal(config.tokenB.tokenId, "1");
  assert.equal(config.seedAmountA, "1000000");
  assert.equal(config.confirmations, 2);
});

test("rejects identical FA2 assets", () => {
  const env = validEnv();
  env.TOKEN_B_ADDRESS = env.TOKEN_A_ADDRESS;
  env.TOKEN_B_ID = env.TOKEN_A_ID;
  assert.throws(
    () => parseTokenTokenConfig("testnet", env),
    /must identify different FA2 assets/,
  );
});

test("rejects unsafe or fractional nat values", () => {
  const env = validEnv();
  env.SEED_AMOUNT_A = "1000.5";
  assert.throws(
    () => parseTokenTokenConfig("testnet", env),
    /unsigned base-10 integer/,
  );
});

test("rejects seed amounts that cannot fund the locked minimum", () => {
  const env = validEnv();
  env.SEED_AMOUNT_B = "1000";
  assert.throws(
    () => parseTokenTokenConfig("testnet", env),
    /must exceed the 1,000-unit minimum/,
  );
});

test("does not require a final admin address in source configuration", () => {
  const config = parseTokenTokenConfig("testnet", validEnv());
  assert.equal(config.finalAdmin, undefined);
});

test("encodes origination storage against the compiled Michelson schema", () => {
  const env = validEnv();
  env.TOKEN_A_ADDRESS = b58Encode(
    new Uint8Array(20).fill(1),
    PrefixV2.ContractHash,
  );
  env.TOKEN_B_ADDRESS = b58Encode(
    new Uint8Array(20).fill(2),
    PrefixV2.ContractHash,
  );
  env.PROTOCOL_FEE_RECIPIENT = b58Encode(
    new Uint8Array(20).fill(3),
    PrefixV2.Ed25519PublicKeyHash,
  );
  const deployer = b58Encode(
    new Uint8Array(20).fill(4),
    PrefixV2.Ed25519PublicKeyHash,
  );
  const config = parseTokenTokenConfig("testnet", env);

  const source = fs.readFileSync(
    path.join("..", "compiled_contracts", "token_token_pool.tz"),
    "utf8",
  );
  const script = new Parser().parseScript(source);
  assert.ok(Array.isArray(script));
  const storageSection = script.find(
    (section) =>
      typeof section === "object" &&
      section !== null &&
      "prim" in section &&
      section.prim === "storage",
  ) as { args?: never[] } | undefined;
  assert.ok(storageSection?.args?.[0]);

  const schema = new Schema(storageSection.args[0]);
  assert.doesNotThrow(() =>
    schema.Encode(buildTokenTokenInitialStorage(config, deployer)),
  );
});

test("requires an explicit mainnet origination confirmation", () => {
  const env = validEnv();
  env.MAINNET_PRIVATE_KEY = env.TESTNET_PRIVATE_KEY;
  assert.throws(
    () => parseTokenTokenConfig("mainnet", env),
    /CONFIRM_MAINNET_DEPLOYMENT/,
  );

  env.CONFIRM_MAINNET_DEPLOYMENT = "ORIGINATE_TOKEN_TOKEN_POOL";
  assert.equal(parseTokenTokenConfig("mainnet", env).network, "mainnet");
});
