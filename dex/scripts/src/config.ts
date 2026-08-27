import dotenv from "dotenv";
import type { NetworkName } from "./types.ts";
import { parseNat } from "./amounts.js";
import {
    ValidationResult,
    validateAddress,
    validateContractAddress,
    validateKeyHash,
} from "@taquito/utils";

export const TEZOS_MAINNET_CHAIN_ID = "NetXdQprcVkpaWU";
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

dotenv.config();

interface NetworkConfig {
    name: string;
    rpc: string;
    tzktApiUrl: string;
    privateKey?: string;
    expectedChainId?: string;
    remoteSignerUrl?: string;
    remoteSignerPkh?: string;
}

interface SeedAmount {
    xtz: string;
    token: string;
}

interface Config {
    tokenAddress: string;
    seedAmount: SeedAmount;
    manager: string;
    /** Initial protocol fee claim recipient for mod pools; independent of manager. */
    protocolFeeRecipient: string;
    tokenStandard: string; // e.g. "FA1.2" or "FA2"
    metadata_uri: string;
    token_metadata_uri: string;
    tokenId: string; // Only for FA2
    poolType: "base" | "mod", // "base" for no fee functionality, "mod" for fee functionality
}

export const networks: Record<NetworkName, NetworkConfig> = {
    testnet: {
        name: "Ghostnet",
        rpc: process.env.TESTNET_RPC || "https://rpc.tzkt.io/ghostnet",
        tzktApiUrl:
            process.env.TESTNET_TZKT_API || "https://api.ghostnet.tzkt.io",
        privateKey: process.env.TESTNET_PRIVATE_KEY,
        expectedChainId: process.env.TESTNET_CHAIN_ID,
        remoteSignerUrl: process.env.TESTNET_REMOTE_SIGNER_URL,
        remoteSignerPkh: process.env.TESTNET_REMOTE_SIGNER_PKH,
    },
    mainnet: {
        name: "Mainnet",
        rpc: process.env.MAINNET_RPC || "https://rpc.tzkt.io/mainnet",
        tzktApiUrl: process.env.MAINNET_TZKT_API || "https://api.tzkt.io",
        privateKey: process.env.MAINNET_PRIVATE_KEY,
        expectedChainId: TEZOS_MAINNET_CHAIN_ID,
        remoteSignerUrl: process.env.MAINNET_REMOTE_SIGNER_URL,
        remoteSignerPkh: process.env.MAINNET_REMOTE_SIGNER_PKH,
    },
    // Optional smoke-test network; only required when deploying with --network=previewnet.
    previewnet: {
        name: "Previewnet",
        rpc:
            process.env.PREVIEWNET_RPC
            || "https://michelson.previewnet.tezosx.nomadic-labs.com",
        tzktApiUrl:
            process.env.PREVIEWNET_TZKT_API
            || "https://api.previewnet.tezosx.tzkt.io",
        privateKey: process.env.PREVIEWNET_PRIVATE_KEY,
        expectedChainId: process.env.PREVIEWNET_CHAIN_ID,
        remoteSignerUrl: process.env.PREVIEWNET_REMOTE_SIGNER_URL,
        remoteSignerPkh: process.env.PREVIEWNET_REMOTE_SIGNER_PKH,
    },
};

const poolTypeValue = getRequiredEnv("POOL_TYPE");
if (poolTypeValue !== "base" && poolTypeValue !== "mod") {
    throw new Error(`Invalid POOL_TYPE: ${poolTypeValue}. Use 'base' or 'mod'.`);
}
const poolType: "base" | "mod" = poolTypeValue;

const config: Config = {
    tokenAddress: getRequiredEnv("TOKEN_ADDRESS"),
    tokenId: getRequiredNatEnv("TOKEN_ID"),
    tokenStandard: getRequiredEnv("TOKEN_STANDARD"),
    seedAmount: {
        xtz: getRequiredNatEnv("SEED_XTZ"),
        token: getRequiredNatEnv("SEED_TOKEN"),
    },
    manager: getRequiredEnv("MANAGER"),
    protocolFeeRecipient: getRequiredEnv("PROTOCOL_FEE_RECIPIENT"),
    metadata_uri: getRequiredEnv("METADATA_URI"),
    token_metadata_uri: getRequiredEnv("TOKEN_METADATA_URI"),
    poolType,
};

export interface FullConfig extends NetworkConfig, Config {
    privateKey?: string;
    expectedChainId: string;
    confirmations: number;
    deploymentStateFile: string;
    dexArtifactSha256?: string;
    lqtArtifactSha256?: string;
    tokenCodeSha256?: string;
    managerThreshold?: number;
    protocolFeeRecipientThreshold?: number;
    tokenIntegrationOwner?: string;
    tokenIncidentChannel?: string;
    seedAmount: {
        xtz: string;
        token: string;
    };
}

export function getConfig(networkName: NetworkName): FullConfig {
    const networkConfig = networks[networkName];

    if (!networkConfig) {
        throw new Error(
            `Unknown network: ${networkName}. Use 'testnet', 'mainnet', or 'previewnet'.`
        );
    }

    const hasRemoteSigner =
        Boolean(networkConfig.remoteSignerUrl)
        && Boolean(networkConfig.remoteSignerPkh);
    if (
        Boolean(networkConfig.remoteSignerUrl)
        !== Boolean(networkConfig.remoteSignerPkh)
    ) {
        throw new Error(
            `${networkName.toUpperCase()}_REMOTE_SIGNER_URL and `
            + `${networkName.toUpperCase()}_REMOTE_SIGNER_PKH must be set together.`
        );
    }
    if (!networkConfig.privateKey && !hasRemoteSigner) {
        throw new Error(
            `Signer not configured for ${networkName}. Set `
            + `${networkName.toUpperCase()}_PRIVATE_KEY or the matching remote-signer variables.`
        );
    }

    if (!networkConfig.expectedChainId) {
        throw new Error(
            `${networkName.toUpperCase()}_CHAIN_ID must be set so deployment fails closed on the wrong RPC.`
        );
    }
    if (
        networkConfig.remoteSignerPkh
        && validateKeyHash(networkConfig.remoteSignerPkh) !== ValidationResult.VALID
    ) {
        throw new Error(
            `${networkName.toUpperCase()}_REMOTE_SIGNER_PKH is not a valid implicit address.`
        );
    }

    if (config.seedAmount.xtz === "0" || config.seedAmount.token === "0") {
        throw new Error(`Seed amounts not configured properly. Set SEED_XTZ and SEED_TOKEN in .env file.`);
    }

    if (config.tokenStandard !== "FA1.2" && config.tokenStandard !== "FA2") {
        throw new Error(`Invalid token standard: ${config.tokenStandard}. Use 'FA1.2' or 'FA2'.`);
    }

    requireValidAddress(
        validateContractAddress(config.tokenAddress),
        "TOKEN_ADDRESS"
    );
    requireValidAddress(validateAddress(config.manager), "MANAGER");
    requireValidAddress(
        validateAddress(config.protocolFeeRecipient),
        "PROTOCOL_FEE_RECIPIENT"
    );

    const dexArtifactSha256 = optionalSha256("DEX_ARTIFACT_SHA256");
    const lqtArtifactSha256 = optionalSha256("LQT_ARTIFACT_SHA256");
    const tokenCodeSha256 = optionalSha256("TOKEN_CODE_SHA256");
    const managerThreshold = getOptionalPositiveIntegerEnv(
        "MANAGER_MULTISIG_THRESHOLD"
    );
    const protocolFeeRecipientThreshold = getOptionalPositiveIntegerEnv(
        "PROTOCOL_FEE_RECIPIENT_MULTISIG_THRESHOLD"
    );
    const tokenIntegrationOwner = process.env.TOKEN_INTEGRATION_OWNER?.trim();
    const tokenIncidentChannel = process.env.TOKEN_INCIDENT_CHANNEL?.trim();
    if (
        networkName === "mainnet"
        && (!dexArtifactSha256 || !lqtArtifactSha256 || !tokenCodeSha256)
    ) {
        throw new Error(
            "Mainnet requires DEX_ARTIFACT_SHA256, LQT_ARTIFACT_SHA256, and TOKEN_CODE_SHA256."
        );
    }
    if (
        networkName === "mainnet"
        && (
            validateContractAddress(config.manager) !== ValidationResult.VALID
            || managerThreshold === undefined
            || (
                config.poolType === "mod"
                && (
                    validateContractAddress(config.protocolFeeRecipient)
                        !== ValidationResult.VALID
                    || protocolFeeRecipientThreshold === undefined
                )
            )
        )
    ) {
        throw new Error(
            "Mainnet requires originated multisig role addresses and documented thresholds."
        );
    }
    if (
        networkName === "mainnet"
        && (!tokenIntegrationOwner || !tokenIncidentChannel)
    ) {
        throw new Error(
            "Mainnet requires TOKEN_INTEGRATION_OWNER and TOKEN_INCIDENT_CHANNEL."
        );
    }

    return {
        ...networkConfig,
        ...config,
        expectedChainId: networkConfig.expectedChainId,
        confirmations: getPositiveIntegerEnv("CONFIRMATIONS", 2),
        deploymentStateFile:
            process.env.DEX_DEPLOYMENT_STATE?.trim()
            || `deployments/${networkName}-in-progress.json`,
        dexArtifactSha256,
        lqtArtifactSha256,
        tokenCodeSha256,
        managerThreshold,
        protocolFeeRecipientThreshold,
        tokenIntegrationOwner,
        tokenIncidentChannel,
        seedAmount: {
            xtz: config.seedAmount.xtz!,
            token: config.seedAmount.token!,
        },
    };
}

function getRequiredEnv(key: string): string {
    const value = process.env[key];
    if (!value || value.trim() === "") {
        throw new Error(`Required environment variable ${key} is not set or empty`);
    }
    return value;
}

function getRequiredNatEnv(key: string): string {
    return parseNat(getRequiredEnv(key), key);
}

function requireValidAddress(result: ValidationResult, name: string): void {
    if (result !== ValidationResult.VALID) {
        throw new Error(`${name} is not a valid Tezos address`);
    }
}

function optionalSha256(key: string): string | undefined {
    const value = process.env[key]?.trim().toLowerCase();
    if (!value) return undefined;
    if (!SHA256_PATTERN.test(value)) {
        throw new Error(`${key} must be a lowercase SHA-256 digest`);
    }
    return value;
}

function getPositiveIntegerEnv(key: string, fallback: number): number {
    const value = process.env[key]?.trim();
    if (!value) return fallback;
    if (!/^[1-9][0-9]*$/.test(value)) {
        throw new Error(`${key} must be a positive integer`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
        throw new Error(`${key} is too large`);
    }
    return parsed;
}

function getOptionalPositiveIntegerEnv(key: string): number | undefined {
    const value = process.env[key]?.trim();
    if (!value) return undefined;
    if (!/^[1-9][0-9]*$/.test(value)) {
        throw new Error(`${key} must be a positive integer`);
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed)) {
        throw new Error(`${key} is too large`);
    }
    return parsed;
}
