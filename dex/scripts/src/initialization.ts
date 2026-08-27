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
    deploymentManager: string;
    finalManager: string;
    deploymentProtocolFeeRecipient: string;
    finalProtocolFeeRecipient: string;
    /** When set, applied to every manager op (TezosX Previewnet needs this). */
    callLimits?: CallLimits;
}

/**
 * Appends the complete initialization sequence. Base pools retain their
 * one-step manager handoff. Modified pools remain paused and propose the final
 * manager and protocol-fee recipient only after reserve and activation checks
 * succeed. Each proposed address must accept before the pool can be unpaused.
 * If the deployment signer already holds both final roles, the last call
 * unpauses the pool.
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
    deploymentManager,
    finalManager,
    deploymentProtocolFeeRecipient,
    finalProtocolFeeRecipient,
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
        const recipientHandoffPending =
            deploymentProtocolFeeRecipient !== finalProtocolFeeRecipient;
        const managerHandoffPending = deploymentManager !== finalManager;
        if (recipientHandoffPending) {
            next = next.withContractCall(
                dexContract.methodsObject.proposeProtocolFeeRecipient(
                    finalProtocolFeeRecipient
                ),
                limits
            );
        }
        if (managerHandoffPending) {
            next = next.withContractCall(
                dexContract.methodsObject.proposeManager(finalManager),
                limits
            );
        }
        if (!recipientHandoffPending && !managerHandoffPending) {
            next = next.withContractCall(
                dexContract.methodsObject.setPaused(false),
                limits
            );
        }
        return next as TBatch;
    }

    return next.withContractCall(
        dexContract.methodsObject.setManager(finalManager),
        limits
    ) as TBatch;
}

/** Number of manager ops appendInitializationCalls will add for this pool type. */
export function initializationOpCount(
    poolType: "base" | "mod",
    deploymentManager: string,
    finalManager: string,
    deploymentProtocolFeeRecipient: string,
    finalProtocolFeeRecipient: string
): number {
    if (poolType === "base") return 5;
    const managerHandoff = deploymentManager === finalManager ? 0 : 1;
    const recipientHandoff =
        deploymentProtocolFeeRecipient === finalProtocolFeeRecipient ? 0 : 1;
    const unpause = managerHandoff === 0 && recipientHandoff === 0 ? 1 : 0;
    return 5 + managerHandoff + recipientHandoff + unpause;
}
