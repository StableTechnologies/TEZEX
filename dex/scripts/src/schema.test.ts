import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { Parser } from "@taquito/michel-codec";
import { MichelsonMap, Schema } from "@taquito/michelson-encoder";
import {
    dexStorageTypeFA2Mod,
    dexStorageTypeMod,
    lqtStorageType,
} from "./types.js";

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

test("deployment schemas match the compiled modified contracts", () => {
    assert.deepEqual(compiledStorageType("pool_mod.tz"), dexStorageTypeMod);
    assert.deepEqual(compiledStorageType("pool_fa2_mod.tz"), dexStorageTypeFA2Mod);
});

test("deployment schemas preserve arbitrary-precision storage integers", () => {
    const manager = "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU";
    const token = "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton";
    const exactLqtTotal = "500000000000000000";
    const exactTokenId = "9007199254740993";

    const dexStorage = new Schema(dexStorageTypeFA2Mod).Encode({
        tokenPool: "0",
        xtzPool: "0",
        lqtTotal: exactLqtTotal,
        active: false,
        activationPending: false,
        selfIsUpdatingTokenPool: false,
        freezeBaker: false,
        manager,
        tokenAddress: token,
        tokenId: exactTokenId,
        lqtAddress: manager,
        protocol_fee_bp: 5,
        protocol_fee_recipient: manager,
        accumulated_protocol_fee_xtz: "0",
        accumulated_protocol_fee_token: "0",
    });

    const tokens = new MichelsonMap<string, string>();
    tokens.set(manager, exactLqtTotal);
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
});
