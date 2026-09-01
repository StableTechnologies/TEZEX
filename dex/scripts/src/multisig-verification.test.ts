import assert from "node:assert/strict";
import test from "node:test";

import { b58Encode, PrefixV2 } from "@taquito/utils";

import {
  assertMultisigStorage,
  parseMultisigExpectation,
} from "./multisig-verification.js";

const owner = (byte: number): string =>
  b58Encode(new Uint8Array(20).fill(byte), PrefixV2.Ed25519PublicKeyHash);

test("multisig expectations require exact code, owners, and feasible threshold", () => {
  const env = {
    MANAGER_MULTISIG_CODE_SHA256: "a".repeat(64),
    MANAGER_MULTISIG_OWNERS: `${owner(1)},${owner(2)},${owner(3)}`,
  };
  const expected = parseMultisigExpectation(env, "MANAGER", 2, true);
  assert.deepEqual(expected, {
    threshold: 2,
    owners: [owner(1), owner(2), owner(3)].sort(),
    codeSha256: "a".repeat(64),
  });
  assert.doesNotThrow(() => assertMultisigStorage({
    threshold: "2",
    owners: [owner(3), owner(1), owner(2)],
  }, expected!, "Manager"));
  assert.throws(
    () => assertMultisigStorage({
      threshold: "3",
      owners: [owner(1), owner(2), owner(3)],
    }, expected!, "Manager"),
    /threshold differs/,
  );
});
