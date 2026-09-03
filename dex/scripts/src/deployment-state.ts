import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import type { NetworkName } from "./types.js";
import type { MultisigExpectation } from "./multisig-verification.js";
import type {
    ImplementationSelector,
    TokenControlProfile,
} from "./token-control-monitor.js";

export const DEPLOYMENT_STATE_VERSION = 1;
export const DEPLOYMENT_COMPILER_VERSION = "1.11.5";

export interface DeploymentArtifactRecord {
    path: string;
    sha256: string;
    codeSha256: string;
}

export interface DeploymentOperationRecord {
    operation: string;
    status: "injected" | "applied";
}

export interface DeploymentOriginationRecord
    extends DeploymentOperationRecord {
    address?: string;
}

export interface NativePoolDeploymentState {
    version: number;
    fingerprint: string;
    network: NetworkName;
    rpc: string;
    chainId: string;
    sourceCommit: string;
    sourceDirty: boolean;
    compilerVersion: string;
    signerMode: "local-key" | "remote";
    deployer: string;
    artifacts: {
        dex: DeploymentArtifactRecord;
        lqt: DeploymentArtifactRecord;
        tokenCodeSha256: string;
    };
    config: {
        tokenAddress: string;
        tokenStandard: "FA1.2" | "FA2";
        tokenId: string;
        poolType: "base" | "mod";
        seedXtz: string;
        seedToken: string;
        finalManager: string;
        protocolFeeRecipient: string;
        roleThresholds: {
            manager: number | null;
            protocolFeeRecipient: number | null;
        };
        roleControls?: {
            manager: MultisigExpectation | null;
            protocolFeeRecipient: MultisigExpectation | null;
        };
        tokenOperations: {
            integrationOwner: string | null;
            incidentChannel: string | null;
            monitoredEventClasses: string[];
            controlProfile?: TokenControlProfile;
            implementationSha256?: string | null;
            implementationSelectors?: ImplementationSelector[];
        };
        metadataUri: string;
        tokenMetadataUri: string;
        confirmations: number;
        initialLqt: {
            total: string;
            locked: string;
            provider: string;
        };
        feeBasisPoints?: {
            liquidityProviders: number;
            protocol: number;
            total: number;
        };
    };
    steps: {
        dex?: DeploymentOriginationRecord;
        lqt?: DeploymentOriginationRecord;
        initialization?: DeploymentOperationRecord;
        verified?: { at: string };
        handoffVerified?: { at: string };
    };
}

export function sha256(value: string | Buffer): string {
    return createHash("sha256").update(value).digest("hex");
}

export function deploymentFingerprint(value: unknown): string {
    return sha256(JSON.stringify(value));
}

export function releaseManifestState(
    state: NativePoolDeploymentState
): NativePoolDeploymentState {
    let rpc = "redacted";
    try {
        rpc = new URL(state.rpc).origin;
    } catch {
        // Keep malformed or non-URL endpoints out of a shareable manifest.
    }
    return { ...state, rpc };
}

export async function persistDeploymentState(
    filename: string,
    state: NativePoolDeploymentState
): Promise<void> {
    const absolute = path.resolve(filename);
    await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
    const temporary = `${absolute}.${process.pid}.tmp`;
    await fs.promises.writeFile(
        temporary,
        `${JSON.stringify(state, null, 2)}\n`,
        { mode: 0o600 }
    );
    await fs.promises.rename(temporary, absolute);
    await fs.promises.chmod(absolute, 0o600);
}

export async function loadDeploymentState(
    filename: string
): Promise<NativePoolDeploymentState | undefined> {
    try {
        const value = JSON.parse(
            await fs.promises.readFile(path.resolve(filename), "utf8")
        ) as NativePoolDeploymentState;
        if (value.version !== DEPLOYMENT_STATE_VERSION) {
            throw new Error(
                `Unsupported deployment-state version ${String(value.version)}`
            );
        }
        return value;
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
        throw error;
    }
}

interface TzktOrigination {
    status?: string;
    level?: number;
    originatedContract?: { address?: string } | null;
}

interface TzktHead {
    level?: number;
    synced?: boolean;
}

async function fetchJson(url: string): Promise<unknown> {
    const response = await fetch(url, {
        headers: { accept: "application/json" },
    });
    if (response.status === 204) return null;
    if (!response.ok) {
        throw new Error(
            `Deployment recovery indexer request failed (${response.status})`
        );
    }
    const body = await response.text();
    return body === "" ? null : JSON.parse(body);
}

export async function recoverOrigination(
    tzktApiUrl: string,
    operation: string,
    confirmations = 1
): Promise<string> {
    const base = tzktApiUrl.replace(/\/$/, "");
    const value = await fetchJson(
        `${base}/v1/operations/originations/${encodeURIComponent(operation)}`
    );
    if (!Array.isArray(value) || value.length === 0) {
        throw new Error(
            `Origination ${operation} is not indexed yet; rerun later without deleting the deployment state.`
        );
    }
    const originations = value as TzktOrigination[];
    const failed = originations.find((item) => item.status !== "applied");
    if (failed) {
        throw new Error(
            `Origination ${operation} has non-applied status ${String(failed.status)}`
        );
    }
    const addresses = originations
        .map((item) => item.originatedContract?.address)
        .filter((address): address is string => Boolean(address));
    if (addresses.length !== 1) {
        throw new Error(
            `Origination ${operation} produced ${addresses.length} contracts; expected exactly one.`
        );
    }
    if (confirmations > 1) {
        await assertIndexedConfirmationDepth(
            base,
            operation,
            originations.map((item) => item.level),
            confirmations
        );
    }
    return addresses[0];
}

async function assertIndexedConfirmationDepth(
    base: string,
    operation: string,
    levels: Array<number | undefined>,
    confirmations: number
): Promise<void> {
    if (
        levels.length === 0
        || levels.some(
            (level) => !Number.isSafeInteger(level) || Number(level) < 1
        )
    ) {
        throw new Error(
            `Operation ${operation} has no trustworthy indexed level; rerun later.`
        );
    }
    const head = await fetchJson(`${base}/v1/head`) as TzktHead;
    if (
        !Number.isSafeInteger(head.level)
        || head.synced !== true
    ) {
        throw new Error("TzKT head is not synchronized or has no trustworthy level");
    }
    const operationLevel = Math.max(...levels.map(Number));
    const depth = Number(head.level) - operationLevel + 1;
    if (depth < confirmations) {
        throw new Error(
            `Operation ${operation} has ${depth} confirmation(s); ${confirmations} required. Rerun later.`
        );
    }
}

export async function assertOperationApplied(
    tzktApiUrl: string,
    operation: string,
    confirmations = 1
): Promise<void> {
    const base = tzktApiUrl.replace(/\/$/, "");
    const status = await fetchJson(
        `${base}/v1/operations/${encodeURIComponent(operation)}/status`
    );
    if (status === true) {
        if (confirmations > 1) {
            const operations = await fetchJson(
                `${base}/v1/operations/transactions/${encodeURIComponent(operation)}`
            );
            if (!Array.isArray(operations) || operations.length === 0) {
                throw new Error(
                    `Operation ${operation} details are not indexed yet; rerun later.`
                );
            }
            const rows = operations as Array<{ status?: unknown; level?: number }>;
            if (rows.some((row) => row.status !== "applied")) {
                throw new Error(`Operation ${operation} failed; refusing to repeat it.`);
            }
            await assertIndexedConfirmationDepth(
                base,
                operation,
                rows.map((row) => row.level),
                confirmations
            );
        }
        return;
    }
    if (status === false) {
        throw new Error(`Operation ${operation} failed; refusing to repeat it.`);
    }
    throw new Error(
        `Operation ${operation} is not indexed yet; rerun later without deleting the deployment state.`
    );
}
