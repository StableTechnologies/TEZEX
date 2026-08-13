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
    paused: false,
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
