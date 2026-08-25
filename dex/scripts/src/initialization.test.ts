import assert from "node:assert/strict";
import test from "node:test";
import { appendInitializationCalls, type BatchLike } from "./initialization.js";

function methodRecorder(calls: Array<{ method: string; value?: unknown }>) {
    return new Proxy({}, {
        get: (_target, method: string) => (value?: unknown) => {
            calls.push({ method, value });
            return method;
        },
    }) as Record<string, (...args: any[]) => unknown>;
}

test("modified initialization proposes management only after activation", () => {
    const methodCalls: Array<{ method: string; value?: unknown }> = [];
    const batchCalls: unknown[] = [];
    const batch: BatchLike = {
        withContractCall(call: unknown) {
            batchCalls.push(call);
            return this;
        },
    };

    appendInitializationCalls({
        batch,
        dexContract: { methodsObject: methodRecorder(methodCalls) },
        tokenContract: { methodsObject: methodRecorder(methodCalls) },
        tokenTransfer: { transfer: "seed" },
        lqtAddress: "KT1-lqt",
        seedXtz: 20_000_000,
        seedToken: "10000000",
        lqtTotal: "14142135",
        poolType: "mod",
        deploymentManager: "tz1-deployer",
        finalManager: "KT1-multisig",
        deploymentProtocolFeeRecipient: "tz1-deployer",
        finalProtocolFeeRecipient: "KT1-fee-multisig",
    });

    assert.deepEqual(
        methodCalls.map(({ method }) => method),
        [
            "setLqtAddress",
            "default",
            "transfer",
            "updateTokenPool",
            "activate",
            "proposeProtocolFeeRecipient",
            "proposeManager",
        ]
    );
    assert.equal(methodCalls.at(-1)?.value, "KT1-multisig");
    assert.equal(methodCalls.at(-2)?.value, "KT1-fee-multisig");
    assert.deepEqual(methodCalls.at(-3)?.value, {
        expectedXtzPool: "20000000",
        expectedTokenPool: "10000000",
        expectedLqtTotal: "14142135",
    });
    assert.deepEqual(batchCalls, [
        "setLqtAddress",
        "default",
        "transfer",
        "updateTokenPool",
        "activate",
        "proposeProtocolFeeRecipient",
        "proposeManager",
    ]);
});

test("modified initialization unpauses when the deployer is final manager", () => {
    const methodCalls: Array<{ method: string; value?: unknown }> = [];
    const batch: BatchLike = {
        withContractCall() {
            return this;
        },
    };

    appendInitializationCalls({
        batch,
        dexContract: { methodsObject: methodRecorder(methodCalls) },
        tokenContract: { methodsObject: methodRecorder(methodCalls) },
        tokenTransfer: [],
        lqtAddress: "KT1-lqt",
        seedXtz: 20_000_000,
        seedToken: "10000000",
        lqtTotal: "14142135",
        poolType: "mod",
        deploymentManager: "tz1-deployer",
        finalManager: "tz1-deployer",
        deploymentProtocolFeeRecipient: "tz1-deployer",
        finalProtocolFeeRecipient: "tz1-deployer",
    });

    assert.deepEqual(
        methodCalls.map(({ method }) => method),
        ["setLqtAddress", "default", "transfer", "updateTokenPool", "activate", "setPaused"]
    );
    assert.equal(methodCalls.at(-1)?.value, false);
});

test("base initialization also ends with the final manager handoff", () => {
    const methodCalls: Array<{ method: string; value?: unknown }> = [];
    const batch: BatchLike = {
        withContractCall() {
            return this;
        },
    };

    appendInitializationCalls({
        batch,
        dexContract: { methodsObject: methodRecorder(methodCalls) },
        tokenContract: { methodsObject: methodRecorder(methodCalls) },
        tokenTransfer: [],
        lqtAddress: "KT1-lqt",
        seedXtz: 1,
        seedToken: "1",
        lqtTotal: "1",
        poolType: "base",
        deploymentManager: "tz1-deployer",
        finalManager: "KT1-multisig",
        deploymentProtocolFeeRecipient: "tz1-deployer",
        finalProtocolFeeRecipient: "KT1-fee-multisig",
    });

    assert.deepEqual(
        methodCalls.map(({ method }) => method),
        ["setLqtAddress", "default", "transfer", "updateTokenPool", "setManager"]
    );
});
