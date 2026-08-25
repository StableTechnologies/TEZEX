import { execFileSync } from "node:child_process";
import { TezosToolkit, type ParamsWithKind } from "@taquito/taquito";
import {
    FullConfig,
    TEZOS_MAINNET_CHAIN_ID,
    getConfig,
} from "./config.js";
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
import { createDeploymentSigner } from "./deployment-signer.js";
import {
    DEPLOYMENT_COMPILER_VERSION,
    DEPLOYMENT_STATE_VERSION,
    assertOperationApplied,
    deploymentFingerprint,
    loadDeploymentState,
    persistDeploymentState,
    recoverOrigination,
    releaseManifestState,
    sha256,
    type DeploymentArtifactRecord,
    type NativePoolDeploymentState,
} from "./deployment-state.js";
import { scriptCodeSha256 } from "./token-code-hash.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repositoryRoot = path.resolve(__dirname, "..", "..", "..");

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

function compiledContractPath(filename: string): string {
    return path.resolve(__dirname, "..", "..", "compiled_contracts", filename);
}

function selectedDexContract(config: FullConfig): string {
    return config.tokenStandard === "FA2"
        ? (config.poolType === "mod" ? "pool_fa2_mod.tz" : "pool_fa2.tz")
        : (config.poolType === "mod" ? "pool_mod.tz" : "pool.tz");
}

function readArtifact(filename: string): {
    source: string;
    script: NonNullable<ReturnType<Parser["parseScript"]>>;
    record: DeploymentArtifactRecord;
} {
    const absolutePath = compiledContractPath(filename);
    const source = fs.readFileSync(absolutePath, "utf8");
    const script = new Parser().parseScript(source);
    if (!script) throw new Error(`Could not parse compiled contract ${absolutePath}`);
    return {
        source,
        script,
        record: {
            path: path.relative(repositoryRoot, absolutePath),
            sha256: sha256(source),
            codeSha256: scriptCodeSha256(script),
        },
    };
}

function sourceCommit(): string {
    return execFileSync("git", ["rev-parse", "HEAD"], {
        cwd: repositoryRoot,
        encoding: "utf8",
    }).trim();
}

function sourceIsClean(): boolean {
    return execFileSync("git", ["status", "--porcelain"], {
        cwd: repositoryRoot,
        encoding: "utf8",
    }).trim() === "";
}

async function contractCodeHash(
    tezos: TezosToolkit,
    address: string
): Promise<string> {
    const script = await tezos.rpc.getScript(address);
    if (!script.code) throw new Error(`Contract ${address} has no script code`);
    return scriptCodeSha256(script.code);
}

function assertPinnedDigest(
    label: string,
    actual: string,
    expected?: string
): void {
    if (expected && actual !== expected) {
        throw new Error(
            `${label} artifact hash mismatch: expected ${expected}, received ${actual}`
        );
    }
}

async function deployLQT(
    tezos: TezosToolkit,
    dexAddress: string,
    config: FullConfig,
    networkName: NetworkName,
    lqtScript: NonNullable<ReturnType<Parser["parseScript"]>>,
    onInjected: (operation: string) => Promise<void>
): Promise<{ address: string; operation: string }> {
    console.log("\nDeploying LQT contract...");

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

    const originationParams = {
        code: lqtScript,
        init: michelsonData,
        ...(needsExplicitOpLimits(networkName)
            ? previewnetOriginateLimits()
            : {}),
    };
    await tezos.estimate.originate(originationParams);
    console.log("✓ LQT origination simulation passed");
    const originationOp = await tezos.contract.originate(originationParams);

    console.log(`LQT operation: ${originationOp.hash}`);
    await onInjected(originationOp.hash);
    const contract = await originationOp.contract(config.confirmations);
    console.log(`LQT deployed: ${contract.address}`);

    return { address: contract.address, operation: originationOp.hash };
}

async function deployDEX(
    tezos: TezosToolkit,
    config: FullConfig,
    deploymentManager: string,
    networkName: NetworkName,
    dexScript: NonNullable<ReturnType<Parser["parseScript"]>>,
    onInjected: (operation: string) => Promise<void>
): Promise<{ address: string; operation: string }> {
    console.log("\nDeploying DEX contract...");

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
            paused: true,
            activationPending: false,
        }),
        selfIsUpdatingTokenPool: false,
        freezeBaker: false,
        // The signer manages only the inactive initialization window. The
        // initialization batch proposes the reviewed production roles.
        manager: deploymentManager,
        ...(config.poolType === "mod" && {
            pending_manager: null,
        }),
        tokenAddress: config.tokenAddress,
        lqtAddress: "tz1Ke2h7sDdakHJQh8WX4Z372du1KChsksyU",
        tokenId: config.tokenStandard === "FA2" ? config.tokenId : undefined,

        // Fees are immutable in contract code (25/5 bp). Only the claim
        // recipient is configurable; independent of MANAGER.
        ...(config.poolType === "mod" && {
            // The deployment signer is a temporary recipient. The reviewed
            // production recipient must accept its own two-step handoff.
            protocol_fee_recipient: deploymentManager,
            pending_protocol_fee_recipient: null,
            accumulated_protocol_fee_xtz: "0",
            accumulated_protocol_fee_token: "0",
        }),
    };
    const michelsonData = storageSchema.Encode(dexStorage);

    const originationParams = {
        code: dexScript,
        init: michelsonData,
        ...(needsExplicitOpLimits(networkName)
            ? previewnetOriginateLimits()
            : {}),
    };
    await tezos.estimate.originate(originationParams);
    console.log("✓ DEX origination simulation passed");
    const originationOp = await tezos.contract.originate(originationParams);

    console.log(`DEX operation: ${originationOp.hash}`);
    await onInjected(originationOp.hash);
    const contract = await originationOp.contract(config.confirmations);
    console.log(`DEX deployed: ${contract.address}`);

    return { address: contract.address, operation: originationOp.hash };
}

function saveDeploymentInfo(state: NativePoolDeploymentState): void {
    const outputDir = path.join(__dirname, "..", "deployments");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const deploymentInfo = {
        ...releaseManifestState(state),
        manifestCreatedAt: new Date().toISOString(),
    };
    const filename = `${state.network}-${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, `${JSON.stringify(deploymentInfo, null, 2)}\n`, {
        mode: 0o600,
    });
    fs.chmodSync(filepath, 0o600);

    const latestPath = path.join(outputDir, `${state.network}-latest.json`);
    fs.writeFileSync(latestPath, `${JSON.stringify(deploymentInfo, null, 2)}\n`, {
        mode: 0o600,
    });
    fs.chmodSync(latestPath, 0o600);

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

class TransferParamsBatch {
    readonly operations: ParamsWithKind[] = [];

    withContractCall(
        call: unknown,
        options?: {
            amount?: number;
            mutez?: true;
            fee?: number;
            gasLimit?: number;
            storageLimit?: number;
        }
    ): this {
        const method = call as {
            toTransferParams: (value?: typeof options) => ParamsWithKind;
        };
        if (typeof method.toTransferParams !== "function") {
            throw new Error("Initialization call cannot be converted to transfer parameters");
        }
        this.operations.push(method.toTransferParams(options));
        return this;
    }
}

async function initializePool(
    tezos: TezosToolkit,
    dexAddress: string,
    lqtAddress: string,
    config: FullConfig,
    networkName: NetworkName,
    onInjected: (operation: string) => Promise<void>
): Promise<string> {
    console.log("\nInitializing pool atomically...");
    const managerAddress = await tezos.signer.publicKeyHash();

    const dexContract = await tezos.contract.at(dexAddress);
    const tokenContract = await tezos.contract.at(config.tokenAddress);

    const tokenTransferParams = prepareTokenTransfer(config.tokenStandard, {
        from: managerAddress,
        to: dexAddress,
        amount: config.seedAmount.token,
        tokenId: config.tokenStandard === "FA2" ? config.tokenId : undefined,
    });

    const callLimits = needsExplicitOpLimits(networkName)
        ? previewnetBatchCallLimits(
            initializationOpCount(
                config.poolType,
                managerAddress,
                config.manager,
                managerAddress,
                config.protocolFeeRecipient
            )
        )
        : undefined;

    const initializationBatch = appendInitializationCalls({
        batch: new TransferParamsBatch(),
        dexContract,
        tokenContract,
        tokenTransfer: tokenTransferParams.transfer,
        lqtAddress,
        seedXtz: toSafeNumber(config.seedAmount.xtz, "SEED_XTZ"),
        seedToken: config.seedAmount.token,
        lqtTotal: calculateInitialLqt(
            config.seedAmount.xtz,
            config.seedAmount.token
        ),
        poolType: config.poolType,
        deploymentManager: managerAddress,
        finalManager: config.manager,
        deploymentProtocolFeeRecipient: managerAddress,
        finalProtocolFeeRecipient: config.protocolFeeRecipient,
        callLimits,
    });

    await tezos.estimate.batch(initializationBatch.operations);
    console.log("✓ Atomic initialization simulation passed");
    const op = await tezos.contract.batch(initializationBatch.operations).send();
    console.log(`Pool initialization operation: ${op.hash}`);
    await onInjected(op.hash);
    await op.confirmation(config.confirmations);
    console.log(
        config.poolType === "mod"
            ? config.manager === managerAddress
                && config.protocolFeeRecipient === managerAddress
                ? "✓ Pool funded, activated, and unpaused under final roles"
                : "✓ Pool funded, activated, paused, and final roles proposed"
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

function toOptionAddress(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "string") return value;
    const candidate = value as { Some?: unknown; some?: unknown };
    const address = candidate.Some ?? candidate.some;
    return address === undefined || address === null ? null : String(address);
}

async function resumeOrigination(
    kind: "dex" | "lqt",
    tezos: TezosToolkit,
    config: FullConfig,
    state: NativePoolDeploymentState,
    expectedCodeSha256: string
): Promise<string | undefined> {
    const step = state.steps[kind];
    if (!step) return undefined;
    if (!step.address) {
        step.address = await recoverOrigination(
            config.tzktApiUrl,
            step.operation
        );
        step.status = "applied";
        await persistDeploymentState(config.deploymentStateFile, state);
    } else if (step.status !== "applied") {
        await assertOperationApplied(config.tzktApiUrl, step.operation);
        step.status = "applied";
        await persistDeploymentState(config.deploymentStateFile, state);
    }
    const actualCodeSha256 = await contractCodeHash(tezos, step.address);
    if (actualCodeSha256 !== expectedCodeSha256) {
        throw new Error(
            `Recorded ${kind.toUpperCase()} address has unexpected on-chain code`
        );
    }
    console.log(`Resuming with recorded ${kind.toUpperCase()}: ${step.address}`);
    return step.address;
}

async function resumeInitialization(
    config: FullConfig,
    state: NativePoolDeploymentState
): Promise<boolean> {
    const step = state.steps.initialization;
    if (!step) return false;
    if (step.status !== "applied") {
        await assertOperationApplied(config.tzktApiUrl, step.operation);
        step.status = "applied";
        await persistDeploymentState(config.deploymentStateFile, state);
    }
    console.log(`Resuming after initialization operation: ${step.operation}`);
    return true;
}

async function verifyDeployment(
    tezos: TezosToolkit,
    dexAddress: string,
    lqtAddress: string,
    config: FullConfig,
    deploymentManager: string,
    expectedCodeSha256: { dex: string; lqt: string; token: string }
): Promise<void> {
    console.log("\nVerifying initialized on-chain state...");
    const [dexCodeSha256, lqtCodeSha256, tokenCodeSha256] = await Promise.all([
        contractCodeHash(tezos, dexAddress),
        contractCodeHash(tezos, lqtAddress),
        contractCodeHash(tezos, config.tokenAddress),
    ]);
    if (
        dexCodeSha256 !== expectedCodeSha256.dex
        || lqtCodeSha256 !== expectedCodeSha256.lqt
        || tokenCodeSha256 !== expectedCodeSha256.token
    ) {
        throw new Error(
            "Post-deployment code hash disagrees with the reviewed deployment manifest"
        );
    }
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

    const managerHandoffPending =
        config.poolType === "mod" && config.manager !== deploymentManager;
    const recipientHandoffPending =
        config.poolType === "mod"
        && config.protocolFeeRecipient !== deploymentManager;
    const expectedManager = managerHandoffPending
        ? deploymentManager
        : config.manager;
    if (dexStorage.manager !== expectedManager) {
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
        && dexStorage.paused !== (managerHandoffPending || recipientHandoffPending)
    ) {
        throw new Error("Deployment verification failed for pool pause state");
    }
    if (
        config.poolType === "mod"
        && toOptionAddress(dexStorage.pending_manager)
            !== (managerHandoffPending ? config.manager : null)
    ) {
        throw new Error("Deployment verification failed for pending manager");
    }
    if (
        config.poolType === "mod"
        && dexStorage.protocol_fee_recipient
            !== (recipientHandoffPending
                ? deploymentManager
                : config.protocolFeeRecipient)
    ) {
        throw new Error(
            "Deployment verification failed for protocol fee recipient"
        );
    }
    if (
        config.poolType === "mod"
        && toOptionAddress(dexStorage.pending_protocol_fee_recipient)
            !== (recipientHandoffPending ? config.protocolFeeRecipient : null)
    ) {
        throw new Error(
            "Deployment verification failed for pending protocol fee recipient"
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
    const initialLqt = allocateInitialLqt(
        calculateInitialLqt(config.seedAmount.xtz, config.seedAmount.token)
    );
    const dexArtifact = readArtifact(selectedDexContract(config));
    const lqtArtifact = readArtifact("lqt.tz");
    assertPinnedDigest(
        "DEX",
        dexArtifact.record.sha256,
        config.dexArtifactSha256
    );
    assertPinnedDigest(
        "LQT",
        lqtArtifact.record.sha256,
        config.lqtArtifactSha256
    );
    const commit = sourceCommit();
    const sourceDirty = !sourceIsClean();
    if (sourceDirty) {
        if (
            networkName === "mainnet"
            || process.env.ALLOW_DIRTY_DEPLOYMENT !== "1"
        ) {
            throw new Error(
                "Deployment requires a clean Git worktree. Test networks may explicitly set ALLOW_DIRTY_DEPLOYMENT=1."
            );
        }
        console.warn("WARNING: test deployment explicitly allows a dirty worktree");
    }

    const tezos = new TezosToolkit(config.rpc);
    const deploymentSigner = await createDeploymentSigner(config);
    tezos.setProvider({ signer: deploymentSigner.signer });

    const [pkh, chainId] = await Promise.all([
        tezos.signer.publicKeyHash(),
        tezos.rpc.getChainId(),
    ]);
    if (chainId !== config.expectedChainId) {
        throw new Error(
            `RPC chain ID mismatch: expected ${config.expectedChainId}, received ${chainId}`
        );
    }
    if (networkName !== "mainnet" && chainId === TEZOS_MAINNET_CHAIN_ID) {
        throw new Error("Non-mainnet deployment refuses the Tezos Mainnet chain ID");
    }
    console.log(`Deployer: ${pkh}`);

    await assertTokenStandardMatchesContract(
        tezos,
        config.tokenAddress,
        config.tokenStandard
    );
    const tokenCodeSha256 = await contractCodeHash(tezos, config.tokenAddress);
    if (
        config.tokenCodeSha256
        && config.tokenCodeSha256 !== tokenCodeSha256
    ) {
        throw new Error(
            `Token code hash mismatch: expected ${config.tokenCodeSha256}, received ${tokenCodeSha256}`
        );
    }

    const stateConfig: NativePoolDeploymentState["config"] = {
        tokenAddress: config.tokenAddress,
        tokenStandard: config.tokenStandard as "FA1.2" | "FA2",
        tokenId: config.tokenId,
        poolType: config.poolType,
        seedXtz: config.seedAmount.xtz,
        seedToken: config.seedAmount.token,
        finalManager: config.manager,
        protocolFeeRecipient: config.protocolFeeRecipient,
        roleThresholds: {
            manager: config.managerThreshold ?? null,
            protocolFeeRecipient:
                config.protocolFeeRecipientThreshold ?? null,
        },
        tokenOperations: {
            integrationOwner: config.tokenIntegrationOwner ?? null,
            incidentChannel: config.tokenIncidentChannel ?? null,
            monitoredEventClasses: [
                "pause-or-unpause",
                "upgrade-or-migration",
                "freeze-or-revoke",
                "mint-or-burn",
                "administrator-change",
            ],
        },
        metadataUri: config.metadata_uri,
        tokenMetadataUri: config.token_metadata_uri,
        confirmations: config.confirmations,
        initialLqt,
        ...(config.poolType === "mod" && {
            feeBasisPoints: {
                liquidityProviders: MOD_LP_FEE_BP,
                protocol: MOD_PROTOCOL_FEE_BP,
                total: MOD_TOTAL_FEE_BP,
            },
        }),
    };
    const fingerprint = deploymentFingerprint({
        network: networkName,
        chainId,
        commit,
        sourceDirty,
        deployer: pkh,
        signerMode: deploymentSigner.mode,
        artifacts: {
            dex: dexArtifact.record.sha256,
            lqt: lqtArtifact.record.sha256,
            token: tokenCodeSha256,
        },
        config: stateConfig,
    });
    const existingState = await loadDeploymentState(
        config.deploymentStateFile
    );
    const state: NativePoolDeploymentState = existingState ?? {
        version: DEPLOYMENT_STATE_VERSION,
        fingerprint,
        network: networkName,
        rpc: config.rpc,
        chainId,
        sourceCommit: commit,
        sourceDirty,
        compilerVersion: DEPLOYMENT_COMPILER_VERSION,
        signerMode: deploymentSigner.mode,
        deployer: pkh,
        artifacts: {
            dex: dexArtifact.record,
            lqt: lqtArtifact.record,
            tokenCodeSha256,
        },
        config: stateConfig,
        steps: {},
    };
    if (state.fingerprint !== fingerprint || state.deployer !== pkh) {
        throw new Error(
            `Deployment state ${config.deploymentStateFile} belongs to different code, configuration, chain, or signer.`
        );
    }
    // RPC providers may be rotated during recovery, but the reported chain ID
    // must remain identical to the state fingerprint.
    state.rpc = config.rpc;
    await persistDeploymentState(config.deploymentStateFile, state);
    console.log(`Deployment state: ${path.resolve(config.deploymentStateFile)}`);

    if (!state.steps.initialization) {
        await checkBalance(config, tezos, networkName);
    }

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
        let dexAddress = await resumeOrigination(
            "dex",
            tezos,
            config,
            state,
            dexArtifact.record.codeSha256
        );
        if (!dexAddress) {
            const originated = await deployDEX(
                tezos,
                config,
                pkh,
                networkName,
                dexArtifact.script,
                async (operation) => {
                    state.steps.dex = { operation, status: "injected" };
                    await persistDeploymentState(config.deploymentStateFile, state);
                }
            );
            dexAddress = originated.address;
            state.steps.dex = {
                address: originated.address,
                operation: originated.operation,
                status: "applied",
            };
            await persistDeploymentState(config.deploymentStateFile, state);
        }

        let lqtAddress = await resumeOrigination(
            "lqt",
            tezos,
            config,
            state,
            lqtArtifact.record.codeSha256
        );
        if (!lqtAddress) {
            const originated = await deployLQT(
                tezos,
                dexAddress,
                config,
                networkName,
                lqtArtifact.script,
                async (operation) => {
                    state.steps.lqt = { operation, status: "injected" };
                    await persistDeploymentState(config.deploymentStateFile, state);
                }
            );
            lqtAddress = originated.address;
            state.steps.lqt = {
                address: originated.address,
                operation: originated.operation,
                status: "applied",
            };
            await persistDeploymentState(config.deploymentStateFile, state);
        }

        if (!await resumeInitialization(config, state)) {
            const initializationOperation = await initializePool(
                tezos,
                dexAddress,
                lqtAddress,
                config,
                networkName,
                async (operation) => {
                    state.steps.initialization = {
                        operation,
                        status: "injected",
                    };
                    await persistDeploymentState(config.deploymentStateFile, state);
                }
            );
            state.steps.initialization = {
                operation: initializationOperation,
                status: "applied",
            };
            await persistDeploymentState(config.deploymentStateFile, state);
        }
        await verifyDeployment(
            tezos,
            dexAddress,
            lqtAddress,
            config,
            pkh,
            {
                dex: dexArtifact.record.codeSha256,
                lqt: lqtArtifact.record.codeSha256,
                token: tokenCodeSha256,
            }
        );
        state.steps.verified = { at: new Date().toISOString() };
        await persistDeploymentState(config.deploymentStateFile, state);
        saveDeploymentInfo(state);

        console.log("\nDeployment complete");
        console.log(`DEX: ${dexAddress}`);
        console.log(`LQT: ${lqtAddress}`);
        if (config.poolType === "mod") {
            if (config.protocolFeeRecipient !== pkh) {
                console.log(
                    `NEXT: ${config.protocolFeeRecipient} must call %acceptProtocolFeeRecipient.`
                );
            }
            if (config.manager !== pkh) {
                console.log(`NEXT: ${config.manager} must call %acceptManager.`);
            }
            if (
                config.manager !== pkh
                || config.protocolFeeRecipient !== pkh
            ) {
                console.log(
                    `NEXT: ${config.manager} must call %setPaused false after all role acceptances.`
                );
            }
        }
    } catch (error: any) {
        console.error("Deployment failed:", error.message);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
