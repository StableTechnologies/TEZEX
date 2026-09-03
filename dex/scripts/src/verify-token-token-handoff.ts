import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TezosToolkit } from "@taquito/taquito";

import {
  loadTokenTokenDeploymentState,
  persistTokenTokenDeploymentState,
  shareableTokenTokenDeploymentState,
} from "./token-token-deployment-state.js";
import { assertFinalTokenTokenHandoff } from "./token-token-handoff-verification.js";
import { scriptCodeSha256 } from "./token-code-hash.js";
import { getTokenBalanceFromRpc } from "./util.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

function stateFile(): string {
  const argument = process.argv
    .slice(2)
    .find((value) => value.startsWith("--state="));
  const value =
    argument?.slice("--state=".length) ||
    process.env.TOKEN_TOKEN_DEPLOYMENT_STATE?.trim();
  if (!value) {
    throw new Error(
      "Set TOKEN_TOKEN_DEPLOYMENT_STATE or pass --state=<deployment-state.json>",
    );
  }
  return path.resolve(value);
}

async function codeHash(tezos: TezosToolkit, address: string): Promise<string> {
  const script = await tezos.rpc.getScript(address);
  if (!script.code) throw new Error(`Contract ${address} has no script code`);
  return scriptCodeSha256(script.code);
}

async function main(): Promise<void> {
  const filename = stateFile();
  const state = await loadTokenTokenDeploymentState(filename);
  if (!state) throw new Error(`Deployment state does not exist: ${filename}`);
  const poolAddress = state.steps.pool?.address;
  const lqtAddress = state.steps.lqt?.address;
  if (
    !poolAddress ||
    state.steps.pool?.status !== "applied" ||
    !lqtAddress ||
    state.steps.lqt?.status !== "applied" ||
    state.steps.initialized?.status !== "applied" ||
    !state.steps.verified
  ) {
    throw new Error("Deployment is not ready for final-handoff verification");
  }

  const tezos = new TezosToolkit(
    process.env.DEPLOYMENT_VERIFY_RPC?.trim() || state.rpc,
  );
  const chainId = await tezos.rpc.getChainId();
  if (chainId !== state.chainId) {
    throw new Error(
      `RPC chain ID mismatch: expected ${state.chainId}, received ${chainId}`,
    );
  }

  const [poolCode, lqtCode, tokenACode, tokenBCode] = await Promise.all([
    codeHash(tezos, poolAddress),
    codeHash(tezos, lqtAddress),
    codeHash(tezos, state.config.tokenA.address),
    codeHash(tezos, state.config.tokenB.address),
  ]);
  if (
    poolCode !== state.artifacts.pool.codeSha256 ||
    lqtCode !== state.artifacts.lqt.codeSha256 ||
    tokenACode !== state.config.tokenA.codeSha256 ||
    tokenBCode !== state.config.tokenB.codeSha256
  ) {
    throw new Error("On-chain code changed or disagrees with the deployment state");
  }

  const [pool, lqt] = await Promise.all([
    tezos.contract.at(poolAddress),
    tezos.contract.at(lqtAddress),
  ]);
  const [poolStorage, lqtStorage, balanceA, balanceB] = await Promise.all([
    pool.storage() as Promise<Record<string, unknown>>,
    lqt.storage() as Promise<Record<string, unknown>>,
    getTokenBalanceFromRpc(
      tezos,
      state.config.tokenA.address,
      poolAddress,
      state.config.tokenA.standard,
      state.config.tokenA.tokenId,
    ),
    getTokenBalanceFromRpc(
      tezos,
      state.config.tokenB.address,
      poolAddress,
      state.config.tokenB.standard,
      state.config.tokenB.tokenId,
    ),
  ]);

  const lqtTokens = lqtStorage.tokens as {
    get: (owner: string) => Promise<unknown>;
  };
  if (!lqtTokens || typeof lqtTokens.get !== "function") {
    throw new Error("LQT storage does not expose the expected token ledger");
  }
  const [locked, provider] = await Promise.all([
    lqtTokens.get(poolAddress),
    lqtTokens.get(state.config.seedReceiver),
  ]);
  assertFinalTokenTokenHandoff(state, {
    poolStorage,
    lqtAdmin: lqtStorage.admin,
    lqtTotalSupply: lqtStorage.total_supply,
    lockedLqtBalance: locked ?? 0,
    providerLqtBalance: provider ?? 0,
    balanceA,
    balanceB,
  });

  state.steps.handoffVerified = { at: new Date().toISOString() };
  await persistTokenTokenDeploymentState(filename, state);

  const outputDirectory = path.resolve(
    scriptDirectory,
    "..",
    "deployments",
    "token-token",
  );
  await fs.promises.mkdir(outputDirectory, { recursive: true });
  const manifest = `${JSON.stringify(
    shareableTokenTokenDeploymentState(state),
    null,
    2,
  )}\n`;
  const finalManifest = path.join(
    outputDirectory,
    `${state.network}-handoff-${Date.now()}.json`,
  );
  await fs.promises.writeFile(finalManifest, manifest, { mode: 0o600 });
  await fs.promises.chmod(finalManifest, 0o600);
  const latest = path.join(
    outputDirectory,
    `${state.network}-handoff-latest.json`,
  );
  await fs.promises.writeFile(latest, manifest, { mode: 0o600 });
  await fs.promises.chmod(latest, 0o600);
  console.log(`Paused token-to-token handoff verified: ${finalManifest}`);
  console.log(
    "The final manager may now unpause the pool and must then run the launch/invariant verifier.",
  );
}

main().catch((error: unknown) => {
  console.error(
    `Token-to-token handoff verification failed: ${
      error instanceof Error ? error.message : String(error)
    }`,
  );
  process.exitCode = 1;
});
