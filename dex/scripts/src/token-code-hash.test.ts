import assert from "node:assert/strict";
import test from "node:test";

import { canonicalJson, scriptCodeSha256 } from "./token-code-hash.js";

test("canonical script hashing ignores JSON object property order", () => {
  const left = [{ prim: "pair", args: [{ int: "0" }], annots: ["%value"] }];
  const right = [{ annots: ["%value"], args: [{ int: "0" }], prim: "pair" }];
  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(scriptCodeSha256(left), scriptCodeSha256(right));
});

test("canonical script hashing preserves array order and values", () => {
  assert.notEqual(scriptCodeSha256(["a", "b"]), scriptCodeSha256(["b", "a"]));
  assert.notEqual(scriptCodeSha256({ int: "1" }), scriptCodeSha256({ int: "2" }));
});
