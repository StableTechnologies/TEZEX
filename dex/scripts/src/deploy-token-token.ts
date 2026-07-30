import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Parser } from "@taquito/michel-codec";
import { Schema } from "@taquito/michelson-encoder";
import { InMemorySigner } from "@taquito/signer";
import { TezosToolkit } from "@taquito/taquito";
import dotenv from "dotenv";
import {
  parseTokenTokenConfig,
  type TokenDescriptor,
  type TokenTokenDeploymentConfig,
  type TokenTokenNetwork,
} from "./token-token-config.js";
import { buildTokenTokenInitialStorage } from "./token-token-storage.js";

dotenv.config();

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

function parseNetwork(): TokenTokenNetwork {
  const networkArg = process.argv.slice(2).find((arg) => arg.startsWith("--network="));
  const network = networkArg?.split("=")[1] ?? "testnet";
  if (network !== "testnet" && network !== "mainnet") {
    throw new Error(`Invalid network ${network}; expected testnet or mainnet`);
  }
  return network;
}

function compiledContractPath(): string {
  return path.join(
    scriptDirectory,
    "..",
    "..",
    "compiled_contracts",
    "token_token_pool.tz",
  );
}

function getStorageType(parsedScript: unknown): unknown {
  if (!Array.isArray(parsedScript)) {
    throw new Error("Compiled contract did not parse as a Michelson script");
  }
  const storageSection = parsedScript.find(
    (section) =>
      typeof section === "object" &&
      section !== null &&
      "prim" in section &&
      section.prim === "storage",
  ) as { args?: unknown[] } | undefined;
  if (!storageSection?.args?.[0]) {
    throw new Error("Compiled contract is missing its storage type");
  }
  return storageSection.args[0];
}

async function assertFA2Interface(
  tezos: TezosToolkit,
  label: string,
  token: TokenDescriptor,
): Promise<void> {
  const contract = await tezos.contract.at(token.address);
  const entrypoints = contract.entrypoints.entrypoints;
  for (const requiredEntrypoint of ["transfer", "balance_of", "update_operators"]) {
    if (!(requiredEntrypoint in entrypoints)) {
      throw new Error(`${label} is missing the ${requiredEntrypoint} FA2 entrypoint`);
    }
  }
}

async function addPoolOperator(
  tezos: TezosToolkit,
  token: TokenDescriptor,
  owner: string,
  poolAddress: string,
  confirmations: number,
): Promise<string> {
  const contract = await tezos.contract.at(token.address);
  const operation = await contract.methodsObject
    .update_operators([
      {
        add_operator: {
          owner,
          operator: poolAddress,
          token_id: token.tokenId,
        },
      },
    ])
    .send();
  await operation.confirmation(confirmations);
  return operation.hash;
}

async function saveDeployment(
  config: TokenTokenDeploymentConfig,
  deployer: string,
  poolAddress: string,
  operations: Record<string, string>,
): Promise<string> {
  const deployment = {
    network: config.network,
    rpc: config.rpc,
    timestamp: new Date().toISOString(),
    deployer,
    pool: poolAddress,
    tokenA: config.tokenA,
    tokenB: config.tokenB,
    seedAmountA: config.seedAmountA,
    seedAmountB: config.seedAmountB,
    seedReceiver: config.seedReceiver ?? deployer,
    feeRecipient: config.feeRecipient,
    proposedAdmin: config.finalAdmin ?? null,
    feeBps: { lp: 25, protocol: 5, total: 30 },
    operations,
  };
  const outputDirectory = path.join(scriptDirectory, "..", "deployments", "token-token");
  await fs.promises.mkdir(outputDirectory, { recursive: true });
  const timestamp = Date.now();
  const outputPath = path.join(outputDirectory, `${config.network}-${timestamp}.json`);
  const latestPath = path.join(outputDirectory, `${config.network}-latest.json`);
  const json = `${JSON.stringify(deployment, null, 2)}\n`;
  await fs.promises.writeFile(outputPath, json, { mode: 0o600 });
  await fs.promises.writeFile(latestPath, json, { mode: 0o600 });
  return outputPath;
}

async function main(): Promise<void> {
  const config = parseTokenTokenConfig(parseNetwork());
  const tezos = new TezosToolkit(config.rpc);
  tezos.setProvider({ signer: await InMemorySigner.fromSecretKey(config.privateKey) });

  const deployer = await tezos.signer.publicKeyHash();
  const seedReceiver = config.seedReceiver ?? deployer;
  console.log(`Network: ${config.network}`);
  console.log(`Deployer: ${deployer}`);
  console.log(`Token A: ${config.tokenA.address} / ${config.tokenA.tokenId}`);
  console.log(`Token B: ${config.tokenB.address} / ${config.tokenB.tokenId}`);
  console.log("Immutable fees: 25 bp LP + 5 bp protocol");

  await Promise.all([
    assertFA2Interface(tezos, "TOKEN_A", config.tokenA),
    assertFA2Interface(tezos, "TOKEN_B", config.tokenB),
  ]);

  if (config.network === "mainnet") {
    console.log("Mainnet deployment begins in five seconds; press Ctrl+C to cancel.");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const parser = new Parser();
  const source = await fs.promises.readFile(compiledContractPath(), "utf8");
  const parsedScript = parser.parseScript(source);
  const storageSchema = new Schema(getStorageType(parsedScript) as never);
  const initialStorage = storageSchema.Encode(
    buildTokenTokenInitialStorage(config, deployer),
  );

  const originateOperation = await tezos.contract.originate({
    code: parsedScript!,
    init: initialStorage,
  });
  const pool = await originateOperation.contract(config.confirmations);
  const operations: Record<string, string> = { originate: originateOperation.hash };
  console.log(`Pool originated: ${pool.address}`);

  operations.authorizeTokenA = await addPoolOperator(
    tezos,
    config.tokenA,
    deployer,
    pool.address,
    config.confirmations,
  );
  operations.authorizeTokenB = await addPoolOperator(
    tezos,
    config.tokenB,
    deployer,
    pool.address,
    config.confirmations,
  );

  const initializeOperation = await pool.methodsObject
    .initialize({
      amount_a: config.seedAmountA,
      amount_b: config.seedAmountB,
      receiver: seedReceiver,
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    })
    .send();
  await initializeOperation.confirmation(config.confirmations);
  operations.initialize = initializeOperation.hash;

  if (config.finalAdmin && config.finalAdmin !== deployer) {
    const proposal = await pool.methodsObject.propose_admin(config.finalAdmin).send();
    await proposal.confirmation(config.confirmations);
    operations.proposeAdmin = proposal.hash;
    console.log(`Admin proposed: ${config.finalAdmin}`);
    console.log("The proposed admin must call accept_admin to complete the handoff.");
  }

  const outputPath = await saveDeployment(
    config,
    deployer,
    pool.address,
    operations,
  );
  console.log(`Deployment record: ${outputPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Token-to-token deployment failed: ${message}`);
  process.exitCode = 1;
});
