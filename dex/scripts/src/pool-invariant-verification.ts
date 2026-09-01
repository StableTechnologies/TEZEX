const NAT_PATTERN = /^(0|[1-9][0-9]*)$/;
export const MINIMUM_LOCKED_LQT = 1_000n;

function nat(value: unknown, label: string): bigint {
  const candidate = value as { toString?: () => string };
  const normalized = candidate?.toString?.() ?? String(value);
  if (!NAT_PATTERN.test(normalized)) throw new Error(`${label} is not a nat`);
  return BigInt(normalized);
}

function optionAddress(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  const option = value as { Some?: unknown; some?: unknown };
  const address = option.Some ?? option.some;
  return address === undefined || address === null ? null : String(address);
}

function requireRole(
  actual: unknown,
  expected: string,
  label: string,
): void {
  if (String(actual) !== expected) {
    throw new Error(`${label} differs from the release manifest`);
  }
}

function requireLqt(
  poolAddress: string,
  poolLqtTotal: unknown,
  lqtAdmin: unknown,
  lqtTotalSupply: unknown,
  lockedLqtBalance: unknown,
): void {
  requireRole(lqtAdmin, poolAddress, "LQT administrator");
  const poolSupply = nat(poolLqtTotal, "pool LQT total");
  const tokenSupply = nat(lqtTotalSupply, "LQT total supply");
  if (poolSupply !== tokenSupply) {
    throw new Error(
      `Pool/LQT supply mismatch: pool ${poolSupply}, LQT ${tokenSupply}`,
    );
  }
  const locked = nat(lockedLqtBalance, "locked LQT balance");
  if (locked < MINIMUM_LOCKED_LQT) {
    throw new Error(
      `Permanent LQT lock is below ${MINIMUM_LOCKED_LQT}: ${locked}`,
    );
  }
}

export interface NativePoolInvariantEvidence {
  poolAddress: string;
  poolStorage: Record<string, unknown>;
  lqtAdmin: unknown;
  lqtTotalSupply: unknown;
  lockedLqtBalance: unknown;
  actualXtzBalance: unknown;
  actualTokenBalance: unknown;
  expectedManager: string;
  expectedFeeRecipient: string;
  expectedPaused: boolean;
  actualDelegate: string | null;
  expectedDelegate?: string | null;
}

export function assertNativePoolInvariants(
  evidence: NativePoolInvariantEvidence,
): void {
  const storage = evidence.poolStorage;
  if (
    storage.active !== true
    || storage.paused !== evidence.expectedPaused
    || storage.activationPending === true
    || storage.selfIsUpdatingTokenPool === true
  ) {
    throw new Error("Native pool lifecycle flags are unsafe or unexpected");
  }
  if (storage.freezeBaker !== false) {
    throw new Error("Native pool baker changes are frozen or malformed");
  }
  requireRole(storage.manager, evidence.expectedManager, "Pool manager");
  requireRole(
    storage.protocol_fee_recipient,
    evidence.expectedFeeRecipient,
    "Protocol fee recipient",
  );
  if (
    optionAddress(storage.pending_manager) !== null
    || optionAddress(storage.pending_protocol_fee_recipient) !== null
  ) {
    throw new Error("A native pool role handoff is unexpectedly pending");
  }
  const expectedDelegate = evidence.expectedDelegate ?? null;
  if (evidence.actualDelegate !== expectedDelegate) {
    throw new Error(
      `Pool delegate mismatch: expected ${expectedDelegate ?? "none"}, got ${evidence.actualDelegate ?? "none"}`,
    );
  }

  const reserves = nat(storage.xtzPool, "XTZ reserve")
    + nat(storage.accumulated_protocol_fee_xtz ?? 0, "protocol XTZ fees");
  const tokenLiabilities = nat(storage.tokenPool, "token reserve")
    + nat(storage.accumulated_protocol_fee_token ?? 0, "protocol token fees");
  const actualXtz = nat(evidence.actualXtzBalance, "actual XTZ balance");
  const actualToken = nat(evidence.actualTokenBalance, "actual token balance");
  if (actualXtz < reserves) {
    throw new Error(
      `Actual XTZ balance ${actualXtz} is below reserves plus protocol fees ${reserves}`,
    );
  }
  if (actualToken < tokenLiabilities) {
    throw new Error(
      `Actual token balance ${actualToken} is below reserves plus protocol fees ${tokenLiabilities}`,
    );
  }
  requireLqt(
    evidence.poolAddress,
    storage.lqtTotal,
    evidence.lqtAdmin,
    evidence.lqtTotalSupply,
    evidence.lockedLqtBalance,
  );
}

export interface TokenTokenPoolInvariantEvidence {
  poolAddress: string;
  poolStorage: Record<string, unknown>;
  lqtAdmin: unknown;
  lqtTotalSupply: unknown;
  lockedLqtBalance: unknown;
  actualBalanceA: unknown;
  actualBalanceB: unknown;
  expectedManager: string;
  expectedFeeRecipient: string;
  expectedPaused: boolean;
}

export function assertTokenTokenPoolInvariants(
  evidence: TokenTokenPoolInvariantEvidence,
): void {
  const storage = evidence.poolStorage;
  if (
    storage.active !== true
    || storage.paused !== evidence.expectedPaused
    || storage.entered !== false
  ) {
    throw new Error("Token-to-token pool lifecycle flags are unsafe or unexpected");
  }
  requireRole(storage.manager, evidence.expectedManager, "Pool manager");
  requireRole(
    storage.protocol_fee_recipient,
    evidence.expectedFeeRecipient,
    "Protocol fee recipient",
  );
  if (
    optionAddress(storage.pending_manager) !== null
    || optionAddress(storage.pending_fee_recipient) !== null
  ) {
    throw new Error("A token-to-token pool role handoff is unexpectedly pending");
  }

  const liabilitiesA = nat(storage.reserve_a, "reserve_a")
    + nat(storage.protocol_fee_a, "protocol_fee_a");
  const liabilitiesB = nat(storage.reserve_b, "reserve_b")
    + nat(storage.protocol_fee_b, "protocol_fee_b");
  const actualA = nat(evidence.actualBalanceA, "actual token A balance");
  const actualB = nat(evidence.actualBalanceB, "actual token B balance");
  if (actualA < liabilitiesA) {
    throw new Error(
      `Actual token A balance ${actualA} is below reserves plus protocol fees ${liabilitiesA}`,
    );
  }
  if (actualB < liabilitiesB) {
    throw new Error(
      `Actual token B balance ${actualB} is below reserves plus protocol fees ${liabilitiesB}`,
    );
  }
  requireLqt(
    evidence.poolAddress,
    storage.lqt_total,
    evidence.lqtAdmin,
    evidence.lqtTotalSupply,
    evidence.lockedLqtBalance,
  );
}
