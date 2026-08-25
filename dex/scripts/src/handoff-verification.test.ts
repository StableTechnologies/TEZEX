import assert from "node:assert/strict";
import test from "node:test";

import { DEPLOYMENT_STATE_VERSION, type NativePoolDeploymentState } from "./deployment-state.js";
import { assertFinalHandoffStorage } from "./handoff-verification.js";

const state = {
    version: DEPLOYMENT_STATE_VERSION,
    config: {
        poolType: "mod",
        finalManager: "KT1-manager",
        protocolFeeRecipient: "KT1-recipient",
    },
} as NativePoolDeploymentState;

test("final handoff requires accepted roles and an unpaused pool", () => {
    assert.doesNotThrow(() => assertFinalHandoffStorage({
        active: true,
        paused: false,
        manager: "KT1-manager",
        pending_manager: null,
        protocol_fee_recipient: "KT1-recipient",
        pending_protocol_fee_recipient: null,
    }, state));

    assert.throws(() => assertFinalHandoffStorage({
        active: true,
        paused: true,
        manager: "tz1-deployer",
        pending_manager: "KT1-manager",
        protocol_fee_recipient: "tz1-deployer",
        pending_protocol_fee_recipient: "KT1-recipient",
    }, state), /not active and unpaused/);
});
