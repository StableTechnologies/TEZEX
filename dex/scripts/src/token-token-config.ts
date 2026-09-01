import path from "node:path";

import {
  ValidationResult,
  validateAddress,
  validateContractAddress,
  validateKeyHash,
} from "@taquito/utils";

import { calculateInitialLqt } from "./token-token-math.js";
import {
  parseMultisigExpectation,
  type MultisigExpectation,
} from "./multisig-verification.js";
import {
  parseImplementationSelectors,
  parseTokenControlProfile,
  type ImplementationSelector,
  type TokenControlProfile,
} from "./token-control-monitor.js";

export type TokenTokenNetwork = "previewnet" | "testnet" | "mainnet";
export type TokenStandard = "FA1.2" | "FA2";

// The Tezos Mainnet chain ID is permanent and is never supplied by release
// operators. This prevents a mislabeled RPC from weakening the network gate.
export const TEZOS_MAINNET_CHAIN_ID = "NetXdQprcVkpaWU";

export interface TokenDescriptor {
  standard: TokenStandard;
  address: string;
  tokenId: string;
  codeSha256: string;
  controlProfile: TokenControlProfile;
  implementationSha256?: string;
  implementationSelectors: ImplementationSelector[];
}

export interface TokenTokenDeploymentConfig {
  network: TokenTokenNetwork;
  rpc: string;
  expectedChainId: string;
  tzktApiUrl: string;
  privateKey?: string;
  remoteSignerUrl?: string;
  remoteSignerPkh?: string;
  tokenA: TokenDescriptor;
  tokenB: TokenDescriptor;
  seedAmountA: string;
  seedAmountB: string;
  seedReceiver?: string;
  finalManager: string;
  feeRecipient: string;
  poolMetadataUri: string;
  lqtContractMetadataUri: string;
  lqtTokenMetadataUri: string;
  artifactSha256: string;
  lqtArtifactSha256?: string;
  managerThreshold?: number;
  feeRecipientThreshold?: number;
  managerMultisig?: MultisigExpectation;
  feeRecipientMultisig?: MultisigExpectation;
  tokenIntegrationOwner?: string;
  tokenIncidentChannel?: string;
  confirmations: number;
  expectedSourceCommit?: string;
  stateFile: string;
}

const NAT_PATTERN = /^(0|[1-9][0-9]*)$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new Error(`Required environment variable ${key} is not set`);
  return value;
}

function optional(env: NodeJS.ProcessEnv, key: string): string | undefined {
  return env[key]?.trim() || undefined;
}

function natural(env: NodeJS.ProcessEnv, key: string, fallback?: string): string {
  const value = optional(env, key) ?? fallback;
  if (value === undefined || !NAT_PATTERN.test(value)) {
    throw new Error(`${key} must be an unsigned base-10 integer`);
  }
  return BigInt(value).toString();
}

function positiveInteger(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const value = optional(env, key);
  if (!value) return fallback;
  if (!NAT_PATTERN.test(value) || BigInt(value) === 0n) {
    throw new Error(`${key} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${key} is too large`);
  return parsed;
}

function optionalPositiveInteger(
  env: NodeJS.ProcessEnv,
  key: string,
): number | undefined {
  const value = optional(env, key);
  if (!value) return undefined;
  if (!NAT_PATTERN.test(value) || BigInt(value) === 0n) {
    throw new Error(`${key} must be a positive integer`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new Error(`${key} is too large`);
  return parsed;
}

function optionalSha256(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = optional(env, key)?.toLowerCase();
  if (value && !SHA256_PATTERN.test(value)) {
    throw new Error(`${key} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function tokenStandard(env: NodeJS.ProcessEnv, key: string): TokenStandard {
  const value = required(env, key).toUpperCase();
  if (value === "FA1.2" || value === "FA12") return "FA1.2";
  if (value === "FA2") return "FA2";
  throw new Error(`${key} must be FA1.2 or FA2`);
}

function tokenDescriptor(env: NodeJS.ProcessEnv, label: "A" | "B"): TokenDescriptor {
  const standard = tokenStandard(env, `TOKEN_${label}_STANDARD`);
  const codeSha256 = required(env, `TOKEN_${label}_CODE_SHA256`).toLowerCase();
  if (!SHA256_PATTERN.test(codeSha256)) {
    throw new Error(`TOKEN_${label}_CODE_SHA256 must be a lowercase SHA-256 digest`);
  }
  const address = required(env, `TOKEN_${label}_ADDRESS`);
  if (validateContractAddress(address) !== ValidationResult.VALID) {
    throw new Error(`TOKEN_${label}_ADDRESS must be a valid originated contract address`);
  }
  const controlProfile = parseTokenControlProfile(
    optional(env, `TOKEN_${label}_CONTROL_PROFILE`),
    `TOKEN_${label}_CONTROL_PROFILE`,
  );
  const implementationSha256 = optionalSha256(
    env,
    `TOKEN_${label}_IMPLEMENTATION_SHA256`,
  );
  const selectorsValue = optional(env, `TOKEN_${label}_IMPLEMENTATION_SELECTORS`);
  const implementationSelectors = selectorsValue
    ? parseImplementationSelectors(
      selectorsValue,
      `TOKEN_${label}_IMPLEMENTATION_SELECTORS`,
    )
    : [];
  if (
    controlProfile !== "generic"
    && (!implementationSha256 || implementationSelectors.length === 0)
  ) {
    throw new Error(
      `Exact TOKEN_${label}_CONTROL_PROFILE requires implementation SHA-256 and selectors`,
    );
  }
  return {
    standard,
    address,
    tokenId:
      standard === "FA2"
        ? natural(env, `TOKEN_${label}_ID`)
        : "0",
    codeSha256,
    controlProfile,
    implementationSha256,
    implementationSelectors,
  };
}

function assertIpfsUri(value: string, key: string): string {
  if (!/^ipfs:\/\/[a-zA-Z0-9]+$/.test(value)) {
    throw new Error(`${key} must be an immutable ipfs:// CID URI`);
  }
  return value;
}

function canonicalAsset(asset: TokenDescriptor): string {
  return asset.standard === "FA2"
    ? `${asset.address}:fa2:${asset.tokenId}`
    : `${asset.address}:fa12`;
}

function address(env: NodeJS.ProcessEnv, key: string, requiredValue = true): string | undefined {
  const value = requiredValue ? required(env, key) : optional(env, key);
  if (value && validateAddress(value) !== ValidationResult.VALID) {
    throw new Error(`${key} must be a valid Tezos address`);
  }
  return value;
}

export function assertTokenTokenDeploymentChain(
  network: TokenTokenNetwork,
  expectedChainId: string,
  actualChainId: string = expectedChainId,
): void {
  if (network === "mainnet") {
    if (expectedChainId !== TEZOS_MAINNET_CHAIN_ID) {
      throw new Error("Mainnet deployment requires the permanent Tezos Mainnet chain ID");
    }
  } else if (
    expectedChainId === TEZOS_MAINNET_CHAIN_ID ||
    actualChainId === TEZOS_MAINNET_CHAIN_ID
  ) {
    throw new Error("Token-to-token test deployment refuses Tezos Mainnet");
  }
  if (actualChainId !== expectedChainId) {
    throw new Error(
      `RPC chain ID mismatch: expected ${expectedChainId}, received ${actualChainId}`,
    );
  }
}

export function parseTokenTokenConfig(
  network: TokenTokenNetwork,
  env: NodeJS.ProcessEnv = process.env,
): TokenTokenDeploymentConfig {
  if (network !== "previewnet" && network !== "testnet" && network !== "mainnet") {
    throw new Error("Unknown token-to-token deployment network");
  }
  const prefix =
    network === "previewnet"
      ? "PREVIEWNET"
      : network === "testnet"
        ? "TESTNET"
        : "MAINNET";
  const expectedChainId =
    network === "mainnet"
      ? TEZOS_MAINNET_CHAIN_ID
      : required(env, `${prefix}_CHAIN_ID`);
  assertTokenTokenDeploymentChain(network, expectedChainId);
  const tokenA = tokenDescriptor(env, "A");
  const tokenB = tokenDescriptor(env, "B");
  if (canonicalAsset(tokenA) === canonicalAsset(tokenB)) {
    throw new Error("TOKEN_A and TOKEN_B must describe distinct assets");
  }
  if (
    tokenA.address === tokenB.address &&
    (tokenA.standard !== "FA2" || tokenB.standard !== "FA2")
  ) {
    throw new Error(
      "One contract address cannot be described under incompatible token standards",
    );
  }

  const seedAmountA = natural(env, "SEED_AMOUNT_A");
  const seedAmountB = natural(env, "SEED_AMOUNT_B");
  if (BigInt(seedAmountA) === 0n || BigInt(seedAmountB) === 0n) {
    throw new Error("Both seed amounts must be greater than zero");
  }
  if (BigInt(calculateInitialLqt(seedAmountA, seedAmountB)) <= 1000n) {
    throw new Error("The geometric-mean LQT supply must exceed the 1,000-unit lock");
  }

  const artifactSha256 = required(env, "TOKEN_TOKEN_ARTIFACT_SHA256").toLowerCase();
  if (!SHA256_PATTERN.test(artifactSha256)) {
    throw new Error("TOKEN_TOKEN_ARTIFACT_SHA256 must be a lowercase SHA-256 digest");
  }

  const lqtArtifactSha256 = optionalSha256(
    env,
    "TOKEN_TOKEN_LQT_ARTIFACT_SHA256",
  );
  const privateKey = optional(env, `${prefix}_PRIVATE_KEY`);
  const remoteSignerUrl = optional(env, `${prefix}_REMOTE_SIGNER_URL`);
  const remoteSignerPkh = optional(env, `${prefix}_REMOTE_SIGNER_PKH`);
  if (Boolean(remoteSignerUrl) !== Boolean(remoteSignerPkh)) {
    throw new Error(
      `${prefix}_REMOTE_SIGNER_URL and ${prefix}_REMOTE_SIGNER_PKH must be set together`,
    );
  }
  if (!privateKey && !remoteSignerUrl) {
    throw new Error(
      `Set ${prefix}_PRIVATE_KEY or the matching remote-signer variables`,
    );
  }
  if (privateKey && remoteSignerUrl) {
    throw new Error("Configure exactly one token-to-token deployment signer mode");
  }
  if (
    remoteSignerPkh &&
    validateKeyHash(remoteSignerPkh) !== ValidationResult.VALID
  ) {
    throw new Error(`${prefix}_REMOTE_SIGNER_PKH must be a valid implicit address`);
  }

  const seedReceiver = address(env, "SEED_RECEIVER", false);
  const finalManager = address(env, "FINAL_MANAGER")!;
  const feeRecipient = address(env, "PROTOCOL_FEE_RECIPIENT")!;
  const managerThreshold = optionalPositiveInteger(
    env,
    "MANAGER_MULTISIG_THRESHOLD",
  );
  const feeRecipientThreshold = optionalPositiveInteger(
    env,
    "PROTOCOL_FEE_RECIPIENT_MULTISIG_THRESHOLD",
  );
  const tokenIntegrationOwner = optional(env, "TOKEN_INTEGRATION_OWNER");
  const tokenIncidentChannel = optional(env, "TOKEN_INCIDENT_CHANNEL");
  const expectedSourceCommit = optional(env, "EXPECTED_SOURCE_COMMIT")
    ?.toLowerCase();
  if (expectedSourceCommit && !/^[0-9a-f]{40}$/.test(expectedSourceCommit)) {
    throw new Error("EXPECTED_SOURCE_COMMIT must be a 40-character lowercase Git commit");
  }
  const confirmations = positiveInteger(env, "CONFIRMATIONS", 2);
  const managerMultisig = parseMultisigExpectation(
    env,
    "MANAGER",
    managerThreshold,
    network === "mainnet",
  );
  const feeRecipientMultisig = parseMultisigExpectation(
    env,
    "PROTOCOL_FEE_RECIPIENT",
    feeRecipientThreshold,
    network === "mainnet",
  );

  if (network === "mainnet") {
    if (!lqtArtifactSha256) {
      throw new Error("Mainnet requires TOKEN_TOKEN_LQT_ARTIFACT_SHA256");
    }
    if (!seedReceiver) {
      throw new Error("Mainnet requires an explicit SEED_RECEIVER");
    }
    if (
      validateContractAddress(finalManager) !== ValidationResult.VALID ||
      validateContractAddress(feeRecipient) !== ValidationResult.VALID ||
      managerThreshold === undefined ||
      feeRecipientThreshold === undefined
    ) {
      throw new Error(
        "Mainnet requires originated multisig role addresses and documented thresholds",
      );
    }
    if (!tokenIntegrationOwner || !tokenIncidentChannel) {
      throw new Error(
        "Mainnet requires TOKEN_INTEGRATION_OWNER and TOKEN_INCIDENT_CHANNEL",
      );
    }
    if (!expectedSourceCommit) {
      throw new Error("Mainnet requires EXPECTED_SOURCE_COMMIT");
    }
    if (confirmations < 2) {
      throw new Error("Mainnet requires at least 2 confirmations");
    }
  }

  return {
    network,
    rpc: required(env, `${prefix}_RPC`),
    expectedChainId,
    tzktApiUrl: required(env, `${prefix}_TZKT_API`),
    privateKey,
    remoteSignerUrl,
    remoteSignerPkh,
    tokenA,
    tokenB,
    seedAmountA,
    seedAmountB,
    seedReceiver,
    finalManager,
    feeRecipient,
    poolMetadataUri: assertIpfsUri(
      required(env, "TOKEN_TOKEN_POOL_METADATA_URI"),
      "TOKEN_TOKEN_POOL_METADATA_URI",
    ),
    lqtContractMetadataUri: assertIpfsUri(
      required(env, "TOKEN_TOKEN_LQT_CONTRACT_METADATA_URI"),
      "TOKEN_TOKEN_LQT_CONTRACT_METADATA_URI",
    ),
    lqtTokenMetadataUri: assertIpfsUri(
      required(env, "TOKEN_TOKEN_LQT_TOKEN_METADATA_URI"),
      "TOKEN_TOKEN_LQT_TOKEN_METADATA_URI",
    ),
    artifactSha256,
    lqtArtifactSha256,
    managerThreshold,
    feeRecipientThreshold,
    managerMultisig,
    feeRecipientMultisig,
    tokenIntegrationOwner,
    tokenIncidentChannel,
    confirmations,
    expectedSourceCommit,
    stateFile:
      optional(env, "TOKEN_TOKEN_DEPLOYMENT_STATE") ??
      path.join("deployments", "token-token", `${network}-in-progress.json`),
  };
}
