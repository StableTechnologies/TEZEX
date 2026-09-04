import { MichelsonMap } from "@taquito/michelson-encoder";

import type {
  TokenDescriptor,
  TokenTokenDeploymentConfig,
} from "./token-token-config.js";

function bytes(value: string): string {
  return Buffer.from(value, "utf8").toString("hex");
}

export function encodeTokenDescriptor(token: TokenDescriptor): Record<string, unknown> {
  return token.standard === "FA2"
    ? { fa2: { token: token.address, id: token.tokenId } }
    : { fa12: token.address };
}

type TokenIdentity = Pick<TokenDescriptor, "standard" | "address" | "tokenId">;

function decodeTokenDescriptor(value: unknown, label: string): TokenIdentity {
  if (typeof value !== "object" || value === null) {
    throw new Error(`${label} is not a token descriptor`);
  }
  const candidate = value as { fa12?: unknown; fa2?: unknown };
  if (candidate.fa12 !== undefined) {
    return {
      standard: "FA1.2",
      address: String(candidate.fa12),
      tokenId: "0",
    };
  }
  if (typeof candidate.fa2 === "object" && candidate.fa2 !== null) {
    const fa2 = candidate.fa2 as { token?: unknown; id?: unknown };
    if (fa2.token === undefined || fa2.id === undefined) {
      throw new Error(`${label} FA2 descriptor is incomplete`);
    }
    return {
      standard: "FA2",
      address: String(fa2.token),
      tokenId: String(fa2.id),
    };
  }
  throw new Error(`${label} has an unknown token descriptor variant`);
}

function tokenIdentity(value: TokenIdentity): string {
  return `${value.standard}:${value.address}:${value.tokenId}`;
}

export function assertPoolIdentityStorage(
  storage: Record<string, unknown>,
  config: Pick<TokenTokenDeploymentConfig, "tokenA" | "tokenB" | "feeRecipient">,
): void {
  const actualTokenA = decodeTokenDescriptor(storage.token_a, "token_a");
  const actualTokenB = decodeTokenDescriptor(storage.token_b, "token_b");
  if (tokenIdentity(actualTokenA) !== tokenIdentity(config.tokenA)) {
    throw new Error("Pool token_a does not match the deployment configuration");
  }
  if (tokenIdentity(actualTokenB) !== tokenIdentity(config.tokenB)) {
    throw new Error("Pool token_b does not match the deployment configuration");
  }
  if (String(storage.protocol_fee_recipient) !== config.feeRecipient) {
    throw new Error(
      "Pool protocol_fee_recipient does not match the deployment configuration",
    );
  }
  if (storage.pending_fee_recipient !== null && storage.pending_fee_recipient !== undefined) {
    throw new Error("Pool pending_fee_recipient is unexpectedly set");
  }
}

export function buildTokenTokenInitialStorage(
  config: TokenTokenDeploymentConfig,
  deployer: string,
): Record<string, unknown> {
  const metadata = new MichelsonMap<string, string>();
  metadata.set("", bytes(config.poolMetadataUri));
  return {
    token_a: encodeTokenDescriptor(config.tokenA),
    token_b: encodeTokenDescriptor(config.tokenB),
    reserve_a: "0",
    reserve_b: "0",
    protocol_fee_a: "0",
    protocol_fee_b: "0",
    lqt_total: "0",
    lqt_address: null,
    active: false,
    paused: true,
    entered: false,
    manager: deployer,
    pending_manager: null,
    protocol_fee_recipient: config.feeRecipient,
    pending_fee_recipient: null,
    metadata,
  };
}

export function buildEmptyLqtStorage(
  config: TokenTokenDeploymentConfig,
  poolAddress: string,
): Record<string, unknown> {
  const metadata = new MichelsonMap<string, string>();
  metadata.set("", bytes(config.lqtContractMetadataUri));
  const tokenInfo = new MichelsonMap<string, string>();
  tokenInfo.set("", bytes(config.lqtTokenMetadataUri));
  const tokenMetadata = new MichelsonMap<number, Record<string, unknown>>();
  tokenMetadata.set(0, { token_id: "0", token_info: tokenInfo });
  return {
    tokens: new MichelsonMap(),
    allowances: new MichelsonMap(),
    admin: poolAddress,
    total_supply: "0",
    metadata,
    token_metadata: tokenMetadata,
  };
}
