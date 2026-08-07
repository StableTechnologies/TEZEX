/**
 * One-off FA1.2 / FA2 transfer / mint helper for Previewnet smoke tests.
 *
 * FA1.2 mint (USDtz):
 *   FROM_PRIVATE_KEY=edsk... MINT=1 TOKEN_STANDARD=FA1.2 \
 *   TOKEN_ADDRESS=KT1... TO=tz1... AMOUNT=1000000000 \
 *   npx tsx src/transfer-fa2.ts
 *
 * FA2 mint (USDt):
 *   FROM_PRIVATE_KEY=edsk... MINT=1 TOKEN_STANDARD=FA2 TOKEN_ID=0 \
 *   TOKEN_ADDRESS=KT1... TO=tz1... AMOUNT=1000000000 \
 *   npx tsx src/transfer-fa2.ts
 */
import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { MichelsonMap } from "@taquito/michelson-encoder";
import dotenv from "dotenv";

dotenv.config();

const RPC =
    process.env.PREVIEWNET_RPC ||
    "https://michelson.previewnet.tezosx.nomadic-labs.com";
const privateKey = process.env.FROM_PRIVATE_KEY;
const tokenAddress = process.env.TOKEN_ADDRESS;
const tokenId = process.env.TOKEN_ID ?? "0";
const to = process.env.TO;
const amount = process.env.AMOUNT;
const mint = process.env.MINT === "1" || process.env.MINT === "true";
const tokenStandard = (process.env.TOKEN_STANDARD || "FA2").toUpperCase();

if (!privateKey || !tokenAddress || !to || !amount) {
    throw new Error(
        "Set FROM_PRIVATE_KEY, TOKEN_ADDRESS, TO, and AMOUNT (atomic units)."
    );
}
if (!/^\d+$/.test(amount)) {
    throw new Error("AMOUNT must be an exact base-10 integer in atomic units.");
}
if (tokenStandard !== "FA2" && tokenStandard !== "FA1.2") {
    throw new Error(`TOKEN_STANDARD must be FA2 or FA1.2, got ${tokenStandard}`);
}

const tezos = new TezosToolkit(RPC);
tezos.setProvider({ signer: await InMemorySigner.fromSecretKey(privateKey) });

const from = await tezos.signer.publicKeyHash();
const contract = await tezos.contract.at(tokenAddress);

console.log(
    mint
        ? `Minting ${tokenStandard}…`
        : `Transferring ${tokenStandard}…`
);
console.log(`  token: ${tokenAddress}${tokenStandard === "FA2" ? ` #${tokenId}` : ""}`);
console.log(`  from:  ${from}`);
console.log(`  to:    ${to}`);
console.log(`  amount:${amount}`);

// TezosX Previewnet rejects Taquito's default fee estimate
// (evm_node.dev.insufficient_fees). Override with a generous mutez fee.
const sendParams = {
    fee: Number(process.env.FEE_MUTEZ ?? "100000"),
    gasLimit: Number(process.env.GAS_LIMIT ?? "200000"),
    storageLimit: Number(process.env.STORAGE_LIMIT ?? "2000"),
};

let op;
if (mint) {
    if (tokenStandard === "FA1.2") {
        op = await contract.methodsObject
            .mint({ address: to, value: amount })
            .send(sendParams);
    } else {
        op = await contract.methodsObject
            .mint({
                address: to,
                amount,
                metadata: new MichelsonMap(),
                token_id: tokenId,
            })
            .send(sendParams);
    }
} else if (tokenStandard === "FA1.2") {
    op = await contract.methodsObject
        .transfer({ from, to, value: amount })
        .send(sendParams);
} else {
    op = await contract.methodsObject
        .transfer([
            {
                from_: from,
                txs: [{ to_: to, token_id: tokenId, amount }],
            },
        ])
        .send(sendParams);
}

console.log(`Submitted: ${op.hash}`);
await op.confirmation(1);
console.log("Confirmed.");
