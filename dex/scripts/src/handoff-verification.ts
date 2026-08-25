import type { NativePoolDeploymentState } from "./deployment-state.js";

function optionAddress(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value;
    const candidate = value as { Some?: unknown; some?: unknown };
    const address = candidate.Some ?? candidate.some;
    return address === undefined || address === null ? null : String(address);
}

export function assertFinalHandoffStorage(
    storage: Record<string, unknown>,
    state: NativePoolDeploymentState
): void {
    if (state.config.poolType !== "mod") {
        if (String(storage.manager) !== state.config.finalManager) {
            throw new Error("Base-pool manager handoff is incomplete");
        }
        return;
    }
    if (storage.active !== true || storage.paused !== false) {
        throw new Error("Modified pool is not active and unpaused");
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
        throw new Error("Final protocol-fee recipient has not accepted the handoff");
    }
    if (optionAddress(storage.pending_protocol_fee_recipient) !== null) {
        throw new Error("Protocol-fee recipient handoff is still pending");
    }
}
