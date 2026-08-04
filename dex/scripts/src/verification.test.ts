import assert from "node:assert/strict";
import test from "node:test";
import { verifyAtLeast, verifyEqual } from "./verification.js";

test("verifyEqual rejects a mismatched exact reserve", () => {
    assert.throws(
        () => verifyEqual("1000001", "1000000", "DEX tokenPool"),
        /expected 1000000, got 1000001/
    );
});

test("verifyAtLeast accepts an exact seed and donated excess", () => {
    assert.doesNotThrow(() => verifyAtLeast("1000000", "1000000", "DEX tokenPool"));
    assert.doesNotThrow(() => verifyAtLeast("1000001", "1000000", "DEX tokenPool"));
});

test("verifyAtLeast rejects an underfunded reserve", () => {
    assert.throws(
        () => verifyAtLeast("999999", "1000000", "DEX tokenPool"),
        /expected at least 1000000, got 999999/
    );
});
