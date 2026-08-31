import type { TokenTokenDeploymentState } from "./token-token-deployment-state.js";
import { calculateInitialLqt } from "./token-token-math.js";
import { assertPoolIdentityStorage } from "./token-token-storage.js";

const minimumLqt = 1_000n;

export interface TokenTokenHandoffEvidence {
  poolStorage: Record<string, unknown>;
  lqtAdmin: unknown;
  lqtTotalSupply: unknown;
  lockedLqtBalance: unknown;
  providerLqtBalance: unknown;
  balanceA: bigint;
  balanceB: bigint;
}

function nat(value: unknown, label: string): bigint {
  const text =
    (value as { toString?: () => string })?.toString?.() ?? String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(text)) {
    throw new Error(`${label} is not a nat`);
  }
  return BigInt(text);
}

function optionAddress(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  const candidate = value as { Some?: unknown; some?: unknown };
  return String(candidate.Some ?? candidate.some ?? value);
}

export function assertFinalTokenTokenHandoff(
  state: TokenTokenDeploymentState,
  evidence: TokenTokenHandoffEvidence,
): void {
  const { poolStorage } = evidence;
  const poolAddress = state.steps.pool?.address;
  if (!poolAddress) throw new Error("Deployment state does not contain a pool address");

  assertPoolIdentityStorage(poolStorage, {
    tokenA: state.config.tokenA,
    tokenB: state.config.tokenB,
    feeRecipient: state.config.feeRecipient,
  });
  if (
    poolStorage.active !== true ||
    poolStorage.paused !== false ||
    poolStorage.entered !== false ||
    String(poolStorage.manager) !== state.config.finalManager ||
    optionAddress(poolStorage.pending_manager) !== null ||
    optionAddress(poolStorage.pending_fee_recipient) !== null
  ) {
    throw new Error("Final pool lifecycle or role handoff is incomplete");
  }

  const reserveA = nat(poolStorage.reserve_a, "reserve_a");
  const reserveB = nat(poolStorage.reserve_b, "reserve_b");
  if (
    reserveA !== BigInt(state.config.seedAmountA) ||
    reserveB !== BigInt(state.config.seedAmountB) ||
    nat(poolStorage.protocol_fee_a, "protocol_fee_a") !== 0n ||
    nat(poolStorage.protocol_fee_b, "protocol_fee_b") !== 0n ||
    evidence.balanceA < reserveA ||
    evidence.balanceB < reserveB
  ) {
    throw new Error("Seed reserves, protocol fees, or real balances changed during handoff");
  }

  const expectedLqt = BigInt(
    calculateInitialLqt(state.config.seedAmountA, state.config.seedAmountB),
  );
  if (
    String(evidence.lqtAdmin) !== poolAddress ||
    nat(evidence.lqtTotalSupply, "LQT total_supply") !== expectedLqt ||
    nat(poolStorage.lqt_total, "pool lqt_total") !== expectedLqt ||
    nat(evidence.lockedLqtBalance ?? 0, "locked LQT") !== minimumLqt ||
    nat(evidence.providerLqtBalance ?? 0, "provider LQT") !==
      expectedLqt - minimumLqt
  ) {
    throw new Error("Final LQT administration, supply, or allocation is incorrect");
  }
}
