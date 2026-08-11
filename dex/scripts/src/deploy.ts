import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { FullConfig, getConfig } from "./config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
    dexStorageType,
    dexStorageTypeFA2,
    dexStorageTypeFA2Mod,
    dexStorageTypeMod,
    lqtStorageType,
    MOD_LP_FEE_BP,
    MOD_PROTOCOL_FEE_BP,
    MOD_TOTAL_FEE_BP,
    type DexStorage,
    type LqtStorage,
    type NetworkName,
    type TokenInfo,
    type TokenMetadata,
} from "./types.js";
import { Parser } from "@taquito/michel-codec";
import { MichelsonMap, Schema } from "@taquito/michelson-encoder";
import { assertTokenStandardMatchesContract, getTokenBalance, prepareTokenTransfer } from "./util.js";
import {
    allocateInitialLqt,
    calculateInitialLqt,
    formatMutez,
    toSafeNumber,
} from "./amounts.js";
import { appendInitializationCalls, initializationOpCount } from "./initialization.js";
import { verifyAtLeast, verifyEqual } from "./verification.js";
import {
    needsExplicitOpLimits,
    previewnetBatchCallLimits,
    previewnetFeeBufferMutez,
    previewnetOriginateLimits,
} from "./tezosxLimits.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPPORTED_NETWORKS: readonly NetworkName[] = [
    "testnet",
    "mainnet",
    "previewnet",
];

function parseArgs(): NetworkName {
    const args = process.argv.slice(2);
    const networkArg = args.find((arg) => arg.startsWith("--network="));
    const networkName = networkArg ? networkArg.split("=")[1] : "testnet";

    if (!SUPPORTED_NETWORKS.includes(networkName as NetworkName)) {
        throw new Error(
            `Invalid network: ${networkName}. Use 'testnet', 'mainnet', or 'previewnet'.`
        );
    }

    return networkName as NetworkName;
}

function loadCompiledContract(filename: string): string {
    const contractPath = path.join(__dirname, "..", "..", "compiled_contracts", filename);
    return fs.readFileSync(contractPath, "utf8");
}

async function deployLQT(
    tezos: TezosToolkit,
    dexAddress: string,
    config: FullConfig,
    networkName: NetworkName
): Promise<string> {
    console.log("\nDeploying LQT contract...");

    const lqtCode = loadCompiledContract("lqt.tz");
    const parser = new Parser();
    const parsedMichelson = parser.parseScript(lqtCode);

    const lqtTotal = calculateInitialLqt(
        config.seedAmount.xtz,
        config.seedAmount.token
    );
    const lqtAllocation = allocateInitialLqt(lqtTotal);

    let metadata: MichelsonMap<string, string> = new MichelsonMap();
    metadata.set("", Buffer.from(config.metadata_uri!).toString("hex"));

    let token_metadata: TokenMetadata = new MichelsonMap();
    let token_info: TokenInfo = new MichelsonMap();
    token_info.set("", Buffer.from(config.token_metadata_uri!).toString("hex"));
    token_metadata.set(0, { token_id: 0, token_info });

    let tokens: MichelsonMap<string, string> = new MichelsonMap();
    tokens.set(config.manager, lqtAllocation.provider);
    tokens.set(dexAddress, lqtAllocation.locked);

    const storageSchema = new Schema(lqtStorageType);
    const lqtStorage: LqtStorage = {
        tokens,
        allowances: new MichelsonMap(),
        admin: dexAddress,
        total_supply: lqtTotal,
        metadata,
        token_metadata,
    };
    const michelsonData = storageSchema.Encode(lqtStorage);

    const originationOp = await tezos.contract.originate({
        code: parsedMichelson!,
        init: michelsonData,
        ...(needsExplicitOpLimits(networkName)
            ? previewnetOriginateLimits()
            : {}),
    });

    console.log(`LQT operation: ${originationOp.hash}`);
    const contract = await originationOp.contract();
    console.log(`LQT deployed: ${contract.address}`);

    return contract.address;
}

async function deployDEX(
    tezos: TezosToolkit,
    config: FullConfig,
    deploymentManager: string,
    networkName: NetworkName
): Promise<string> {
    console.log("\nDeploying DEX contract...");

    const contractFile =
        config.tokenStandard === "FA2"
            ? (config.poolType === "mod" ? "pool_fa2_mod.tz" : "pool_fa2.tz")
            : (config.poolType === "mod" ? "pool_mod.tz" : "pool.tz");
    const dexCode = loadCompiledContract(contractFile);
    const parser = new Parser();
    const parsedMichelson = parser.parseScript(dexCode);

    const lqtTotal = calculateInitialLqt(
        config.seedAmount.xtz,
        config.seedAmount.token
    );

    const storageSchema = new Schema(
        config.poolType === "mod"
            ? (config.tokenStandard === "FA2" ? dexStorageTypeFA2Mod : dexStorageTypeMod)
            : (config.tokenStandard === "FA2" ? dexStorageTypeFA2 : dexStorageType)
    );
    const dexStorage: DexStorage = {
        tokenPool: "0",
        xtzPool: "0",
        lqtTotal,
        ...(config.poolType === "mod" && {
            active: false,
            activationPending: false,
        }),
        selfIsUpdatingTokenPool: false,
        freezeBaker: false,
        // The signer manages only the inactive initialization window. The
        // initialization batch transfers management to config.manager.
        manager: deploymentManager,
        tokenAddress: config.tokenAddress,
        lqtAddress: "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU",
        tokenId: config.tokenStandard === "FA2" ? config.tokenId : undefined,

        // Fees are immutable in contract code (25/5 bp). Only the claim
        // recipient is configurable; independent of MANAGER.
        ...(config.poolType === "mod" && {
            protocol_fee_recipient: config.protocolFeeRecipient,
            accumulated_protocol_fee_xtz: "0",
            accumulated_protocol_fee_token: "0",
        }),
    };
    const michelsonData = storageSchema.Encode(dexStorage);

    const originationOp = await tezos.contract.originate({
        code: parsedMichelson!,
        init: michelsonData,
        ...(needsExplicitOpLimits(networkName)
            ? previewnetOriginateLimits()
            : {}),
    });

    console.log(`DEX operation: ${originationOp.hash}`);
    const contract = await originationOp.contract();
    console.log(`DEX deployed: ${contract.address}`);

    return contract.address;
}

function saveDeploymentInfo(
    network: NetworkName,
    dexAddress: string,
    lqtAddress: string,
    tokenAddress: string,
    initializationOperation: string,
    deploymentManager: string,
    config: FullConfig
): void {
    const lqtTotal = calculateInitialLqt(
        config.seedAmount.xtz,
        config.seedAmount.token
    );
    const lqtAllocation = allocateInitialLqt(lqtTotal);
    const deploymentInfo = {
        network: network,
        timestamp: new Date().toISOString(),
        contracts: {
            dex: dexAddress,
            lqt: lqtAddress,
            token: tokenAddress,
        },
        initializationOperation,
        configuration: {
            manager: config.manager,
            deploymentManager,
            tokenStandard: config.tokenStandard,
            tokenId: config.tokenId,
            poolType: config.poolType,
            seedAmount: config.seedAmount,
            lqtTotal,
            minimumLqt: lqtAllocation.locked,
            initialProviderLqt: lqtAllocation.provider,
            // Recorded for operators; not passed as storage (fees are hardcoded).
            lpFeeBp: config.poolType === "mod" ? MOD_LP_FEE_BP : undefined,
            protocolFeeBp: config.poolType === "mod" ? MOD_PROTOCOL_FEE_BP : undefined,
            totalFeeBp: config.poolType === "mod" ? MOD_TOTAL_FEE_BP : undefined,
            protocolFeeRecipient:
                config.poolType === "mod" ? config.protocolFeeRecipient : undefined,
        },
    };

    const outputDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `${network}-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

    const latestPath = path.join(outputDir, `${network}-latest.json`);
    fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

    console.log(`Deployment info saved: ${filepath}`);
}

async function checkBalance(
    config: FullConfig,
    tezos: TezosToolkit,
    networkName: NetworkName
): Promise<void> {
    const pkh = await tezos.signer.publicKeyHash();
    const balance = await tezos.tz.getBalance(pkh);

    const seedXtz = BigInt(config.seedAmount.xtz);
    const seedToken = BigInt(config.seedAmount.token);
    const balanceMutez = BigInt(balance.toString());

    // Seed amount + network fee buffer (Previewnet TezosX fees are much higher).
    const feeBuffer = needsExplicitOpLimits(networkName)
        ? previewnetFeeBufferMutez()
        : 2_000_000n;
    const requiredBalance = seedXtz + feeBuffer;
    if (balanceMutez < requiredBalance) {
        throw new Error(
            `Insufficient XTZ balance (${balanceMutez} mutez). ` +
            `Required: ${requiredBalance} mutez. ` +
            `Please fund the account ${pkh} on ${config.name} network.`
        );
    }

    // Check if token balance is sufficient
    const tokenBalance = await getTokenBalance(
        tezos,
        config.tokenAddress,
        pkh,
        config.tokenStandard,
        config.tokenId,
        config.tzktApiUrl
    );

    if (tokenBalance < seedToken) {
        throw new Error(
            `Insufficient token balance (${tokenBalance}). ` +
            `Required: ${seedToken} tokens. ` +
            `Please fund the account ${pkh} on ${config.name} network.`
        );
    }

    console.log(`Balance check passed:`);
    console.log(
        `  XTZ: ${formatMutez(balanceMutez.toString())} / ` +
        `${formatMutez(requiredBalance.toString())} required`
    );
    console.log(`  Tokens: ${tokenBalance} / ${seedToken} required`);
}

async function initializePool(
    tezos: TezosToolkit,
    dexAddress: string,
    lqtAddress: string,
    config: FullConfig,
    networkName: NetworkName
): Promise<string> {
    console.log("\nInitializing pool atomically...");
    const managerAddress = await tezos.signer.publicKeyHash();

    const dexContract = await tezos.contract.at(dexAddress);
    const tokenContract = await tezos.contract.at(config.tokenAddress);

    const transferParams = prepareTokenTransfer(config.tokenStandard, {
        from: managerAddress,
        to: dexAddress,
        amount: config.seedAmount.token,
        tokenId: config.tokenStandard === "FA2" ? config.tokenId : undefined,
    });

    const callLimits = needsExplicitOpLimits(networkName)
        ? previewnetBatchCallLimits(initializationOpCount(config.poolType))
        : undefined;

    const batch = appendInitializationCalls({
        batch: tezos.contract.batch(),
        dexContract,
        tokenContract,
        tokenTransfer: transferParams.transfer,
        lqtAddress,
        seedXtz: toSafeNumber(config.seedAmount.xtz, "SEED_XTZ"),
        seedToken: config.seedAmount.token,
        lqtTotal: calculateInitialLqt(
            config.seedAmount.xtz,
            config.seedAmount.token
        ),
        poolType: config.poolType,
        finalManager: config.manager,
        callLimits,
    });

    const op = await batch.send();
    console.log(`Pool initialization operation: ${op.hash}`);
    await op.confirmation(1);
    console.log(
        config.poolType === "mod"
            ? "✓ Pool funded, activated, and transferred to final manager"
            : "✓ Pool funded and transferred to final manager"
    );
    return op.hash;
}

function toNatString(value: unknown, field: string): string {
    if (
        value === null
        || value === undefined
        || typeof (value as { toString?: unknown }).toString !== "function"
    ) {
        throw new Error(`Missing numeric field ${field} during deployment verification`);
    }
    return BigInt((value as { toString(): string }).toString()).toString();
}

async function verifyDeployment(
    tezos: TezosToolkit,
    dexAddress: string,
    lqtAddress: string,
    config: FullConfig
): Promise<void> {
    console.log("\nVerifying initialized on-chain state...");
    const dexContract = await tezos.contract.at(dexAddress);
    const lqtContract = await tezos.contract.at(lqtAddress);
    const dexStorage: any = await dexContract.storage();
    const lqtStorage: any = await lqtContract.storage();
    const expectedLqtTotal = calculateInitialLqt(
        config.seedAmount.xtz,
        config.seedAmount.token
    );
    const expectedLqtAllocation = allocateInitialLqt(expectedLqtTotal);

    verifyEqual(toNatString(dexStorage.xtzPool, "DEX xtzPool"), config.seedAmount.xtz, "DEX xtzPool");
    const dexTokenPool = toNatString(dexStorage.tokenPool, "DEX tokenPool");
    if (config.poolType === "mod") {
        verifyAtLeast(dexTokenPool, config.seedAmount.token, "DEX tokenPool");
    } else {
        verifyEqual(dexTokenPool, config.seedAmount.token, "DEX tokenPool");
    }
    verifyEqual(toNatString(dexStorage.lqtTotal, "DEX lqtTotal"), expectedLqtTotal, "DEX lqtTotal");
    verifyEqual(
        toNatString(lqtStorage.total_supply, "LQT total_supply"),
        expectedLqtTotal,
        "LQT total_supply"
    );
    verifyEqual(
        toNatString(await lqtStorage.tokens.get(dexAddress), "locked LQT balance"),
        expectedLqtAllocation.locked,
        "locked LQT balance"
    );
    verifyEqual(
        toNatString(await lqtStorage.tokens.get(config.manager), "provider LQT balance"),
        expectedLqtAllocation.provider,
        "provider LQT balance"
    );

    if (dexStorage.manager !== config.manager) {
        throw new Error("Deployment verification failed for DEX manager");
    }
    if (dexStorage.tokenAddress !== config.tokenAddress) {
        throw new Error("Deployment verification failed for DEX token address");
    }
    if (dexStorage.lqtAddress !== lqtAddress) {
        throw new Error("Deployment verification failed for DEX LQT address");
    }
    if (lqtStorage.admin !== dexAddress) {
        throw new Error("Deployment verification failed for LQT administrator");
    }
    if (
        config.tokenStandard === "FA2"
        && toNatString(dexStorage.tokenId, "DEX tokenId") !== config.tokenId
    ) {
        throw new Error("Deployment verification failed for DEX token ID");
    }
    if (
        config.poolType === "mod"
        && (dexStorage.active !== true || dexStorage.activationPending !== false)
    ) {
        throw new Error("Deployment verification failed for pool activation state");
    }
    if (
        config.poolType === "mod"
        && dexStorage.protocol_fee_recipient !== config.protocolFeeRecipient
    ) {
        throw new Error(
            "Deployment verification failed for protocol fee recipient"
        );
    }

    const dexXtzBalance = await tezos.tz.getBalance(dexAddress);
    verifyEqual(dexXtzBalance.toString(), config.seedAmount.xtz, "DEX XTZ balance");

    const dexTokenBalance = await getTokenBalance(
        tezos,
        config.tokenAddress,
        dexAddress,
        config.tokenStandard,
        config.tokenId,
        config.tzktApiUrl
    );
    if (config.poolType === "mod") {
        verifyAtLeast(dexTokenBalance.toString(), dexTokenPool, "DEX token balance");
    } else {
        verifyEqual(dexTokenBalance.toString(), config.seedAmount.token, "DEX token balance");
    }

    console.log("✓ On-chain addresses, reserves, balances, supply, and activation verified");
}

async function main(): Promise<void> {
    console.log("Dexter DEX Deployment");

    const networkName = parseArgs();
    console.log(`Network: ${networkName}`);

    const config = getConfig(networkName);

    // Fail before any origination if the seeds cannot fund both an ordinary
    // provider position and the permanent liquidity floor.
    allocateInitialLqt(
        calculateInitialLqt(config.seedAmount.xtz, config.seedAmount.token)
    );

    const tezos = new TezosToolkit(config.rpc);
    tezos.setProvider({
        signer: await InMemorySigner.fromSecretKey(config.privateKey),
    });

    const pkh = await tezos.signer.publicKeyHash();
    console.log(`Deployer: ${pkh}`);

    await assertTokenStandardMatchesContract(
        tezos,
        config.tokenAddress,
        config.tokenStandard
    );
    await checkBalance(config, tezos, networkName);

    console.log(`Token: ${config.tokenAddress}`);
    console.log(`Temporary deployment manager: ${pkh}`);
    console.log(`Final manager: ${config.manager}`);
    if (config.poolType === "mod") {
        console.log(`Protocol fee recipient: ${config.protocolFeeRecipient}`);
    }
    console.log(`Seed XTZ: ${config.seedAmount.xtz} mutez`);
    console.log(`Seed Tokens: ${config.seedAmount.token} tokens`);

    if (networkName === "mainnet") {
        console.log("WARNING: Deploying to MAINNET. Press Ctrl+C to cancel...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    try {
        const dexAddress = await deployDEX(tezos, config, pkh, networkName);
        const lqtAddress = await deployLQT(tezos, dexAddress, config, networkName);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        const initializationOperation =
            await initializePool(tezos, dexAddress, lqtAddress, config, networkName);
        await verifyDeployment(tezos, dexAddress, lqtAddress, config);
        saveDeploymentInfo(
            networkName,
            dexAddress,
            lqtAddress,
            config.tokenAddress,
            initializationOperation,
            pkh,
            config
        );

        console.log("\nDeployment complete");
        console.log(`DEX: ${dexAddress}`);
        console.log(`LQT: ${lqtAddress}`);
    } catch (error: any) {
        console.error("Deployment failed:", error.message);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
