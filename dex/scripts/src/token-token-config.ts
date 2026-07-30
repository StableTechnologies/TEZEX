export type TokenTokenNetwork = "testnet" | "mainnet";

export interface TokenDescriptor {
  address: string;
  tokenId: string;
}

export interface TokenTokenDeploymentConfig {
  network: TokenTokenNetwork;
  rpc: string;
  privateKey: string;
  tokenA: TokenDescriptor;
  tokenB: TokenDescriptor;
  seedAmountA: string;
  seedAmountB: string;
  seedReceiver?: string;
  finalAdmin?: string;
  feeRecipient: string;
  poolMetadataUri: string;
  lpTokenMetadataUri: string;
  lpTokenName: string;
  lpTokenSymbol: string;
  lpTokenDecimals: string;
  confirmations: number;
}

const NAT_PATTERN = /^(0|[1-9][0-9]*)$/;

function required(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set or empty`);
  }
  return value;
}

function optional(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key]?.trim();
  return value || undefined;
}

function natural(env: NodeJS.ProcessEnv, key: string, allowZero = true): string {
  const value = required(env, key);
  if (!NAT_PATTERN.test(value)) {
    throw new Error(`${key} must be an unsigned base-10 integer`);
  }
  if (!allowZero && BigInt(value) === 0n) {
    throw new Error(`${key} must be greater than zero`);
  }
  return value;
}

function positiveInteger(env: NodeJS.ProcessEnv, key: string, fallback: number): number {
  const raw = optional(env, key);
  if (!raw) return fallback;
  if (!NAT_PATTERN.test(raw) || BigInt(raw) === 0n) {
    throw new Error(`${key} must be a positive integer`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${key} is outside the safe integer range`);
  }
  return value;
}

export function parseTokenTokenConfig(
  network: TokenTokenNetwork,
  env: NodeJS.ProcessEnv = process.env,
): TokenTokenDeploymentConfig {
  const networkPrefix = network === "mainnet" ? "MAINNET" : "TESTNET";
  if (
    network === "mainnet" &&
    optional(env, "CONFIRM_MAINNET_DEPLOYMENT") !== "ORIGINATE_TOKEN_TOKEN_POOL"
  ) {
    throw new Error(
      "Set CONFIRM_MAINNET_DEPLOYMENT=ORIGINATE_TOKEN_TOKEN_POOL to enable mainnet origination",
    );
  }
  const rpc =
    optional(env, `${networkPrefix}_RPC`) ??
    (network === "mainnet"
      ? "https://rpc.tzkt.io/mainnet"
      : "https://rpc.tzkt.io/ghostnet");

  const tokenA: TokenDescriptor = {
    address: required(env, "TOKEN_A_ADDRESS"),
    tokenId: natural(env, "TOKEN_A_ID"),
  };
  const tokenB: TokenDescriptor = {
    address: required(env, "TOKEN_B_ADDRESS"),
    tokenId: natural(env, "TOKEN_B_ID"),
  };

  if (tokenA.address === tokenB.address && tokenA.tokenId === tokenB.tokenId) {
    throw new Error("TOKEN_A and TOKEN_B must identify different FA2 assets");
  }

  const seedAmountA = natural(env, "SEED_AMOUNT_A", false);
  const seedAmountB = natural(env, "SEED_AMOUNT_B", false);
  if (BigInt(seedAmountA) <= 1000n || BigInt(seedAmountB) <= 1000n) {
    throw new Error("Each seed amount must exceed the 1,000-unit minimum liquidity lock");
  }

  return {
    network,
    rpc,
    privateKey: required(env, `${networkPrefix}_PRIVATE_KEY`),
    tokenA,
    tokenB,
    seedAmountA,
    seedAmountB,
    seedReceiver: optional(env, "SEED_RECEIVER"),
    finalAdmin: optional(env, "FINAL_ADMIN"),
    feeRecipient: required(env, "PROTOCOL_FEE_RECIPIENT"),
    poolMetadataUri: required(env, "TOKEN_TOKEN_POOL_METADATA_URI"),
    lpTokenMetadataUri: required(env, "LP_TOKEN_METADATA_URI"),
    lpTokenName: optional(env, "LP_TOKEN_NAME") ?? "Token Pair Liquidity",
    lpTokenSymbol: optional(env, "LP_TOKEN_SYMBOL") ?? "TPLP",
    lpTokenDecimals: natural(env, "LP_TOKEN_DECIMALS"),
    confirmations: positiveInteger(env, "CONFIRMATIONS", 2),
  };
}
