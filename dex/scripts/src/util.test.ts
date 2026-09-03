import assert from "node:assert/strict";
import test from "node:test";

import type { TezosToolkit } from "@taquito/taquito";

import { getTokenBalance, getTokenBalanceFromRpc } from "./util.js";

function failingRpc(error: Error): TezosToolkit {
    return {
        contract: {
            at: async () => {
                throw error;
            },
        },
    } as unknown as TezosToolkit;
}

test("RPC-only token balance lookup fails closed without consulting TzKT", async () => {
    const previousFetch = globalThis.fetch;
    let fetchCalls = 0;
    globalThis.fetch = async () => {
        fetchCalls += 1;
        return new Response(JSON.stringify([{ balance: "999999999" }]));
    };

    try {
        await assert.rejects(
            getTokenBalanceFromRpc(
                failingRpc(new Error("RPC balance read failed")),
                "KT1-token",
                "KT1-pool",
                "FA2",
                "0"
            ),
            /RPC balance read failed/
        );
        assert.equal(fetchCalls, 0);
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test("general token balance lookup retains its explicit TzKT fallback", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(
        JSON.stringify([{ balance: "123456" }])
    );

    try {
        const balance = await getTokenBalance(
            failingRpc(new Error("RPC balance read failed")),
            "KT1-token",
            "KT1-owner",
            "FA2",
            "0",
            "https://api.tzkt.io"
        );
        assert.equal(balance, 123456n);
    } finally {
        globalThis.fetch = previousFetch;
    }
});
