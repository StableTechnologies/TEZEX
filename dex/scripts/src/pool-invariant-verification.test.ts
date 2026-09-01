import assert from "node:assert/strict";
import test from "node:test";

import {
  assertNativePoolInvariants,
  assertTokenTokenPoolInvariants,
} from "./pool-invariant-verification.js";

const native = {
  poolAddress: "KT1-pool",
  poolStorage: {
    active: true,
    paused: false,
    activationPending: false,
    selfIsUpdatingTokenPool: false,
    freezeBaker: false,
    manager: "KT1-manager",
    pending_manager: null,
    protocol_fee_recipient: "KT1-fees",
    pending_protocol_fee_recipient: null,
    xtzPool: "1000000",
    tokenPool: "2000000",
    accumulated_protocol_fee_xtz: "50",
    accumulated_protocol_fee_token: "100",
    lqtTotal: "1414213",
  },
  lqtAdmin: "KT1-pool",
  lqtTotalSupply: "1414213",
  lockedLqtBalance: "1000",
  actualXtzBalance: "1000050",
  actualTokenBalance: "2000100",
  expectedManager: "KT1-manager",
  expectedFeeRecipient: "KT1-fees",
  expectedPaused: false,
  actualDelegate: null,
};

test("native invariant verification accepts live activity but enforces liabilities", () => {
  assert.doesNotThrow(() => assertNativePoolInvariants(native));
  assert.doesNotThrow(() => assertNativePoolInvariants({
    ...native,
    poolStorage: {
      ...native.poolStorage,
      xtzPool: "800000",
      tokenPool: "2500000",
      lqtTotal: "1500000",
    },
    actualXtzBalance: "800050",
    actualTokenBalance: "2500100",
    lqtTotalSupply: "1500000",
  }));
  assert.throws(
    () => assertNativePoolInvariants({ ...native, actualXtzBalance: "1000049" }),
    /below reserves plus protocol fees/,
  );
  assert.throws(
    () => assertNativePoolInvariants({ ...native, actualDelegate: "tz1-delegate" }),
    /delegate mismatch/,
  );
});

const tokenToken = {
  poolAddress: "KT1-pool",
  poolStorage: {
    active: true,
    paused: false,
    entered: false,
    manager: "KT1-manager",
    pending_manager: null,
    protocol_fee_recipient: "KT1-fees",
    pending_fee_recipient: null,
    reserve_a: "1000000",
    reserve_b: "100000",
    protocol_fee_a: "25",
    protocol_fee_b: "5",
    lqt_total: "316227",
  },
  lqtAdmin: "KT1-pool",
  lqtTotalSupply: "316227",
  lockedLqtBalance: "1000",
  actualBalanceA: "1000025",
  actualBalanceB: "100005",
  expectedManager: "KT1-manager",
  expectedFeeRecipient: "KT1-fees",
  expectedPaused: false,
};

test("token-to-token invariant verification is fail-closed", () => {
  assert.doesNotThrow(() => assertTokenTokenPoolInvariants(tokenToken));
  assert.throws(
    () => assertTokenTokenPoolInvariants({
      ...tokenToken,
      poolStorage: { ...tokenToken.poolStorage, entered: true },
    }),
    /lifecycle flags/,
  );
  assert.throws(
    () => assertTokenTokenPoolInvariants({
      ...tokenToken,
      lqtTotalSupply: "316226",
    }),
    /supply mismatch/,
  );
  assert.throws(
    () => assertTokenTokenPoolInvariants({
      ...tokenToken,
      lockedLqtBalance: "999",
    }),
    /Permanent LQT lock/,
  );
});
