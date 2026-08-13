import path from "node:path";

import {
  ValidationResult,
  validateAddress,
  validateContractAddress,
} from "@taquito/utils";

import { calculateInitialLqt } from "./token-token-math.js";

export type TokenTokenNetwork = "previewnet" | "testnet";
export type TokenStandard = "FA1.2" | "FA2";

export interface TokenDescriptor {
  standard: TokenStandard;
  address: string;
  tokenId: string;
  codeSha256: string;
}

export interface TokenTokenDeploymentConfig {
  network: TokenTokenNetwork;
  rpc: string;
  expectedChainId: string;
  tzktApiUrl?: string;
  privateKey: string;
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
  confirmations: number;
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
  return {
    standard,
    address,
    tokenId:
      standard === "FA2"
        ? natural(env, `TOKEN_${label}_ID`)
        : "0",
    codeSha256,
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

export function parseTokenTokenConfig(
  network: TokenTokenNetwork,
  env: NodeJS.ProcessEnv = process.env,
): TokenTokenDeploymentConfig {
  if (network !== "previewnet" && network !== "testnet") {
    throw new Error("Token-to-token deployment is limited to Previewnet/testnet");
  }
  const prefix = network === "previewnet" ? "PREVIEWNET" : "TESTNET";
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

  return {
    network,
    rpc: required(env, `${prefix}_RPC`),
    expectedChainId: required(env, `${prefix}_CHAIN_ID`),
    tzktApiUrl: optional(env, `${prefix}_TZKT_API`),
    privateKey: required(env, `${prefix}_PRIVATE_KEY`),
    tokenA,
    tokenB,
    seedAmountA,
    seedAmountB,
    seedReceiver: address(env, "SEED_RECEIVER", false),
    finalManager: address(env, "FINAL_MANAGER")!,
    feeRecipient: address(env, "PROTOCOL_FEE_RECIPIENT")!,
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
    confirmations: positiveInteger(env, "CONFIRMATIONS", 2),
    stateFile:
      optional(env, "TOKEN_TOKEN_DEPLOYMENT_STATE") ??
      path.join("deployments", "token-token", `${network}-in-progress.json`),
  };
}
