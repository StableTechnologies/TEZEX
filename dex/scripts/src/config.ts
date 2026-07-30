import dotenv from "dotenv";
import type { NetworkName } from "./types.ts";
import { parseNat } from "./amounts.js";
import {
    ValidationResult,
    validateAddress,
    validateContractAddress,
    validateKeyHash,
} from "@taquito/utils";

dotenv.config();

interface NetworkConfig {
    name: string;
    rpc: string;
    privateKey?: string;
}

interface SeedAmount {
    xtz: string;
    token: string;
}

interface Config {
    tokenAddress: string;
    seedAmount: SeedAmount;
    manager: string;
    tokenStandard: string; // e.g. "FA1.2" or "FA2"
    metadata_uri: string;
    token_metadata_uri: string;
    tokenId: string; // Only for FA2
    poolType: "base" | "mod", // "base" for no fee functionality, "mod" for fee functionality
    protocol_fee_bp?: number; // Protocol fee in basis points
    protocol_fee_recipient?: string; // Address to receive protocol fees
}

export const networks: Record<NetworkName, NetworkConfig> = {
    testnet: {
        name: "Ghostnet",
        rpc: process.env.TESTNET_RPC || "https://rpc.tzkt.io/ghostnet",
        privateKey: process.env.TESTNET_PRIVATE_KEY,
    },
    mainnet: {
        name: "Mainnet",
        rpc: process.env.MAINNET_RPC || "https://rpc.tzkt.io/mainnet",
        privateKey: process.env.MAINNET_PRIVATE_KEY,
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
    metadata_uri: getRequiredEnv("METADATA_URI"),
    token_metadata_uri: getRequiredEnv("TOKEN_METADATA_URI"),
    poolType,
    ...(poolType === "mod" && {
        protocol_fee_bp: getRequiredIntEnv("PROTOCOL_FEE_BP"),
        protocol_fee_recipient: getRequiredEnv("PROTOCOL_FEE_RECIPIENT"),
    }),
};

export interface FullConfig extends NetworkConfig, Config {
    privateKey: string;
    seedAmount: {
        xtz: string;
        token: string;
    };
}

export function getConfig(networkName: NetworkName): FullConfig {
    const networkConfig = networks[networkName];

    if (!networkConfig) {
        throw new Error(`Unknown network: ${networkName}. Use 'testnet' or 'mainnet'.`);
    }

    if (!networkConfig.privateKey) {
        throw new Error(
            `Private key not configured for ${networkName}. Set ${networkName.toUpperCase()}_PRIVATE_KEY in .env file.`
        );
    }

    if (config.seedAmount.xtz === "0" || config.seedAmount.token === "0") {
        throw new Error(`Seed amounts not configured properly. Set SEED_XTZ and SEED_TOKEN in .env file.`);
    }

    if (config.tokenStandard !== "FA1.2" && config.tokenStandard !== "FA2") {
        throw new Error(`Invalid token standard: ${config.tokenStandard}. Use 'FA1.2' or 'FA2'.`);
    }

    if (config.poolType === "mod" && config.protocol_fee_bp! > 1000) {
        throw new Error("PROTOCOL_FEE_BP cannot exceed the contract cap of 1000 bp");
    }

    requireValidAddress(
        validateContractAddress(config.tokenAddress),
        "TOKEN_ADDRESS"
    );
    requireValidAddress(validateKeyHash(config.manager), "MANAGER");
    if (config.protocol_fee_recipient) {
        requireValidAddress(
            validateAddress(config.protocol_fee_recipient),
            "PROTOCOL_FEE_RECIPIENT"
        );
    }

    return {
        ...networkConfig,
        ...config,
        privateKey: networkConfig.privateKey,
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

function getRequiredIntEnv(key: string, defaultValue?: number): number {
    const value = process.env[key];
    if (!value || value.trim() === "") {
        if (defaultValue !== undefined) return defaultValue;
        throw new Error(`Required environment variable ${key} is not set`);
    }
    if (!/^(0|[1-9][0-9]*)$/.test(value.trim())) {
        throw new Error(`Environment variable ${key} must be a non-negative integer`);
    }
    const num = Number(value);
    if (!Number.isSafeInteger(num)) {
        throw new Error(`Environment variable ${key} exceeds JavaScript's safe integer range`);
    }
    return num;
}

function getRequiredNatEnv(key: string): string {
    return parseNat(getRequiredEnv(key), key);
}

function requireValidAddress(result: ValidationResult, name: string): void {
    if (result !== ValidationResult.VALID) {
        throw new Error(`${name} is not a valid Tezos address`);
    }
}
