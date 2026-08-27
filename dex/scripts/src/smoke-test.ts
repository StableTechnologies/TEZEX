import { TezosToolkit, type TransferParams } from "@taquito/taquito";
import { getConfig } from "./config.js";
import { createDeploymentSigner } from "./deployment-signer.js";
import { getTokenBalance } from "./util.js";
import type { NetworkName } from "./types.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Matches Taquito ContractMethodObject: toTransferParams is sync. */
type ContractMethod = {
    toTransferParams: (params?: Partial<TransferParams>) => TransferParams;
    send: (
        params?: Partial<TransferParams>
    ) => Promise<{ hash: string; confirmation: (n: number) => Promise<unknown> }>;
};

function deadline(): string {
    return new Date(Date.now() + 60 * 60 * 1000).toISOString();
}

async function sendWithSafeFees(
    tezos: TezosToolkit,
    method: ContractMethod,
    options: Partial<TransferParams> = {}
): Promise<string> {
    const transferParams = method.toTransferParams(options);
    const estimate = await tezos.estimate.transfer(transferParams);
    const fee = Math.max(Math.ceil(estimate.suggestedFeeMutez * 4), 5_000);
    const gasLimit = Math.ceil(estimate.gasLimit * 1.5) + 1_000;
    const storageLimit = Math.ceil(estimate.storageLimit * 1.5) + 10;
    const op = await method.send({ ...options, fee, gasLimit, storageLimit });
    await op.confirmation(1);
    return op.hash;
}

function loadDeployment(network: NetworkName): { dex: string; lqt: string } {
    const latestPath = path.join(__dirname, "..", "deployments", `${network}-latest.json`);
    if (!fs.existsSync(latestPath)) {
        throw new Error(`Missing ${latestPath}. Run deploy first.`);
    }
    const info = JSON.parse(fs.readFileSync(latestPath, "utf8"));
    return { dex: info.contracts.dex, lqt: info.contracts.lqt };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getDexStorage(tezos: TezosToolkit, dexAddress: string): Promise<any> {
    const contract = await tezos.contract.at(dexAddress);
    return contract.storage();
}

function fa2Operator(
    token: Awaited<ReturnType<TezosToolkit["contract"]["at"]>>,
    owner: string,
    operator: string,
    tokenId: string | number,
    action: "add_operator" | "remove_operator"
): ContractMethod {
    return token.methodsObject.update_operators([{
        [action]: { owner, operator, token_id: Number(tokenId) },
    }]);
}

async function main(): Promise<void> {
    const network: NetworkName = "previewnet";
    const config = getConfig(network);
    const { dex: dexAddress, lqt: lqtAddress } = loadDeployment(network);

    const tezos = new TezosToolkit(config.rpc);
    tezos.setProvider({ signer: (await createDeploymentSigner(config)).signer });

    const pkh = await tezos.signer.publicKeyHash();
    const dex = await tezos.contract.at(dexAddress);
    const token = await tezos.contract.at(config.tokenAddress);

    console.log("TEZEX smoke test — previewnet");
    console.log(`Deployer: ${pkh}`);
    console.log(`DEX: ${dexAddress}`);
    console.log(`LQT: ${lqtAddress}`);

    let passed = 0;
    let failed = 0;

    const run = async (name: string, fn: () => Promise<void>) => {
        console.log(`\n--- ${name} ---`);
        try {
            await fn();
            console.log(`✓ ${name}`);
            passed++;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`✗ ${name}: ${message}`);
            failed++;
        }
    };

    await run("pool fees", async () => {
        const storage = await getDexStorage(tezos, dexAddress);
        const lp = Number(storage.lp_fee_bp);
        const protocol = Number(storage.protocol_fee_bp);
        console.log(`  lp_fee_bp=${lp}, protocol_fee_bp=${protocol}, total=${lp + protocol}`);
        if (lp !== 25 || protocol !== 5) {
            throw new Error(`Expected 25/5, got ${lp}/${protocol}`);
        }
    });

    await run("pool reserves", async () => {
        const storage = await getDexStorage(tezos, dexAddress);
        console.log(
            `  xtzPool=${storage.xtzPool}, tokenPool=${storage.tokenPool}, lqtTotal=${storage.lqtTotal}`
        );
        if (Number(storage.xtzPool) < 1_000_000 || Number(storage.tokenPool) < 1_000_000) {
            throw new Error("Pool reserves too low");
        }
    });

    const storageBefore = await getDexStorage(tezos, dexAddress);
    const feeXtzBefore = Number(storageBefore.accumulated_protocol_fee_xtz);
    const feeTokenBefore = Number(storageBefore.accumulated_protocol_fee_token);

    await run("swap XTZ → USDt (1 XTZ)", async () => {
        const hash = await sendWithSafeFees(
            tezos,
            dex.methodsObject.xtzToToken({
                to: pkh,
                minTokensBought: 1,
                deadline: deadline(),
            }),
            { amount: 1_000_000, mutez: true }
        );
        console.log(`  op: ${hash}`);
        const usdt = await getTokenBalance(tezos, config.tokenAddress, pkh, config.tokenStandard, config.tokenId);
        console.log(`  USDt balance: ${usdt}`);
    });

    await run("swap USDt → XTZ (0.5 USDt)", async () => {
        await sendWithSafeFees(
            tezos,
            fa2Operator(token, pkh, dexAddress, config.tokenId, "add_operator")
        );
        const hash = await sendWithSafeFees(
            tezos,
            dex.methodsObject.tokenToXtz({
                to: pkh,
                tokensSold: 500_000,
                minXtzBought: 100_000,
                deadline: deadline(),
            })
        );
        await sendWithSafeFees(
            tezos,
            fa2Operator(token, pkh, dexAddress, config.tokenId, "remove_operator")
        );
        console.log(`  op: ${hash}`);
    });

    await run("add liquidity (1 XTZ + ~1 USDt)", async () => {
        await sendWithSafeFees(
            tezos,
            fa2Operator(token, pkh, dexAddress, config.tokenId, "add_operator")
        );
        const hash = await sendWithSafeFees(
            tezos,
            dex.methodsObject.addLiquidity({
                owner: pkh,
                minLqtMinted: 1,
                maxTokensDeposited: 2_000_000,
                deadline: deadline(),
            }),
            { amount: 1_000_000, mutez: true }
        );
        await sendWithSafeFees(
            tezos,
            fa2Operator(token, pkh, dexAddress, config.tokenId, "remove_operator")
        );
        console.log(`  op: ${hash}`);
        const lqtContract = await tezos.contract.at(lqtAddress);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lqtStorage: any = await lqtContract.storage();
        const lqt = await lqtStorage.tokens.get(pkh);
        console.log(`  LP balance: ${lqt?.toNumber?.() ?? lqt ?? 0}`);
    });

    await run("protocol fees accumulated", async () => {
        const storage = await getDexStorage(tezos, dexAddress);
        const feeXtz = Number(storage.accumulated_protocol_fee_xtz);
        const feeToken = Number(storage.accumulated_protocol_fee_token);
        console.log(`  accumulated XTZ fee: ${feeXtz} mutez (was ${feeXtzBefore})`);
        console.log(`  accumulated token fee: ${feeToken} (was ${feeTokenBefore})`);
        if (feeXtz <= feeXtzBefore && feeToken <= feeTokenBefore) {
            throw new Error("Expected protocol fees to increase after swaps");
        }
    });

    await run("claim protocol fees", async () => {
        const storage = await getDexStorage(tezos, dexAddress);
        if (Number(storage.accumulated_protocol_fee_xtz) > 0) {
            const hash = await sendWithSafeFees(tezos, dex.methodsObject.claimProtocolFeeXtz());
            console.log(`  claimProtocolFeeXtz: ${hash}`);
        }
        if (Number(storage.accumulated_protocol_fee_token) > 0) {
            const hash = await sendWithSafeFees(tezos, dex.methodsObject.claimProtocolFeeToken());
            console.log(`  claimProtocolFeeToken: ${hash}`);
        }
        const after = await getDexStorage(tezos, dexAddress);
        if (Number(after.accumulated_protocol_fee_xtz) !== 0 || Number(after.accumulated_protocol_fee_token) !== 0) {
            throw new Error("Fees not fully claimed");
        }
    });

    console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
    if (failed > 0) process.exit(1);
}

main().catch((error) => {
    console.error("Fatal:", error);
    process.exit(1);
});
