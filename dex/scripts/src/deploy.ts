import { TezosToolkit } from "@taquito/taquito";
import { InMemorySigner } from "@taquito/signer";
import { FullConfig, getConfig } from "./config.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import {
    dexStorageType,
    lqtStorageType,
    type DexStorage,
    type LqtStorage,
    type NetworkName,
    type TokenInfo,
    type TokenMetadata,
} from "./types.js";
import { Parser } from "@taquito/michel-codec";
import { MichelsonMap, Schema } from "@taquito/michelson-encoder";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function parseArgs(): NetworkName {
    const args = process.argv.slice(2);
    const networkArg = args.find((arg) => arg.startsWith("--network="));
    const networkName = networkArg ? networkArg.split("=")[1] : "testnet";

    if (networkName !== "testnet" && networkName !== "mainnet") {
        throw new Error(`Invalid network: ${networkName}. Use 'testnet' or 'mainnet'.`);
    }

    return networkName as NetworkName;
}

function loadCompiledContract(filename: string): string {
    const contractPath = path.join(__dirname, "..", "..", "compiled_contracts", filename);
    return fs.readFileSync(contractPath, "utf8");
}

async function deployLQT(tezos: TezosToolkit, dexAddress: string, config: FullConfig): Promise<string> {
    console.log("\nDeploying LQT contract...");

    const lqtCode = loadCompiledContract("lqt.tz");
    const parser = new Parser();
    const parsedMichelson = parser.parseScript(lqtCode);

    let lqtTotal = Math.floor(Math.sqrt(+config.seedAmount.xtz * +config.seedAmount.token));

    let metadata: MichelsonMap<string, string> = new MichelsonMap();
    metadata.set("", Buffer.from(config.metadata_uri!).toString("hex"));

    let token_metadata: TokenMetadata = new MichelsonMap();
    let token_info: TokenInfo = new MichelsonMap();
    token_info.set("", Buffer.from(config.token_metadata_uri!).toString("hex"));
    token_metadata.set(0, { token_id: 0, token_info });

    let tokens: MichelsonMap<string, number> = new MichelsonMap();
    tokens.set(config.manager, lqtTotal);

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
    });

    console.log(`LQT operation: ${originationOp.hash}`);
    const contract = await originationOp.contract();
    console.log(`LQT deployed: ${contract.address}`);

    return contract.address;
}

async function deployDEX(tezos: TezosToolkit, config: FullConfig): Promise<string> {
    console.log("\nDeploying DEX contract...");

    const dexCode = loadCompiledContract("pool.tz");
    const parser = new Parser();
    const parsedMichelson = parser.parseScript(dexCode);

    const lqtTotal = Math.floor(Math.sqrt(+config.seedAmount.xtz * +config.seedAmount.token));

    const storageSchema = new Schema(dexStorageType);
    const dexStorage: DexStorage = {
        tokenPool: 0,
        xtzPool: 0,
        lqtTotal,
        selfIsUpdatingTokenPool: false,
        freezeBaker: false,
        manager: config.manager,
        tokenAddress: config.tokenAddress,
        lqtAddress: "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU",
    };
    const michelsonData = storageSchema.Encode(dexStorage);

    const originationOp = await tezos.contract.originate({
        code: parsedMichelson!,
        init: michelsonData,
    });

    console.log(`DEX operation: ${originationOp.hash}`);
    const contract = await originationOp.contract();
    console.log(`DEX deployed: ${contract.address}`);

    return contract.address;
}

async function setLQTAddress(tezos: TezosToolkit, dexAddress: string, lqtAddress: string): Promise<void> {
    console.log("\nSetting LQT address in DEX...");

    const dex = await tezos.contract.at(dexAddress);
    const op = await dex.methodsObject.setLqtAddress(lqtAddress).send();

    console.log(`SetLqtAddress operation: ${op.hash}`);
    await op.confirmation(1);
    console.log("✓ LQT address set");
}

function saveDeploymentInfo(network: NetworkName, dexAddress: string, lqtAddress: string, tokenAddress: string): void {
    const deploymentInfo = {
        network: network,
        timestamp: new Date().toISOString(),
        contracts: {
            dex: dexAddress,
            lqt: lqtAddress,
            token: tokenAddress,
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

async function checkBalance(config: FullConfig, tezos: TezosToolkit): Promise<void> {
    const pkh = await tezos.signer.publicKeyHash();
    const balance = await tezos.tz.getBalance(pkh);

    const seedXtz = config.seedAmount.xtz;
    const seedToken = config.seedAmount.token;

    // Check if balance is sufficient (seed amount + 2 XTZ buffer for fees)
    const requiredBalance = seedXtz + 2_000_000;
    if (balance.toNumber() < requiredBalance) {
        throw new Error(
            `Insufficient XTZ balance (${balance.toNumber()} XTZ). ` +
                `Required: ${requiredBalance} XTZ. ` +
                `Please fund the account ${pkh} on ${config.name} network.`
        );
    }

    // Check if token balance is sufficient
    const tokenContract = await tezos.contract.at(config.tokenAddress);
    const tokenStorage: any = await tokenContract.storage();
    const ledgerEntry = await tokenStorage.ledger?.get(pkh);
    const tokenBalance = ledgerEntry?.balance?.toNumber() ?? 0;

    if (tokenBalance < seedToken) {
        throw new Error(
            `Insufficient token balance (${tokenBalance}). ` +
                `Required: ${seedToken} tokens. ` +
                `Please fund the account ${pkh} on ${config.name} network.`
        );
    }

    console.log(`Balance check passed:`);
    console.log(`  XTZ: ${balance.toNumber() / 1_000_000} / ${requiredBalance / 1_000_000} required`);
    console.log(`  Tokens: ${tokenBalance} / ${seedToken} required`);
}

async function updateXtzPool(tezos: TezosToolkit, dex_address: string, config: FullConfig) {
    console.log("\nUpdating XTZ pool...");
    console.log(`Sending ${config.seedAmount.xtz} XTZ to DEX at ${dex_address}`);

    const contract = await tezos.contract.at(dex_address);
    const op = await contract.methodsObject.default().send({
        amount: +config.seedAmount.xtz,
        mutez: true,
    });

    console.log(`XTZ pool update operation: ${op.hash}`);
    await op.confirmation(1);
    console.log("✓ XTZ pool updated successfully");
}

async function updateTokenPool(tezos: TezosToolkit, dex_address: string, config: FullConfig) {
    console.log("\nUpdating Token pool...");
    const managerAddress = await tezos.signer.publicKeyHash();
    console.log(`Transferring ${config.seedAmount.token} tokens from ${managerAddress} to DEX`);

    const dex_contract = await tezos.contract.at(dex_address);
    const token_contract = await tezos.contract.at(config.tokenAddress);

    // First transfer token to DEX contract
    const transferOp = await token_contract.methodsObject
        .transfer({
            from: managerAddress,
            to: dex_address,
            value: config.seedAmount.token,
        })
        .send();

    console.log(`Token transfer operation: ${transferOp.hash}`);
    await transferOp.confirmation(1);
    console.log("✓ Tokens transferred to DEX");

    // Then update token pool in DEX
    console.log("Calling updateTokenPool on DEX...");
    const updateOp = await dex_contract.methodsObject.updateTokenPool().send();

    console.log(`Token pool update operation: ${updateOp.hash}`);
    await updateOp.confirmation(1);
    console.log("✓ Token pool updated successfully");
}

async function main(): Promise<void> {
    console.log("Dexter DEX Deployment");

    const networkName = parseArgs();
    console.log(`Network: ${networkName}`);

    const config = getConfig(networkName);

    const tezos = new TezosToolkit(config.rpc);
    tezos.setProvider({
        signer: await InMemorySigner.fromSecretKey(config.privateKey),
    });

    const pkh = await tezos.signer.publicKeyHash();
    console.log(`Deployer: ${pkh}`);

    await checkBalance(config, tezos);

    const managerAddress = config.manager || pkh;

    console.log(`Token: ${config.tokenAddress}`);
    console.log(`Manager: ${managerAddress}`);
    console.log(`Seed XTZ: ${config.seedAmount.xtz} mutez`);
    console.log(`Seed Tokens: ${config.seedAmount.token} tokens`);

    if (networkName === "mainnet") {
        console.log("WARNING: Deploying to MAINNET. Press Ctrl+C to cancel...");
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    try {
        const dexAddress = await deployDEX(tezos, config);
        const lqtAddress = await deployLQT(tezos, dexAddress, config);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await setLQTAddress(tezos, dexAddress, lqtAddress);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await updateXtzPool(tezos, dexAddress, config);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await updateTokenPool(tezos, dexAddress, config);
        saveDeploymentInfo(networkName, dexAddress, lqtAddress, config.tokenAddress);

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
