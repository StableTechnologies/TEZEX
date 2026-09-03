import type { NativePoolDeploymentState } from "./deployment-state.js";

const NAT_PATTERN = /^(0|[1-9][0-9]*)$/;

export interface FinalHandoffEconomics {
    dexAddress: string;
    lqtAddress: string;
    dexXtzBalance: unknown;
    dexTokenBalance: unknown;
    lqtAdmin: unknown;
    lqtTotalSupply: unknown;
    lockedLqtBalance: unknown;
    providerLqtBalance: unknown;
}

function optionAddress(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value;
    const candidate = value as { Some?: unknown; some?: unknown };
    const address = candidate.Some ?? candidate.some;
    return address === undefined || address === null ? null : String(address);
}

function nat(value: unknown, label: string): bigint {
    const normalized = String(value);
    if (!NAT_PATTERN.test(normalized)) {
        throw new Error(`Final handoff ${label} is not a natural number`);
    }
    return BigInt(normalized);
}

function requireEqualNat(
    value: unknown,
    expected: string,
    label: string
): bigint {
    const actual = nat(value, label);
    if (actual !== nat(expected, `expected ${label}`)) {
        throw new Error(
            `Final handoff ${label} mismatch: expected ${expected}, got ${actual}`
        );
    }
    return actual;
}

export function assertFinalHandoffStorage(
    storage: Record<string, unknown>,
    state: NativePoolDeploymentState,
    economics: FinalHandoffEconomics
): void {
    if (state.config.poolType !== "mod") {
        if (String(storage.manager) !== state.config.finalManager) {
            throw new Error("Base-pool manager handoff is incomplete");
        }
    } else {
        if (storage.active !== true || storage.paused !== true) {
            throw new Error(
                "Modified pool must remain active and paused during final handoff verification"
            );
        }
        if (String(storage.manager) !== state.config.finalManager) {
            throw new Error("Final manager has not accepted the handoff");
        }
        if (optionAddress(storage.pending_manager) !== null) {
            throw new Error("Manager handoff is still pending");
        }
        if (
            String(storage.protocol_fee_recipient)
            !== state.config.protocolFeeRecipient
        ) {
            throw new Error(
                "Final protocol-fee recipient has not accepted the handoff"
            );
        }
        if (optionAddress(storage.pending_protocol_fee_recipient) !== null) {
            throw new Error("Protocol-fee recipient handoff is still pending");
        }
    }

    if (String(storage.tokenAddress) !== state.config.tokenAddress) {
        throw new Error("Final handoff token address differs from the manifest");
    }
    if (
        state.config.tokenStandard === "FA2"
        && nat(storage.tokenId, "token ID")
            !== nat(state.config.tokenId, "configured token ID")
    ) {
        throw new Error("Final handoff token ID differs from the manifest");
    }
    if (String(storage.lqtAddress) !== economics.lqtAddress) {
        throw new Error("Final handoff LQT address differs from the manifest");
    }
    if (String(economics.lqtAdmin) !== economics.dexAddress) {
        throw new Error("Final handoff LQT administrator is not the DEX");
    }

    const xtzPool = requireEqualNat(
        storage.xtzPool,
        state.config.seedXtz,
        "DEX XTZ reserve"
    );
    const tokenPool = nat(storage.tokenPool, "DEX token reserve");
    if (tokenPool < nat(state.config.seedToken, "configured token seed")) {
        throw new Error(
            `Final handoff DEX token reserve is below its seed: expected at least ${state.config.seedToken}, got ${tokenPool}`
        );
    }
    requireEqualNat(
        storage.lqtTotal,
        state.config.initialLqt.total,
        "DEX LQT total"
    );
    requireEqualNat(
        economics.lqtTotalSupply,
        state.config.initialLqt.total,
        "LQT total supply"
    );
    requireEqualNat(
        economics.lockedLqtBalance,
        state.config.initialLqt.locked,
        "locked LQT balance"
    );
    requireEqualNat(
        economics.providerLqtBalance,
        state.config.initialLqt.provider,
        "provider LQT balance"
    );

    const protocolFeeXtz = nat(
        storage.accumulated_protocol_fee_xtz ?? 0,
        "accrued protocol XTZ fee"
    );
    const protocolFeeToken = nat(
        storage.accumulated_protocol_fee_token ?? 0,
        "accrued protocol token fee"
    );
    const requiredXtzBalance = xtzPool + protocolFeeXtz;
    const actualXtzBalance = nat(economics.dexXtzBalance, "actual DEX XTZ balance");
    if (actualXtzBalance < requiredXtzBalance) {
        throw new Error(
            `Final handoff actual DEX XTZ balance does not cover reserves and fees: expected at least ${requiredXtzBalance}, got ${actualXtzBalance}`
        );
    }
    const requiredTokenBalance = tokenPool + protocolFeeToken;
    const actualTokenBalance = nat(
        economics.dexTokenBalance,
        "actual DEX token balance"
    );
    if (actualTokenBalance < requiredTokenBalance) {
        throw new Error(
            `Final handoff actual DEX token balance does not cover reserves and fees: expected at least ${requiredTokenBalance}, got ${actualTokenBalance}`
        );
    }
}
