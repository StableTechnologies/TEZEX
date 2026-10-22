import assert from "node:assert/strict";
import test from "node:test";

import {
  MINIMUM_LQT,
  protocolFee,
  quoteOutput,
} from "./token-token-math.js";

interface PoolState {
  reserveA: bigint;
  reserveB: bigint;
  supply: bigint;
}

interface AddResult {
  state: PoolState;
  minted: bigint;
  amountA: bigint;
  amountB: bigint;
}

interface RemoveResult {
  state: PoolState;
  amountA: bigint;
  amountB: bigint;
}

const MASK_64 = (1n << 64n) - 1n;

function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  assert(denominator > 0n);
  return (numerator + denominator - 1n) / denominator;
}

function min(left: bigint, right: bigint): bigint {
  return left < right ? left : right;
}

function nextRandom(state: bigint): bigint {
  return (state * 6_364_136_223_846_793_005n + 1_442_695_040_888_963_407n)
    & MASK_64;
}

function tokenTokenAdd(
  state: PoolState,
  maxAmountA: bigint,
  maxAmountB: bigint,
): AddResult | null {
  const minted = min(
    maxAmountA * state.supply / state.reserveA,
    maxAmountB * state.supply / state.reserveB,
  );
  if (minted === 0n) return null;
  const amountA = ceilDiv(minted * state.reserveA, state.supply);
  const amountB = ceilDiv(minted * state.reserveB, state.supply);
  assert(amountA <= maxAmountA && amountB <= maxAmountB);
  return {
    state: {
      reserveA: state.reserveA + amountA,
      reserveB: state.reserveB + amountB,
      supply: state.supply + minted,
    },
    minted,
    amountA,
    amountB,
  };
}

function nativeAdd(
  state: PoolState,
  amountA: bigint,
  vulnerableFloorCharge = false,
): AddResult | null {
  const minted = amountA * state.supply / state.reserveA;
  if (minted === 0n) return null;
  const amountB = vulnerableFloorCharge
    ? minted * state.reserveB / state.supply
    : ceilDiv(amountA * state.reserveB, state.reserveA);
  if (amountB === 0n) return null;
  return {
    state: {
      reserveA: state.reserveA + amountA,
      reserveB: state.reserveB + amountB,
      supply: state.supply + minted,
    },
    minted,
    amountA,
    amountB,
  };
}

function removeLiquidity(state: PoolState, burned: bigint): RemoveResult | null {
  assert(burned > 0n && burned < state.supply);
  const amountA = burned * state.reserveA / state.supply;
  const amountB = burned * state.reserveB / state.supply;
  if (amountA === 0n || amountB === 0n) return null;
  return {
    state: {
      reserveA: state.reserveA - amountA,
      reserveB: state.reserveB - amountB,
      supply: state.supply - burned,
    },
    amountA,
    amountB,
  };
}

function assertShareValueDidNotDecrease(
  before: PoolState,
  after: PoolState,
): void {
  assert(
    after.reserveA * before.supply >= before.reserveA * after.supply,
    "asset A per LP share decreased",
  );
  assert(
    after.reserveB * before.supply >= before.reserveB * after.supply,
    "asset B per LP share decreased",
  );
}

function runNativeMicroCycle(
  initial: PoolState,
  deposits: number,
  amountA: bigint,
  vulnerableFloorCharge: boolean,
): { final: PoolState; gainA: bigint; gainB: bigint } {
  let state = initial;
  let minted = 0n;
  let paidA = 0n;
  let paidB = 0n;
  for (let index = 0; index < deposits; index++) {
    const addition = nativeAdd(state, amountA, vulnerableFloorCharge);
    assert(addition);
    state = addition.state;
    minted += addition.minted;
    paidA += addition.amountA;
    paidB += addition.amountB;
  }
  const removal = removeLiquidity(state, minted);
  assert(removal);
  return {
    final: removal.state,
    gainA: removal.amountA - paidA,
    gainB: removal.amountB - paidB,
  };
}

function runTokenTokenMicroCycle(
  initial: PoolState,
  deposits: number,
  maxAmountA: bigint,
  maxAmountB: bigint,
): { final: PoolState; gainA: bigint; gainB: bigint } {
  let state = initial;
  let minted = 0n;
  let paidA = 0n;
  let paidB = 0n;
  for (let index = 0; index < deposits; index++) {
    const addition = tokenTokenAdd(state, maxAmountA, maxAmountB);
    assert(addition);
    state = addition.state;
    minted += addition.minted;
    paidA += addition.amountA;
    paidB += addition.amountB;
  }
  const removal = removeLiquidity(state, minted);
  assert(removal);
  return {
    final: removal.state,
    gainA: removal.amountA - paidA,
    gainB: removal.amountB - paidB,
  };
}

test("QuipuSwap micro-liquidity incident is an exact regression fixture", () => {
  const incidentState: PoolState = {
    reserveA: 21_532_127_571n,
    reserveB: 8_316_467n,
    supply: 3_220_671_028n,
  };

  const vulnerable = runNativeMicroCycle(incidentState, 90, 5_148n, true);
  assert.equal(vulnerable.gainA, -8n);
  assert.equal(vulnerable.gainB, 88n);
  assert.equal(vulnerable.final.supply, incidentState.supply);
  assert(
    vulnerable.final.reserveB < incidentState.reserveB,
    "the vulnerable mutation must reproduce the observed reserve extraction",
  );

  const fixedNative = runNativeMicroCycle(incidentState, 90, 5_148n, false);
  assert.equal(fixedNative.gainA, -8n);
  assert.equal(fixedNative.gainB, -2n);
  assert(fixedNative.final.reserveA >= incidentState.reserveA);
  assert(fixedNative.final.reserveB >= incidentState.reserveB);

  const fixedTokenToken = runTokenTokenMicroCycle(
    incidentState,
    90,
    5_148n,
    3n,
  );
  assert.equal(fixedTokenToken.gainA, -8n);
  assert.equal(fixedTokenToken.gainB, -2n);
  assert(fixedTokenToken.final.reserveA >= incidentState.reserveA);
  assert(fixedTokenToken.final.reserveB >= incidentState.reserveB);
});

test("rounding-direction mutations are killed by economic counterexamples", () => {
  // Rounding minted shares upward gives a depositor an under-collateralized
  // claim even when the second asset contribution is rounded upward.
  const state: PoolState = { reserveA: 2n, reserveB: 4n, supply: 1n };
  const amountA = 1n;
  const mintedUp = ceilDiv(amountA * state.supply, state.reserveA);
  const amountB = ceilDiv(amountA * state.reserveB, state.reserveA);
  const mutated = {
    reserveA: state.reserveA + amountA,
    reserveB: state.reserveB + amountB,
    supply: state.supply + mintedUp,
  };
  const redeemedA = mintedUp * mutated.reserveA / mutated.supply;
  const redeemedB = mintedUp * mutated.reserveB / mutated.supply;
  assert.equal(redeemedA, amountA);
  assert.equal(redeemedB, amountB + 1n);

  // Rounding withdrawals upward lets fragmented burns claim one atomic unit
  // per fragment and rapidly exceed the holder's proportional entitlement.
  let reserve = 10n;
  let supply = 100n;
  let paid = 0n;
  for (let index = 0; index < 10; index++) {
    const mutatedPayout = ceilDiv(reserve, supply);
    reserve -= mutatedPayout;
    supply -= 1n;
    paid += mutatedPayout;
  }
  assert.equal(paid, 10n);
  assert.equal(reserve, 0n);
  assert.equal(supply, 90n);
});

test("add and remove rounding never dilutes either reserve per LP share", () => {
  let random = 0x5155495055535741n;
  let checked = 0;
  for (let index = 0; index < 100_000; index++) {
    random = nextRandom(random);
    const shift = Number(random % 160n);
    random = nextRandom(random);
    const scale = 1n << BigInt(shift);
    const state: PoolState = {
      reserveA: (random % 1_000_003n + 1n) * scale,
      reserveB: (nextRandom(random) % 1_000_033n + 1n) * scale,
      supply: (nextRandom(nextRandom(random)) % 1_000_037n + 1n) * scale,
    };
    random = nextRandom(nextRandom(nextRandom(random)));
    const maxA = random % (state.reserveA / 2n + 1n) + 1n;
    random = nextRandom(random);
    const maxB = random % (state.reserveB / 2n + 1n) + 1n;

    const tokenAddition = tokenTokenAdd(state, maxA, maxB);
    if (tokenAddition) {
      assertShareValueDidNotDecrease(state, tokenAddition.state);
      assert(tokenAddition.amountA * state.supply >= tokenAddition.minted * state.reserveA);
      assert(tokenAddition.amountA * state.supply - tokenAddition.minted * state.reserveA < state.supply);
      assert(tokenAddition.amountB * state.supply >= tokenAddition.minted * state.reserveB);
      assert(tokenAddition.amountB * state.supply - tokenAddition.minted * state.reserveB < state.supply);
      const removal = removeLiquidity(tokenAddition.state, tokenAddition.minted);
      if (removal) {
        assertShareValueDidNotDecrease(tokenAddition.state, removal.state);
        assert(removal.amountA <= tokenAddition.amountA);
        assert(removal.amountB <= tokenAddition.amountB);
      }
      checked++;
    }

    const nativeAddition = nativeAdd(state, maxA);
    if (nativeAddition) {
      assertShareValueDidNotDecrease(state, nativeAddition.state);
      assert(nativeAddition.amountA * state.supply >= nativeAddition.minted * state.reserveA);
      assert(nativeAddition.amountB * state.reserveA >= nativeAddition.amountA * state.reserveB);
      assert(nativeAddition.amountB * state.reserveA - nativeAddition.amountA * state.reserveB < state.reserveA);
      const removal = removeLiquidity(nativeAddition.state, nativeAddition.minted);
      if (removal) {
        assertShareValueDidNotDecrease(nativeAddition.state, removal.state);
        assert(removal.amountA <= nativeAddition.amountA);
        assert(removal.amountB <= nativeAddition.amountB);
      }
      checked++;
    }
  }
  assert(checked > 100_000);
});

function exerciseClosedLiquidityCoalition(kind: "native" | "token-token", seed: bigint): void {
  let random = seed;
  const initial: PoolState = {
    reserveA: 10_000_019n + seed % 1_003n,
    reserveB: 30_000_023n + seed % 2_003n,
    supply: 17_320_519n + seed % 3_007n,
  };
  let state = initial;
  let coalitionLqt = 0n;

  for (let index = 0; index < 500; index++) {
    random = nextRandom(random);
    const shouldAdd = coalitionLqt === 0n || (random & 3n) !== 0n;
    if (shouldAdd) {
      const maxA = random % 100_000n + 1n;
      random = nextRandom(random);
      const maxB = random % 300_000n + 1n;
      const addition = kind === "native"
        ? nativeAdd(state, maxA)
        : tokenTokenAdd(state, maxA, maxB);
      if (!addition) continue;
      assertShareValueDidNotDecrease(state, addition.state);
      state = addition.state;
      coalitionLqt += addition.minted;
    } else {
      const burned = random % coalitionLqt + 1n;
      if (state.supply - burned < MINIMUM_LQT) continue;
      const removal = removeLiquidity(state, burned);
      if (!removal) continue;
      assertShareValueDidNotDecrease(state, removal.state);
      state = removal.state;
      coalitionLqt -= burned;
    }

    // Model voluntary reserve donations and synchronization. The donor is in
    // the adversarial coalition, so any amount later recovered is still
    // bounded by the coalition's own contribution.
    if ((random & 31n) === 0n) {
      random = nextRandom(random);
      state = {
        ...state,
        reserveA: state.reserveA + random % 17n + 1n,
        reserveB: state.reserveB + random % 19n + 1n,
      };
    }
  }

  if (coalitionLqt > 0n) {
    const removal = removeLiquidity(state, coalitionLqt);
    assert(removal, "a coalition-created LP position unexpectedly became unredeemable");
    state = removal.state;
  }
  assert.equal(state.supply, initial.supply);
  assert(
    state.reserveA >= initial.reserveA && state.reserveB >= initial.reserveB,
    "a multi-address liquidity coalition drained a reserve",
  );
}

test("stateful add/remove/donation coalitions cannot drain either pool model", () => {
  for (let seed = 1n; seed <= 200n; seed++) {
    exerciseClosedLiquidityCoalition("native", seed);
    exerciseClosedLiquidityCoalition("token-token", seed + 10_000n);
  }
});

test("mixed swap/liquidity/claim sequences preserve product and exact solvency", () => {
  let random = 0x54455a45582d414dn;
  let state: PoolState = {
    reserveA: 100_000_000n,
    reserveB: 150_000_000n,
    supply: 122_474_487n,
  };
  let heldA = state.reserveA;
  let heldB = state.reserveB;
  let feeA = 0n;
  let feeB = 0n;
  let coalitionLqt = 0n;

  for (let index = 0; index < 100_000; index++) {
    random = nextRandom(random);
    const action = Number(random % 8n);
    if (action <= 2) {
      const aToB = (random & 8n) === 0n;
      random = nextRandom(random);
      const amountIn = random % 1_000_000n + 1n;
      const reserveIn = aToB ? state.reserveA : state.reserveB;
      const reserveOut = aToB ? state.reserveB : state.reserveA;
      const amountOut = quoteOutput(amountIn, reserveIn, reserveOut);
      if (amountOut === 0n || amountOut >= reserveOut) continue;
      const oldProduct = state.reserveA * state.reserveB;
      const fee = protocolFee(amountIn);
      if (aToB) {
        heldA += amountIn;
        heldB -= amountOut;
        feeA += fee;
        state = {
          ...state,
          reserveA: state.reserveA + amountIn - fee,
          reserveB: state.reserveB - amountOut,
        };
      } else {
        heldB += amountIn;
        heldA -= amountOut;
        feeB += fee;
        state = {
          ...state,
          reserveA: state.reserveA - amountOut,
          reserveB: state.reserveB + amountIn - fee,
        };
      }
      assert(state.reserveA * state.reserveB >= oldProduct);
    } else if (action <= 4) {
      const maxA = random % 500_000n + 1n;
      random = nextRandom(random);
      const maxB = random % 500_000n + 1n;
      const addition = tokenTokenAdd(state, maxA, maxB);
      if (!addition) continue;
      assertShareValueDidNotDecrease(state, addition.state);
      heldA += addition.amountA;
      heldB += addition.amountB;
      coalitionLqt += addition.minted;
      state = addition.state;
    } else if (action === 5 && coalitionLqt > 0n) {
      const burned = random % coalitionLqt + 1n;
      if (state.supply - burned < MINIMUM_LQT) continue;
      const removal = removeLiquidity(state, burned);
      if (!removal) continue;
      assertShareValueDidNotDecrease(state, removal.state);
      heldA -= removal.amountA;
      heldB -= removal.amountB;
      coalitionLqt -= burned;
      state = removal.state;
    } else if (action === 6) {
      heldA -= feeA;
      feeA = 0n;
    } else if (action === 7) {
      heldB -= feeB;
      feeB = 0n;
    }
    assert.equal(heldA, state.reserveA + feeA);
    assert.equal(heldB, state.reserveB + feeB);
    assert(state.reserveA > 0n && state.reserveB > 0n);
    assert(state.supply >= MINIMUM_LQT);
  }
});

test("trade splitting cannot improve output at fee thresholds or large magnitudes", () => {
  let random = 0x53504c49542d4645n;
  for (let index = 0; index < 100_000; index++) {
    random = nextRandom(random);
    const shift = BigInt(random % 128n);
    const reserveIn = (nextRandom(random) % 1_000_003n + 1n) << shift;
    const reserveOut = (nextRandom(nextRandom(random)) % 1_000_033n + 1n) << shift;
    random = nextRandom(nextRandom(nextRandom(random)));
    const amountIn = random % 10_000_000n + 2n;
    random = nextRandom(random);
    const first = random % (amountIn - 1n) + 1n;
    const single = quoteOutput(amountIn, reserveIn, reserveOut);
    const firstOut = quoteOutput(first, reserveIn, reserveOut);
    const afterIn = reserveIn + first - protocolFee(first);
    const afterOut = reserveOut - firstOut;
    const secondOut = quoteOutput(amountIn - first, afterIn, afterOut);
    assert(
      firstOut + secondOut <= single,
      "splitting a trade bypassed fee or rounding economics",
    );
  }
});

