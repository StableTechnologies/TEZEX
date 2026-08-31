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

test("script hashing normalizes Octez top-level VIEW placement", () => {
  const parameter = { prim: "parameter", args: [{ prim: "unit" }] };
  const storage = { prim: "storage", args: [{ prim: "unit" }] };
  const code = { prim: "code", args: [[]] };
  const firstView = { prim: "view", args: [{ string: "a" }] };
  const secondView = { prim: "view", args: [{ string: "b" }] };

  assert.equal(
    scriptCodeSha256([parameter, storage, code, firstView, secondView]),
    scriptCodeSha256([firstView, secondView, parameter, storage, code]),
  );
  assert.notEqual(
    scriptCodeSha256([parameter, storage, code, firstView, secondView]),
    scriptCodeSha256([parameter, storage, code, secondView, firstView]),
  );
});

test("script hashing normalizes Octez PUSH address byte literals", () => {
  const stringLiteral = {
    prim: "PUSH",
    args: [
      { prim: "address" },
      { string: "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU" },
    ],
  };
  const byteLiteral = {
    prim: "PUSH",
    args: [
      { prim: "address" },
      { bytes: "00000000000000000000000000000000000000000000" },
    ],
  };
  assert.equal(scriptCodeSha256(stringLiteral), scriptCodeSha256(byteLiteral));
});
