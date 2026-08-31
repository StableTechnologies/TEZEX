import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import {
  TezosToolkit,
  type ContractAbstraction,
  type ContractProvider,
  type OperationBatch,
} from "@taquito/taquito";
import dotenv from "dotenv";

import {
  assertTokenTokenDeploymentChain,
  parseTokenTokenConfig,
  type TokenDescriptor,
  type TokenTokenDeploymentConfig,
  type TokenTokenNetwork,
} from "./token-token-config.js";
import { createDeploymentSigner } from "./deployment-signer.js";
import {
  assertOperationApplied,
  recoverOrigination,
} from "./deployment-state.js";
import {
  loadTokenTokenDeploymentState,
  persistTokenTokenDeploymentState,
  TOKEN_TOKEN_DEPLOYMENT_STATE_VERSION,
  type TokenTokenDeploymentState,
} from "./token-token-deployment-state.js";
import { calculateInitialLqt } from "./token-token-math.js";
import { scriptCodeSha256 } from "./token-code-hash.js";
import {
  assertPoolIdentityStorage,
  buildEmptyLqtStorage,
  buildTokenTokenInitialStorage,
} from "./token-token-storage.js";
import { getTokenBalance } from "./util.js";

dotenv.config();

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const compilerVersion = "1.11.5";
const minimumLqt = 1_000n;
const minimumDeploymentBalance = 5_000_000n;

type Contract = ContractAbstraction<ContractProvider>;

function parseNetwork(): TokenTokenNetwork {
  const arg = process.argv.slice(2).find((value) => value.startsWith("--network="));
  const network = arg?.slice("--network=".length) ?? "previewnet";
  if (network !== "previewnet" && network !== "testnet" && network !== "mainnet") {
    throw new Error(
      `Invalid token-to-token deployment network ${network}`,
    );
  }
  return network;
}

function artifactPath(filename: string): string {
  return path.resolve(scriptDirectory, "..", "..", "compiled_contracts", filename);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function getStorageType(parsedScript: unknown): unknown {
  if (!Array.isArray(parsedScript)) {
    throw new Error("Compiled contract did not parse as a Michelson script");
  }
  const storage = parsedScript.find(
    (section) =>
      typeof section === "object" &&
      section !== null &&
      "prim" in section &&
      section.prim === "storage",
  ) as { args?: unknown[] } | undefined;
  if (!storage?.args?.[0]) throw new Error("Compiled contract has no storage type");
  return storage.args[0];
}

async function readArtifact(filename: string): Promise<{
  absolutePath: string;
  source: string;
  digest: string;
  script: NonNullable<ReturnType<Parser["parseScript"]>>;
}> {
  const absolutePath = artifactPath(filename);
  const source = await fs.promises.readFile(absolutePath, "utf8");
  const script = new Parser().parseScript(source);
  if (!script) throw new Error(`Could not parse ${absolutePath}`);
  return { absolutePath, source, digest: sha256(source), script };
}

function sourceCommit(): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: path.resolve(scriptDirectory, "..", "..", ".."),
    encoding: "utf8",
  }).trim();
}

function canonicalConfig(
  config: TokenTokenDeploymentConfig,
  deployer: string,
  seedReceiver: string,
): TokenTokenDeploymentState["config"] {
  return {
    tokenA: config.tokenA,
    tokenB: config.tokenB,
    seedAmountA: config.seedAmountA,
    seedAmountB: config.seedAmountB,
    seedReceiver,
    finalManager: config.finalManager,
    feeRecipient: config.feeRecipient,
    roleThresholds: {
      manager: config.managerThreshold ?? null,
      feeRecipient: config.feeRecipientThreshold ?? null,
    },
    tokenOperations: {
      integrationOwner: config.tokenIntegrationOwner ?? null,
      incidentChannel: config.tokenIncidentChannel ?? null,
    },
    poolMetadataUri: config.poolMetadataUri,
    lqtContractMetadataUri: config.lqtContractMetadataUri,
    lqtTokenMetadataUri: config.lqtTokenMetadataUri,
  };
}

function fingerprint(value: unknown): string {
  return sha256(JSON.stringify(value));
}

function sourceIsClean(): boolean {
  return execFileSync("git", ["status", "--porcelain"], {
    cwd: path.resolve(scriptDirectory, "..", "..", ".."),
    encoding: "utf8",
  }).trim().length === 0;
}

async function contractCodeHash(tezos: TezosToolkit, address: string): Promise<string> {
  const script = await tezos.rpc.getScript(address);
  if (!script.code) throw new Error(`Contract ${address} has no script code`);
  return scriptCodeSha256(script.code);
}

async function resumeOrigination(
  key: "pool" | "lqt",
  tezos: TezosToolkit,
  config: TokenTokenDeploymentConfig,
  state: TokenTokenDeploymentState,
  expectedCodeSha256: string,
): Promise<string | undefined> {
  const record = state.steps[key];
  if (!record) return undefined;
  if (record.status === "injected") {
    record.address = await recoverOrigination(
      config.tzktApiUrl,
      record.operation,
    );
    record.status = "applied";
    await persistTokenTokenDeploymentState(config.stateFile, state);
  }
  if (!record.address) {
    throw new Error(`${key} origination is applied but has no contract address`);
  }
  const actualCodeSha256 = await contractCodeHash(tezos, record.address);
  if (actualCodeSha256 !== expectedCodeSha256) {
    throw new Error(`${key} origination code does not match the reviewed artifact`);
  }
  return record.address;
}

async function resumeOperation(
  key: "lqtLinked" | "initialized" | "managerProposed",
  config: TokenTokenDeploymentConfig,
  state: TokenTokenDeploymentState,
): Promise<boolean> {
  const record = state.steps[key];
  if (!record) return false;
  if (record.status === "injected") {
    await assertOperationApplied(config.tzktApiUrl, record.operation);
    record.status = "applied";
    await persistTokenTokenDeploymentState(config.stateFile, state);
  }
  return true;
}

async function assertTokenContract(
  tezos: TezosToolkit,
  label: string,
  token: TokenDescriptor,
): Promise<Contract> {
  const digest = await contractCodeHash(tezos, token.address);
  if (digest !== token.codeSha256) {
    throw new Error(
      `${label} code hash mismatch: expected ${token.codeSha256}, received ${digest}`,
    );
  }
  const contract = await tezos.contract.at(token.address);
  const entrypoints = contract.entrypoints.entrypoints;
  const required =
    token.standard === "FA2"
      ? ["transfer", "balance_of", "update_operators"]
      : ["transfer", "approve"];
  for (const entrypoint of required) {
    if (!(entrypoint in entrypoints)) {
      throw new Error(`${label} is missing required ${token.standard} %${entrypoint}`);
    }
  }
  return contract;
}

function addAuthorization(
  batch: OperationBatch,
  contract: Contract,
  token: TokenDescriptor,
  owner: string,
  pool: string,
  amount: string,
): void {
  if (token.standard === "FA2") {
    batch.withContractCall(
      contract.methodsObject.update_operators([
        { add_operator: { owner, operator: pool, token_id: token.tokenId } },
      ]),
    );
    return;
  }
  batch.withContractCall(contract.methodsObject.approve({ spender: pool, value: "0" }));
  batch.withContractCall(contract.methodsObject.approve({ spender: pool, value: amount }));
}

function addAuthorizationCleanup(
  batch: OperationBatch,
  contract: Contract,
  token: TokenDescriptor,
  owner: string,
  pool: string,
): void {
  if (token.standard === "FA2") {
    batch.withContractCall(
      contract.methodsObject.update_operators([
        { remove_operator: { owner, operator: pool, token_id: token.tokenId } },
      ]),
    );
    return;
  }
  batch.withContractCall(contract.methodsObject.approve({ spender: pool, value: "0" }));
}

function asNat(value: unknown, label: string): bigint {
  const candidate = value as { toString?: () => string };
  const text = candidate?.toString?.() ?? String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(text)) throw new Error(`${label} is not a nat`);
  return BigInt(text);
}

function asOptionAddress(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  const candidate = value as { Some?: unknown; some?: unknown };
  return String(candidate.Some ?? candidate.some ?? value);
}

async function verifyDeployment(
  tezos: TezosToolkit,
  config: TokenTokenDeploymentConfig,
  state: TokenTokenDeploymentState,
  expectedCode: { pool: string; lqt: string },
): Promise<void> {
  const poolAddress = state.steps.pool?.address;
  const lqtAddress = state.steps.lqt?.address;
  if (
    !poolAddress ||
    state.steps.pool?.status !== "applied" ||
    !lqtAddress ||
    state.steps.lqt?.status !== "applied" ||
    state.steps.initialized?.status !== "applied"
  ) {
    throw new Error("Cannot verify an incomplete deployment");
  }
  const [poolCode, lqtCode] = await Promise.all([
    contractCodeHash(tezos, poolAddress),
    contractCodeHash(tezos, lqtAddress),
  ]);
  if (poolCode !== expectedCode.pool || lqtCode !== expectedCode.lqt) {
    throw new Error("Originated pool or LQT code does not match the reviewed artifact");
  }
  const expectedLqt = BigInt(calculateInitialLqt(config.seedAmountA, config.seedAmountB));
  const pool = await tezos.contract.at(poolAddress);
  const storage = (await pool.storage()) as Record<string, unknown>;
  assertPoolIdentityStorage(storage, config);
  if (storage.active !== true || storage.paused !== true || storage.entered !== false) {
    throw new Error("Pool is not active, idle, and paused for the manager handoff");
  }
  if (asNat(storage.reserve_a, "reserve_a") !== BigInt(config.seedAmountA)) {
    throw new Error("Pool reserve_a does not match the configured seed");
  }
  if (asNat(storage.reserve_b, "reserve_b") !== BigInt(config.seedAmountB)) {
    throw new Error("Pool reserve_b does not match the configured seed");
  }
  if (
    asNat(storage.protocol_fee_a, "protocol_fee_a") !== 0n ||
    asNat(storage.protocol_fee_b, "protocol_fee_b") !== 0n
  ) {
    throw new Error("Protocol fee accumulators are nonzero immediately after initialization");
  }
  if (asNat(storage.lqt_total, "lqt_total") !== expectedLqt) {
    throw new Error("Pool LQT total does not match the integer geometric mean");
  }
  if (asOptionAddress(storage.lqt_address) !== lqtAddress) {
    throw new Error("Pool is linked to an unexpected LQT contract");
  }
  if (String(storage.manager) !== state.deployer) {
    throw new Error("Temporary deployer is no longer pool manager before handoff acceptance");
  }
  const metadata = storage.metadata as { get: (key: string) => Promise<unknown> };
  const poolMetadata = String((await metadata.get("")) ?? "");
  if (poolMetadata !== Buffer.from(config.poolMetadataUri, "utf8").toString("hex")) {
    throw new Error("Pool metadata URI does not match the deployment configuration");
  }
  const expectedPending =
    config.finalManager === state.deployer ? null : config.finalManager;
  if (asOptionAddress(storage.pending_manager) !== expectedPending) {
    throw new Error("Pending manager does not match FINAL_MANAGER");
  }

  const lqt = await tezos.contract.at(lqtAddress);
  const lqtStorage = (await lqt.storage()) as Record<string, unknown>;
  if (String(lqtStorage.admin) !== poolAddress) {
    throw new Error("Pool is not the LQT administrator");
  }
  if (asNat(lqtStorage.total_supply, "LQT total_supply") !== expectedLqt) {
    throw new Error("LQT total supply does not match pool accounting");
  }
  const lqtMetadata = lqtStorage.metadata as {
    get: (key: string) => Promise<unknown>;
  };
  if (
    String((await lqtMetadata.get("")) ?? "") !==
    Buffer.from(config.lqtContractMetadataUri, "utf8").toString("hex")
  ) {
    throw new Error("LQT contract metadata URI does not match configuration");
  }
  const tokenMetadataMap = lqtStorage.token_metadata as {
    get: (key: string) => Promise<unknown>;
  };
  const tokenMetadata = (await tokenMetadataMap.get("0")) as
    | { token_info?: { get: (key: string) => unknown } }
    | undefined;
  const tokenUri = tokenMetadata?.token_info?.get("");
  if (
    String(tokenUri ?? "") !==
    Buffer.from(config.lqtTokenMetadataUri, "utf8").toString("hex")
  ) {
    throw new Error("LQT token metadata URI does not match configuration");
  }
  const tokens = lqtStorage.tokens as { get: (key: string) => Promise<unknown> };
  const locked = asNat((await tokens.get(poolAddress)) ?? 0, "locked LQT");
  const provider = asNat(
    (await tokens.get(state.config.seedReceiver)) ?? 0,
    "provider LQT",
  );
  if (locked !== minimumLqt || provider !== expectedLqt - minimumLqt) {
    throw new Error("LQT minimum lock or provider balance is incorrect");
  }

  const [balanceA, balanceB] = await Promise.all([
    getTokenBalance(
      tezos,
      config.tokenA.address,
      poolAddress,
      config.tokenA.standard,
      config.tokenA.tokenId,
      config.tzktApiUrl,
    ),
    getTokenBalance(
      tezos,
      config.tokenB.address,
      poolAddress,
      config.tokenB.standard,
      config.tokenB.tokenId,
      config.tzktApiUrl,
    ),
  ]);
  if (balanceA < BigInt(config.seedAmountA) || balanceB < BigInt(config.seedAmountB)) {
    throw new Error("Pool token balances do not cover its recorded reserves");
  }
}

async function main(): Promise<void> {
  const config = parseTokenTokenConfig(parseNetwork());
  const [poolArtifact, lqtArtifact] = await Promise.all([
    readArtifact("token_token_pool.tz"),
    readArtifact("lqt.tz"),
  ]);
  if (poolArtifact.digest !== config.artifactSha256) {
    throw new Error(
      `Pool artifact hash mismatch: expected ${config.artifactSha256}, received ${poolArtifact.digest}`,
    );
  }
  if (
    config.lqtArtifactSha256 &&
    lqtArtifact.digest !== config.lqtArtifactSha256
  ) {
    throw new Error(
      `LQT artifact hash mismatch: expected ${config.lqtArtifactSha256}, received ${lqtArtifact.digest}`,
    );
  }

  const commit = sourceCommit();
  const sourceDirty = !sourceIsClean();
  if (config.network === "mainnet" && sourceDirty) {
    throw new Error("Mainnet deployment requires a clean Git worktree");
  }

  const tezos = new TezosToolkit(config.rpc);
  const deploymentSigner = await createDeploymentSigner(config);
  tezos.setProvider({ signer: deploymentSigner.signer });
  const [deployer, chainId] = await Promise.all([
    tezos.signer.publicKeyHash(),
    tezos.rpc.getChainId(),
  ]);
  assertTokenTokenDeploymentChain(config.network, config.expectedChainId, chainId);
  const seedReceiver = config.seedReceiver ?? deployer;
  const stateConfig = canonicalConfig(config, deployer, seedReceiver);
  const stateFingerprint = fingerprint({
    network: config.network,
    chainId,
    sourceCommit: commit,
    sourceDirty,
    signerMode: deploymentSigner.mode,
    poolArtifact: poolArtifact.digest,
    lqtArtifact: lqtArtifact.digest,
    ...stateConfig,
  });
  const existing = await loadTokenTokenDeploymentState(config.stateFile);
  const state: TokenTokenDeploymentState =
    existing ?? {
      version: TOKEN_TOKEN_DEPLOYMENT_STATE_VERSION,
      fingerprint: stateFingerprint,
      network: config.network,
      rpc: config.rpc,
      chainId,
      sourceCommit: commit,
      sourceDirty,
      compilerVersion,
      signerMode: deploymentSigner.mode,
      artifacts: {
        pool: {
          path: poolArtifact.absolutePath,
          sha256: poolArtifact.digest,
          codeSha256: scriptCodeSha256(poolArtifact.script),
        },
        lqt: {
          path: lqtArtifact.absolutePath,
          sha256: lqtArtifact.digest,
          codeSha256: scriptCodeSha256(lqtArtifact.script),
        },
      },
      deployer,
      config: stateConfig,
      steps: {},
    };
  if (state.fingerprint !== stateFingerprint || state.deployer !== deployer) {
    throw new Error(
      `Deployment state ${config.stateFile} belongs to different code, configuration, or deployer`,
    );
  }
  state.rpc = config.rpc;
  await persistTokenTokenDeploymentState(config.stateFile, state);

  console.log(`Network: ${config.network} (${chainId})`);
  console.log(`Deployer: ${deployer}`);
  console.log(`State: ${path.resolve(config.stateFile)}`);
  console.log("Verifying pinned token contracts...");
  const [tokenA, tokenB] = await Promise.all([
    assertTokenContract(tezos, "TOKEN_A", config.tokenA),
    assertTokenContract(tezos, "TOKEN_B", config.tokenB),
  ]);

  if (!state.steps.initialized) {
    const [balanceA, balanceB, xtzBalance] = await Promise.all([
      getTokenBalance(
        tezos,
        config.tokenA.address,
        deployer,
        config.tokenA.standard,
        config.tokenA.tokenId,
        config.tzktApiUrl,
      ),
      getTokenBalance(
        tezos,
        config.tokenB.address,
        deployer,
        config.tokenB.standard,
        config.tokenB.tokenId,
        config.tzktApiUrl,
      ),
      tezos.tz.getBalance(deployer).then((value) => BigInt(value.toString())),
    ]);
    if (balanceA < BigInt(config.seedAmountA)) {
      throw new Error("Deployer TOKEN_A balance is below SEED_AMOUNT_A");
    }
    if (balanceB < BigInt(config.seedAmountB)) {
      throw new Error("Deployer TOKEN_B balance is below SEED_AMOUNT_B");
    }
    if (xtzBalance < minimumDeploymentBalance) {
      throw new Error("Deployer requires at least 5 XTZ for origination and fees");
    }
    console.log("Seed-token and deployment-fee balance checks passed.");
  }

  if (config.network === "mainnet") {
    console.log("WARNING: Deploying the token-to-token pool to MAINNET.");
    console.log("Press Ctrl+C within 5 seconds to cancel.");
    await new Promise((resolve) => setTimeout(resolve, 5_000));
  }

  const reviewedCode = {
    pool: scriptCodeSha256(poolArtifact.script),
    lqt: scriptCodeSha256(lqtArtifact.script),
  };

  let poolAddress = await resumeOrigination(
    "pool",
    tezos,
    config,
    state,
    reviewedCode.pool,
  );
  if (!poolAddress) {
    const storage = new Schema(getStorageType(poolArtifact.script) as never).Encode(
      buildTokenTokenInitialStorage(config, deployer),
    );
    const operation = await tezos.contract.originate({
      code: poolArtifact.script,
      init: storage,
    });
    state.steps.pool = {
      operation: operation.hash,
      status: "injected",
    };
    await persistTokenTokenDeploymentState(config.stateFile, state);
    const pool = await operation.contract(config.confirmations);
    poolAddress = pool.address;
    state.steps.pool = {
      address: poolAddress,
      operation: operation.hash,
      status: "applied",
    };
    await persistTokenTokenDeploymentState(config.stateFile, state);
    console.log(`Pool originated: ${poolAddress}`);
  }
  const pool = await tezos.contract.at(poolAddress);

  let lqtAddress = await resumeOrigination(
    "lqt",
    tezos,
    config,
    state,
    reviewedCode.lqt,
  );
  if (!lqtAddress) {
    const storage = new Schema(getStorageType(lqtArtifact.script) as never).Encode(
      buildEmptyLqtStorage(config, pool.address),
    );
    const operation = await tezos.contract.originate({
      code: lqtArtifact.script,
      init: storage,
    });
    state.steps.lqt = {
      operation: operation.hash,
      status: "injected",
    };
    await persistTokenTokenDeploymentState(config.stateFile, state);
    const lqt = await operation.contract(config.confirmations);
    lqtAddress = lqt.address;
    state.steps.lqt = {
      address: lqtAddress,
      operation: operation.hash,
      status: "applied",
    };
    await persistTokenTokenDeploymentState(config.stateFile, state);
    console.log(`LQT originated: ${lqtAddress}`);
  }

  if (!(await resumeOperation("lqtLinked", config, state))) {
    const operation = await pool.methodsObject
      .set_lqt_address(lqtAddress)
      .send();
    state.steps.lqtLinked = {
      operation: operation.hash,
      status: "injected",
    };
    await persistTokenTokenDeploymentState(config.stateFile, state);
    await operation.confirmation(config.confirmations);
    state.steps.lqtLinked.status = "applied";
    await persistTokenTokenDeploymentState(config.stateFile, state);
    console.log("LQT address linked to pool.");
  }

  if (!(await resumeOperation("initialized", config, state))) {
    const batch = tezos.contract.batch();
    addAuthorization(
      batch,
      tokenA,
      config.tokenA,
      deployer,
      pool.address,
      config.seedAmountA,
    );
    addAuthorization(
      batch,
      tokenB,
      config.tokenB,
      deployer,
      pool.address,
      config.seedAmountB,
    );
    batch.withContractCall(
      pool.methodsObject.initialize({
        amount_a: config.seedAmountA,
        amount_b: config.seedAmountB,
        receiver: seedReceiver,
        deadline: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
      }),
    );
    addAuthorizationCleanup(batch, tokenA, config.tokenA, deployer, pool.address);
    addAuthorizationCleanup(batch, tokenB, config.tokenB, deployer, pool.address);
    batch.withContractCall(pool.methodsObject.set_paused(true));
    const operation = await batch.send();
    state.steps.initialized = {
      operation: operation.hash,
      status: "injected",
    };
    await persistTokenTokenDeploymentState(config.stateFile, state);
    await operation.confirmation(config.confirmations);
    state.steps.initialized.status = "applied";
    await persistTokenTokenDeploymentState(config.stateFile, state);
    console.log(
      "Pool initialized, paused for handoff, and temporary token authorizations removed.",
    );
  }

  if (
    config.finalManager !== deployer &&
    !(await resumeOperation("managerProposed", config, state))
  ) {
    const operation = await pool.methodsObject
      .propose_manager(config.finalManager)
      .send();
    state.steps.managerProposed = {
      operation: operation.hash,
      status: "injected",
    };
    await persistTokenTokenDeploymentState(config.stateFile, state);
    await operation.confirmation(config.confirmations);
    state.steps.managerProposed.status = "applied";
    await persistTokenTokenDeploymentState(config.stateFile, state);
    console.log(`Manager proposed: ${config.finalManager}`);
  }

  await verifyDeployment(tezos, config, state, {
    pool: reviewedCode.pool,
    lqt: reviewedCode.lqt,
  });
  state.steps.verified = { at: new Date().toISOString() };
  await persistTokenTokenDeploymentState(config.stateFile, state);
  console.log("Deployment verification passed.");
  if (config.finalManager !== deployer) {
    console.log("FINAL_MANAGER must call %accept_manager and then %set_paused false.");
    console.log("Run verify:token-token-handoff after both calls are confirmed.");
  } else {
    console.log("The manager must call %set_paused false after reviewing the deployment.");
  }
}

main().catch((error: unknown) => {
  console.error(
    `Token-to-token deployment failed: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
