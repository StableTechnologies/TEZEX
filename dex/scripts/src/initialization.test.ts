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

test("modified initialization hands management off only after activation", () => {
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
        finalManager: "KT1-multisig",
    });

    assert.deepEqual(
        methodCalls.map(({ method }) => method),
        ["setLqtAddress", "default", "transfer", "updateTokenPool", "activate", "setManager"]
    );
    assert.equal(methodCalls.at(-1)?.value, "KT1-multisig");
    assert.deepEqual(methodCalls.at(-2)?.value, {
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
        "setManager",
    ]);
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
        finalManager: "KT1-multisig",
    });

    assert.deepEqual(
        methodCalls.map(({ method }) => method),
        ["setLqtAddress", "default", "transfer", "updateTokenPool", "setManager"]
    );
});
