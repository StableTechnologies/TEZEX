import fs from "node:fs";
import path from "node:path";

import type { TokenDescriptor, TokenTokenNetwork } from "./token-token-config.js";
import type { MultisigExpectation } from "./multisig-verification.js";

export const TOKEN_TOKEN_DEPLOYMENT_STATE_VERSION = 3;

export interface TokenTokenOperationRecord {
  operation: string;
  status: "injected" | "applied";
}

export interface TokenTokenOriginationRecord
  extends TokenTokenOperationRecord {
  address?: string;
}

export interface TokenTokenDeploymentState {
  version: number;
  fingerprint: string;
  network: TokenTokenNetwork;
  rpc: string;
  chainId: string;
  sourceCommit: string;
  sourceDirty: boolean;
  compilerVersion: string;
  signerMode: "local-key" | "remote";
  artifacts: {
    pool: { path: string; sha256: string; codeSha256: string };
    lqt: { path: string; sha256: string; codeSha256: string };
  };
  deployer: string;
  config: {
    tokenA: TokenDescriptor;
    tokenB: TokenDescriptor;
    seedAmountA: string;
    seedAmountB: string;
    seedReceiver: string;
    finalManager: string;
    feeRecipient: string;
    roleThresholds: {
      manager: number | null;
      feeRecipient: number | null;
    };
    roleControls?: {
      manager: MultisigExpectation | null;
      feeRecipient: MultisigExpectation | null;
    };
    tokenOperations: {
      integrationOwner: string | null;
      incidentChannel: string | null;
    };
    poolMetadataUri: string;
    lqtContractMetadataUri: string;
    lqtTokenMetadataUri: string;
    confirmations: number;
  };
  steps: {
    pool?: TokenTokenOriginationRecord;
    lqt?: TokenTokenOriginationRecord;
    lqtLinked?: TokenTokenOperationRecord;
    initialized?: TokenTokenOperationRecord;
    managerProposed?: TokenTokenOperationRecord;
    verified?: { at: string };
    handoffVerified?: { at: string };
  };
}

export async function persistTokenTokenDeploymentState(
  file: string,
  state: TokenTokenDeploymentState,
): Promise<void> {
  const absolute = path.resolve(file);
  await fs.promises.mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.tmp`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
    mode: 0o600,
  });
  await fs.promises.rename(temporary, absolute);
  await fs.promises.chmod(absolute, 0o600);
}

export async function loadTokenTokenDeploymentState(
  file: string,
): Promise<TokenTokenDeploymentState | undefined> {
  try {
    const parsed = JSON.parse(
      await fs.promises.readFile(path.resolve(file), "utf8"),
    ) as { version?: unknown };
    if (parsed.version !== TOKEN_TOKEN_DEPLOYMENT_STATE_VERSION) {
      throw new Error(
        `Unsupported token-to-token deployment-state version ${String(parsed.version)}`,
      );
    }
    return parsed as TokenTokenDeploymentState;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

export function shareableTokenTokenDeploymentState(
  state: TokenTokenDeploymentState,
): TokenTokenDeploymentState {
  return {
    ...state,
    rpc: "",
    artifacts: {
      pool: { ...state.artifacts.pool, path: path.basename(state.artifacts.pool.path) },
      lqt: { ...state.artifacts.lqt, path: path.basename(state.artifacts.lqt.path) },
    },
  };
}
