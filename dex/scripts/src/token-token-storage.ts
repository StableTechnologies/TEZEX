import { MichelsonMap } from "@taquito/michelson-encoder";
import type { TokenTokenDeploymentConfig } from "./token-token-config.js";

function bytes(value: string): string {
  return Buffer.from(value, "utf8").toString("hex");
}

export function buildTokenTokenInitialStorage(
  config: TokenTokenDeploymentConfig,
  deployer: string,
): Record<string, unknown> {
  const metadata = new MichelsonMap<string, string>();
  metadata.set("", bytes(config.poolMetadataUri));

  const tokenInfo = new MichelsonMap<string, string>();
  tokenInfo.set("", bytes(config.lpTokenMetadataUri));
  tokenInfo.set("name", bytes(config.lpTokenName));
  tokenInfo.set("symbol", bytes(config.lpTokenSymbol));
  tokenInfo.set("decimals", bytes(config.lpTokenDecimals));

  const tokenMetadata = new MichelsonMap<number, Record<string, unknown>>();
  tokenMetadata.set(0, { token_id: "0", token_info: tokenInfo });

  return {
    token_a: {
      token_contract: config.tokenA.address,
      token_id: config.tokenA.tokenId,
    },
    token_b: {
      token_contract: config.tokenB.address,
      token_id: config.tokenB.tokenId,
    },
    reserve_a: "0",
    reserve_b: "0",
    protocol_fees_a: "0",
    protocol_fees_b: "0",
    total_supply: "0",
    ledger: new MichelsonMap(),
    operators: new MichelsonMap(),
    metadata,
    token_metadata: tokenMetadata,
    admin: deployer,
    pending_admin: null,
    fee_recipient: config.feeRecipient,
    paused: false,
    pending: null,
  };
}
