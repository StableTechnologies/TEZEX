import assert from "node:assert/strict";
import test from "node:test";

import {
  MINIMUM_LQT,
  protocolFee,
  quoteOutput,
} from "./token-token-math.js";

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  assert(denominator > 0n);
  return (numerator + denominator - 1n) / denominator;
}

function nextRandom(state: bigint): bigint {
  return (state * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n)
    & ((1n << 64n) - 1n);
}

test("swap rounding preserves product and cannot profit from round trips or splitting", () => {
  let cases = 0;
  for (let reserveIn = 1n; reserveIn <= 60n; reserveIn++) {
    for (let reserveOut = 1n; reserveOut <= 60n; reserveOut++) {
      for (let amountIn = 1n; amountIn <= 60n; amountIn++) {
        const amountOut = quoteOutput(amountIn, reserveIn, reserveOut);
        if (amountOut > 0n) {
          const newReserveIn = reserveIn + amountIn - protocolFee(amountIn);
          const newReserveOut = reserveOut - amountOut;
          assert(newReserveOut > 0n);
          assert(newReserveIn * newReserveOut >= reserveIn * reserveOut);
          assert(
            quoteOutput(amountOut, newReserveOut, newReserveIn) <= amountIn,
            "a fee-paying round trip created input-token profit",
          );
        }

        for (let first = 1n; first < amountIn; first++) {
          const firstOut = quoteOutput(first, reserveIn, reserveOut);
          const afterIn = reserveIn + first - protocolFee(first);
          const afterOut = reserveOut - firstOut;
          const secondOut = quoteOutput(
            amountIn - first,
            afterIn,
            afterOut,
          );
          assert(
            firstOut + secondOut <= amountOut,
            "splitting a trade improved its aggregate output",
          );
        }
        cases++;
      }
    }
  }
  assert.equal(cases, 216_000);
});

test("liquidity add/remove rounding never returns more than was deposited", () => {
  let cases = 0;
  for (let reserveA = 1n; reserveA <= 20n; reserveA++) {
    for (let reserveB = 1n; reserveB <= 20n; reserveB++) {
      for (let total = 1n; total <= 20n; total++) {
        for (let maxA = 1n; maxA <= 10n; maxA++) {
          for (let maxB = 1n; maxB <= 10n; maxB++) {
            const fromA = maxA * total / reserveA;
            const fromB = maxB * total / reserveB;
            const minted = fromA < fromB ? fromA : fromB;
            if (minted === 0n) continue;
            const amountA = ceilDiv(minted * reserveA, total);
            const amountB = ceilDiv(minted * reserveB, total);
            assert(amountA <= maxA && amountB <= maxB);
            const newTotal = total + minted;
            const withdrawnA = minted * (reserveA + amountA) / newTotal;
            const withdrawnB = minted * (reserveB + amountB) / newTotal;
            assert(withdrawnA <= amountA && withdrawnB <= amountB);
            cases++;
          }
        }
      }
    }
  }
  assert(cases > 500_000);
});

test("native-pool proportional rounding cannot create add/remove profit", () => {
  let cases = 0;
  for (let xtzReserve = 1n; xtzReserve <= 80n; xtzReserve++) {
    for (let tokenReserve = 1n; tokenReserve <= 80n; tokenReserve++) {
      for (let total = 1n; total <= 80n; total++) {
        for (let xtzIn = 1n; xtzIn <= 20n; xtzIn++) {
          const minted = xtzIn * total / xtzReserve;
          if (minted === 0n) continue;
          const tokenIn = ceilDiv(xtzIn * tokenReserve, xtzReserve);
          const newTotal = total + minted;
          const xtzOut = minted * (xtzReserve + xtzIn) / newTotal;
          const tokenOut = minted * (tokenReserve + tokenIn) / newTotal;
          assert(xtzOut <= xtzIn && tokenOut <= tokenIn);
          cases++;
        }
      }
    }
  }
  assert(cases > 5_000_000);
});

test("stateful swaps and fee claims preserve exact reserve solvency", () => {
  let reserveA = 100_000_000n;
  let reserveB = 150_000_000n;
  let heldA = reserveA;
  let heldB = reserveB;
  let feeA = 0n;
  let feeB = 0n;
  let random = 0x54455a4558n;

  for (let index = 0; index < 50_000; index++) {
    random = nextRandom(random);
    const amountIn = (random % 1_000_000n) + 1n;
    const oldProduct = reserveA * reserveB;
    if ((random & 1n) === 0n) {
      const amountOut = quoteOutput(amountIn, reserveA, reserveB);
      heldA += amountIn;
      heldB -= amountOut;
      reserveA += amountIn - protocolFee(amountIn);
      reserveB -= amountOut;
      feeA += protocolFee(amountIn);
    } else {
      const amountOut = quoteOutput(amountIn, reserveB, reserveA);
      heldB += amountIn;
      heldA -= amountOut;
      reserveB += amountIn - protocolFee(amountIn);
      reserveA -= amountOut;
      feeB += protocolFee(amountIn);
    }
    assert(reserveA * reserveB >= oldProduct);
    assert.equal(heldA, reserveA + feeA);
    assert.equal(heldB, reserveB + feeB);

    if (index % 997 === 0) {
      heldA -= feeA;
      heldB -= feeB;
      feeA = 0n;
      feeB = 0n;
      assert.equal(heldA, reserveA);
      assert.equal(heldB, reserveB);
    }
  }

  assert(reserveA > 0n && reserveB > 0n);
  assert(MINIMUM_LQT > 0n);
});
