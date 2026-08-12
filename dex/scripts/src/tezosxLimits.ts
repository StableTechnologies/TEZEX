/** TezosX Previewnet: hard_gas_limit_per_operation == hard_gas_limit_per_block == 660000. */

export interface OpLimits {
    fee: number;
    gasLimit: number;
    storageLimit: number;
}

const PREVIEWNET_HARD_GAS = 660_000;
/** Stay under the hard cap so reveal+op / multi-op batches still fit. */
const PREVIEWNET_SAFE_GAS = 650_000;
const PREVIEWNET_STORAGE = 50_000;

/**
 * TezosX rejects Taquito fee estimates (`evm_node.dev.insufficient_fees`).
 * Empirically fee scales with gasLimit; ~0.1 XTZ covers a full-gas originate.
 */
export function previewnetOriginateLimits(): OpLimits {
    return {
        fee: 100_000,
        gasLimit: PREVIEWNET_SAFE_GAS,
        storageLimit: PREVIEWNET_STORAGE,
    };
}

/**
 * Split the block gas budget across a batch. Total gas must stay ≤ hard block
 * limit because Previewnet sets per-op and per-block caps equal.
 */
export function previewnetBatchCallLimits(opCount: number): OpLimits {
    if (opCount < 1) {
        throw new Error("Batch must contain at least one operation");
    }
    const gasLimit = Math.floor(PREVIEWNET_SAFE_GAS / opCount);
    const storageLimit = Math.floor(PREVIEWNET_STORAGE / opCount);
    // Same empirical scale as originate: keep a comfortable margin.
    const fee = Math.max(20_000, Math.ceil((100_000 * gasLimit) / PREVIEWNET_SAFE_GAS));
    return { fee, gasLimit, storageLimit };
}

export function needsExplicitOpLimits(networkName: string): boolean {
    return networkName === "previewnet";
}

export function previewnetFeeBufferMutez(): bigint {
    // Two originations (~0.1 XTZ fee each) + init batch + headroom.
    return 500_000n;
}

export { PREVIEWNET_HARD_GAS };
