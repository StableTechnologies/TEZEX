import assert from "node:assert/strict";
import test from "node:test";
import {
    calculateInitialLqt,
    formatMutez,
    integerSquareRoot,
    parseNat,
    toSafeNumber,
} from "./amounts.js";

test("integerSquareRoot floors exact arbitrary-precision values", () => {
    assert.equal(integerSquareRoot(0n), 0n);
    assert.equal(integerSquareRoot(1n), 1n);
    assert.equal(integerSquareRoot(15n), 3n);
    assert.equal(integerSquareRoot(16n), 4n);
    assert.equal(
        integerSquareRoot(1234567890123456789012345678901234567890n),
        35136418288201442531n
    );
});

test("calculateInitialLqt remains exact above Number.MAX_SAFE_INTEGER", () => {
    assert.equal(
        calculateInitialLqt("1000000000000000000", "250000000000000000"),
        "500000000000000000"
    );
});

test("parseNat rejects partial, signed, fractional, and exponential inputs", () => {
    for (const value of ["12abc", "-1", "+1", "1.5", "1e6", "01", ""]) {
        assert.throws(() => parseNat(value, "VALUE"));
    }
    assert.equal(parseNat(" 123 ", "VALUE"), "123");
});

test("toSafeNumber rejects values that Taquito cannot accept exactly", () => {
    assert.equal(toSafeNumber("9007199254740991", "VALUE"), Number.MAX_SAFE_INTEGER);
    assert.throws(() => toSafeNumber("9007199254740992", "VALUE"));
});

test("formatMutez uses integer formatting", () => {
    assert.equal(formatMutez("20000001"), "20.000001");
});
