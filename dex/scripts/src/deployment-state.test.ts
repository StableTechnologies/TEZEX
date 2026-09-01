import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
    DEPLOYMENT_COMPILER_VERSION,
    DEPLOYMENT_STATE_VERSION,
    assertOperationApplied,
    loadDeploymentState,
    persistDeploymentState,
    recoverOrigination,
    releaseManifestState,
    type NativePoolDeploymentState,
} from "./deployment-state.js";

function fixture(): NativePoolDeploymentState {
    return {
        version: DEPLOYMENT_STATE_VERSION,
        fingerprint: "fingerprint",
        network: "previewnet",
        rpc: "https://rpc.invalid",
        chainId: "NetXTest",
        sourceCommit: "deadbeef",
        sourceDirty: false,
        compilerVersion: DEPLOYMENT_COMPILER_VERSION,
        signerMode: "remote",
        deployer: "tz1burnburnburnburnburnburnburjAYjjX",
        artifacts: {
            dex: { path: "pool.tz", sha256: "a", codeSha256: "b" },
            lqt: { path: "lqt.tz", sha256: "c", codeSha256: "d" },
            tokenCodeSha256: "e",
        },
        config: {
            tokenAddress: "KT1Token",
            tokenStandard: "FA2",
            tokenId: "0",
            poolType: "mod",
            seedXtz: "1000000",
            seedToken: "1000000",
            finalManager: "KT1Manager",
            protocolFeeRecipient: "KT1Recipient",
            roleThresholds: { manager: 2, protocolFeeRecipient: 2 },
            tokenOperations: {
                integrationOwner: "security",
                incidentChannel: "incident-room",
                monitoredEventClasses: ["pause-or-unpause"],
            },
            metadataUri: "ipfs://contract",
            tokenMetadataUri: "ipfs://token",
            confirmations: 2,
            initialLqt: { total: "1000000", locked: "1000", provider: "999000" },
            feeBasisPoints: { liquidityProviders: 25, protocol: 5, total: 30 },
        },
        steps: {},
    };
}

test("deployment state is atomically persisted with owner-only permissions", async () => {
    const directory = await fs.promises.mkdtemp(
        path.join(os.tmpdir(), "tezex-deployment-state-")
    );
    try {
        const filename = path.join(directory, "state.json");
        const state = fixture();
        await persistDeploymentState(filename, state);
        assert.deepEqual(await loadDeploymentState(filename), state);
        assert.equal((await fs.promises.stat(filename)).mode & 0o777, 0o600);
    } finally {
        await fs.promises.rm(directory, { recursive: true, force: true });
    }
});

test("origination recovery returns the single applied originated contract", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(JSON.stringify([
        {
            status: "applied",
            originatedContract: { address: "KT1Recovered" },
        },
    ]));
    try {
        assert.equal(
            await recoverOrigination("https://api.invalid", "opHash"),
            "KT1Recovered"
        );
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test("shareable manifests remove RPC credentials and paths", () => {
    const state = fixture();
    state.rpc = "https://user:secret@rpc.example/private-key/path?token=secret";
    assert.equal(releaseManifestState(state).rpc, "https://rpc.example");
});

test("recovery refuses to repeat failed or unindexed operations", async () => {
    const previousFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => new Response("false");
        await assert.rejects(
            assertOperationApplied("https://api.invalid", "opFailed"),
            /refusing to repeat/
        );

        globalThis.fetch = async () => new Response("null");
        await assert.rejects(
            assertOperationApplied("https://api.invalid", "opPending"),
            /rerun later without deleting/
        );
    } finally {
        globalThis.fetch = previousFetch;
    }
});

test("recovery enforces indexed confirmation depth", async () => {
    const previousFetch = globalThis.fetch;
    const responses = [
        true,
        [{ status: "applied", level: 100 }],
        { level: 100, synced: true },
    ];
    globalThis.fetch = async () => new Response(
        JSON.stringify(responses.shift())
    );
    try {
        await assert.rejects(
            assertOperationApplied("https://api.invalid", "opRecent", 2),
            /1 confirmation.*2 required/
        );
    } finally {
        globalThis.fetch = previousFetch;
    }

    const confirmed = [
        true,
        [{ status: "applied", level: 100 }],
        { level: 101, synced: true },
    ];
    globalThis.fetch = async () => new Response(
        JSON.stringify(confirmed.shift())
    );
    try {
        await assert.doesNotReject(
            assertOperationApplied("https://api.invalid", "opConfirmed", 2)
        );
    } finally {
        globalThis.fetch = previousFetch;
    }
});
