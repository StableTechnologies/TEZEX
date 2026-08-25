import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { Parser } from "@taquito/michel-codec";
import { MichelsonMap, Schema } from "@taquito/michelson-encoder";
import {
    dexStorageType,
    dexStorageTypeFA2,
    dexStorageTypeFA2Mod,
    dexStorageTypeMod,
    lqtStorageType,
} from "./types.js";
import { allocateInitialLqt } from "./amounts.js";

const parser = new Parser();

function compiledStorageType(filename: string): object {
    const source = fs.readFileSync(
        new URL(`../../compiled_contracts/${filename}`, import.meta.url),
        "utf8"
    );
    const script = parser.parseScript(source);
    const storage = script?.find(
        (expression) => "prim" in expression && expression.prim === "storage"
    );
    if (!storage || !("args" in storage) || !storage.args?.[0]) {
        throw new Error(`Compiled contract ${filename} has no storage type`);
    }
    return JSON.parse(JSON.stringify(storage.args[0])) as object;
}

test("deployment schemas match every compiled pool contract", () => {
    assert.deepEqual(compiledStorageType("pool.tz"), dexStorageType);
    assert.deepEqual(compiledStorageType("pool_fa2.tz"), dexStorageTypeFA2);
    assert.deepEqual(compiledStorageType("pool_mod.tz"), dexStorageTypeMod);
    assert.deepEqual(compiledStorageType("pool_fa2_mod.tz"), dexStorageTypeFA2Mod);
});

test("deployment schemas preserve arbitrary-precision storage integers", () => {
    const manager = "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU";
    // Distinct from manager: fee recipient is independent at origination.
    const protocolFeeRecipient = "tz1ddb9NMYHZi5UzPdzTZMYQQZoMub195zgv";
    const token = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton";
    const exactLqtTotal = "500000000000000000";
    const exactTokenId = "9007199254740993";

    const dexStorage = new Schema(dexStorageTypeFA2Mod).Encode({
        tokenPool: "0",
        xtzPool: "0",
        lqtTotal: exactLqtTotal,
        active: false,
        paused: true,
        activationPending: false,
        selfIsUpdatingTokenPool: false,
        freezeBaker: false,
        manager,
        pending_manager: null,
        tokenAddress: token,
        tokenId: exactTokenId,
        lqtAddress: manager,
        protocol_fee_recipient: protocolFeeRecipient,
        pending_protocol_fee_recipient: null,
        accumulated_protocol_fee_xtz: "0",
        accumulated_protocol_fee_token: "0",
    });

    const allocation = allocateInitialLqt(exactLqtTotal);
    const tokens = new MichelsonMap<string, string>();
    tokens.set(manager, allocation.provider);
    tokens.set(token, allocation.locked);
    const lqtStorage = new Schema(lqtStorageType).Encode({
        tokens,
        allowances: new MichelsonMap(),
        admin: token,
        total_supply: exactLqtTotal,
        metadata: new MichelsonMap(),
        token_metadata: new MichelsonMap(),
    });

    const encoded = JSON.stringify([dexStorage, lqtStorage]);
    assert.match(encoded, new RegExp(exactLqtTotal));
    assert.match(encoded, new RegExp(exactTokenId));
    assert.match(encoded, new RegExp(allocation.provider));
    assert.match(encoded, new RegExp(protocolFeeRecipient));
    assert.notEqual(protocolFeeRecipient, manager);
});
