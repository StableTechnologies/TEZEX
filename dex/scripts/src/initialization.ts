export interface BatchLike {
    withContractCall(call: unknown, options?: { amount: number; mutez: true }): BatchLike;
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
}: InitializationCalls<TBatch>): TBatch {
    let next = batch
        .withContractCall(dexContract.methodsObject.setLqtAddress(lqtAddress))
        .withContractCall(dexContract.methodsObject.default(), {
            amount: seedXtz,
            mutez: true,
        })
        .withContractCall(tokenContract.methodsObject.transfer(tokenTransfer))
        .withContractCall(dexContract.methodsObject.updateTokenPool());

    if (poolType === "mod") {
        next = next.withContractCall(
            dexContract.methodsObject.activate({
                expectedXtzPool: seedXtz.toString(),
                // The contract treats this as the minimum configured seed.
                // Any tokens donated before updateTokenPool remain in the pool.
                expectedTokenPool: seedToken,
                expectedLqtTotal: lqtTotal,
            })
        );
    }

    return next.withContractCall(
        dexContract.methodsObject.setManager(finalManager)
    ) as TBatch;
}
