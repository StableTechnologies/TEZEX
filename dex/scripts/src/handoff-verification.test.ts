import assert from "node:assert/strict";
import test from "node:test";

import { DEPLOYMENT_STATE_VERSION, type NativePoolDeploymentState } from "./deployment-state.js";
import {
    assertFinalHandoffStorage,
    type FinalHandoffEconomics,
} from "./handoff-verification.js";

const state = {
    version: DEPLOYMENT_STATE_VERSION,
    config: {
        tokenAddress: "KT1-token",
        tokenStandard: "FA2",
        tokenId: "0",
        poolType: "mod",
        seedXtz: "1000000",
        seedToken: "2000000",
        finalManager: "KT1-manager",
        protocolFeeRecipient: "KT1-recipient",
        initialLqt: {
            total: "1414213",
            locked: "1000",
            provider: "1413213",
        },
    },
} as NativePoolDeploymentState;

const storage = {
    active: true,
    paused: true,
    manager: "KT1-manager",
    pending_manager: null,
    protocol_fee_recipient: "KT1-recipient",
    pending_protocol_fee_recipient: null,
    accumulated_protocol_fee_xtz: "0",
    accumulated_protocol_fee_token: "0",
    tokenAddress: "KT1-token",
    tokenId: "0",
    lqtAddress: "KT1-lqt",
    xtzPool: "1000000",
    tokenPool: "2000000",
    lqtTotal: "1414213",
};

const economics: FinalHandoffEconomics = {
    dexAddress: "KT1-dex",
    lqtAddress: "KT1-lqt",
    dexXtzBalance: "1000000",
    dexTokenBalance: "2000000",
    lqtAdmin: "KT1-dex",
    lqtTotalSupply: "1414213",
    lockedLqtBalance: "1000",
    providerLqtBalance: "1413213",
};

test("final handoff requires accepted roles while the pool is still paused", () => {
    assert.doesNotThrow(() => assertFinalHandoffStorage(
        storage,
        state,
        economics
    ));

    assert.throws(() => assertFinalHandoffStorage({
        ...storage,
        paused: false,
        manager: "tz1-deployer",
        pending_manager: "KT1-manager",
        protocol_fee_recipient: "tz1-deployer",
        pending_protocol_fee_recipient: "KT1-recipient",
    }, state, economics), /remain active and paused/);
});

test("final handoff rejects seed liquidity removed during the paused handoff", () => {
    const drainedStorage = {
        ...storage,
        xtzPool: "708",
        tokenPool: "1416",
        lqtTotal: "1000",
    };
    const drainedEconomics = {
        ...economics,
        dexXtzBalance: "708",
        dexTokenBalance: "1416",
        lqtTotalSupply: "1000",
        providerLqtBalance: "0",
    };

    assert.throws(
        () => assertFinalHandoffStorage(drainedStorage, state, drainedEconomics),
        /DEX XTZ reserve mismatch/
    );
});

test("final handoff independently verifies supply, allocations, and real balances", () => {
    const cases: Array<{
        name: string;
        storage?: Record<string, unknown>;
        economics?: FinalHandoffEconomics;
        error: RegExp;
    }> = [
        {
            name: "LQT supply",
            economics: { ...economics, lqtTotalSupply: "1414212" },
            error: /LQT total supply mismatch/,
        },
        {
            name: "locked allocation",
            economics: { ...economics, lockedLqtBalance: "999" },
            error: /locked LQT balance mismatch/,
        },
        {
            name: "provider allocation",
            economics: { ...economics, providerLqtBalance: "1413212" },
            error: /provider LQT balance mismatch/,
        },
        {
            name: "XTZ balance",
            economics: { ...economics, dexXtzBalance: "999999" },
            error: /XTZ balance does not cover reserves and fees/,
        },
        {
            name: "token balance",
            economics: { ...economics, dexTokenBalance: "1999999" },
            error: /token balance does not cover reserves and fees/,
        },
        {
            name: "token reserve",
            storage: { ...storage, tokenPool: "1999999" },
            error: /token reserve is below its seed/,
        },
    ];

    for (const entry of cases) {
        assert.throws(
            () => assertFinalHandoffStorage(
                entry.storage ?? storage,
                state,
                entry.economics ?? economics
            ),
            entry.error,
            entry.name
        );
    }
});
