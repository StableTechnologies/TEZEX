export interface CallLimits {
    fee?: number;
    gasLimit?: number;
    storageLimit?: number;
}

export interface BatchCallOptions extends CallLimits {
    amount?: number;
    mutez?: true;
}

export interface BatchLike {
    withContractCall(call: unknown, options?: BatchCallOptions): BatchLike;
}

interface ContractLike {
    methodsObject: Record<string, (...args: any[]) => unknown>;
}

interface InitializationCalls<TBatch extends BatchLike> {
    batch: TBatch;
    dexContract: ContractLike;
    tokenContract: ContractLike;
    tokenTransfer: unknown;
    lqtAddress: string;
    seedXtz: number;
    seedToken: string;
    lqtTotal: string;
    poolType: "base" | "mod";
    finalManager: string;
    /** When set, applied to every manager op (TezosX Previewnet needs this). */
    callLimits?: CallLimits;
}

/**
 * Appends the complete initialization sequence. The final manager handoff is
 * deliberately last, keeping the deployment signer in control only until all
 * reserve and activation checks have succeeded in the same operation group.
 */
export function appendInitializationCalls<TBatch extends BatchLike>({
    batch,
    dexContract,
    tokenContract,
    tokenTransfer,
    lqtAddress,
    seedXtz,
    seedToken,
    lqtTotal,
    poolType,
    finalManager,
    callLimits,
}: InitializationCalls<TBatch>): TBatch {
    const limits = callLimits ?? {};

    let next = batch
        .withContractCall(dexContract.methodsObject.setLqtAddress(lqtAddress), limits)
        .withContractCall(dexContract.methodsObject.default(), {
            ...limits,
            amount: seedXtz,
            mutez: true,
        })
        .withContractCall(
            tokenContract.methodsObject.transfer(tokenTransfer),
            limits
        )
        .withContractCall(
            dexContract.methodsObject.updateTokenPool(),
            limits
        );

    if (poolType === "mod") {
        next = next.withContractCall(
            dexContract.methodsObject.activate({
                expectedXtzPool: seedXtz.toString(),
                // The contract treats this as the minimum configured seed.
                // Any tokens donated before updateTokenPool remain in the pool.
                expectedTokenPool: seedToken,
                expectedLqtTotal: lqtTotal,
            }),
            limits
        );
    }

    return next.withContractCall(
        dexContract.methodsObject.setManager(finalManager),
        limits
    ) as TBatch;
}

/** Number of manager ops appendInitializationCalls will add for this pool type. */
export function initializationOpCount(poolType: "base" | "mod"): number {
    return poolType === "mod" ? 6 : 5;
}
