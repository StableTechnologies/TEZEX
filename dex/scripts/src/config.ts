import dotenv from "dotenv";
import type { NetworkName } from "./types.ts";

dotenv.config();

interface NetworkConfig {
    name: string;
    rpc: string;
    privateKey?: string;
}

interface SeedAmount {
    xtz?: number;
    token?: number;
}

interface Config {
    tokenAddress: string;
    seedAmount: SeedAmount;
    manager: string;
    metadata_uri?: string;
    token_metadata_uri?: string;
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

export const config: Config = {
    tokenAddress: process.env.TOKEN_ADDRESS || "",
    seedAmount: {
        xtz: parseInt(process.env.SEED_XTZ || "0"),
        token: parseInt(process.env.SEED_TOKEN || "0"),
        // NOTE: LQT amount will be calculated using formula lqtTotal = sqrt(xtzAmount * tokenAmount)
    },
    manager: process.env.MANAGER || "",
    metadata_uri: process.env.METADATA_URI,
    token_metadata_uri: process.env.TOKEN_METADATA_URI,
};

export interface FullConfig extends NetworkConfig, Config {
    privateKey: string;
    seedAmount: {
        xtz: number;
        token: number;
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

    if (!config.tokenAddress) {
        throw new Error(`Token address not configured. Set TOKEN_ADDRESS in .env file.`);
    }

    if (config.seedAmount.xtz === 0 || config.seedAmount.token === 0) {
        throw new Error(`Seed amounts not configured properly. Set SEED_XTZ and SEED_TOKEN in .env file.`);
    }

    if (!config.metadata_uri || !config.token_metadata_uri) {
        throw new Error("Metadata is not configured. Please set METADATA_URI and TOKEN_METADATA_URI.");
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
