import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { TezosToolkit } from "@taquito/taquito";

import {
    loadDeploymentState,
    persistDeploymentState,
    releaseManifestState,
} from "./deployment-state.js";
import { assertFinalHandoffStorage } from "./handoff-verification.js";
import { scriptCodeSha256 } from "./token-code-hash.js";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

function stateFile(): string {
    const argument = process.argv
        .slice(2)
        .find((value) => value.startsWith("--state="));
    const value = argument?.slice("--state=".length)
        || process.env.DEX_DEPLOYMENT_STATE?.trim();
    if (!value) {
        throw new Error(
            "Set DEX_DEPLOYMENT_STATE or pass --state=<deployment-state.json>"
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
    const state = await loadDeploymentState(filename);
    if (!state) throw new Error(`Deployment state does not exist: ${filename}`);
    const dexAddress = state.steps.dex?.address;
    const lqtAddress = state.steps.lqt?.address;
    if (!dexAddress || !lqtAddress || !state.steps.verified) {
        throw new Error("Deployment is not ready for final-handoff verification");
    }

    const tezos = new TezosToolkit(process.env.DEPLOYMENT_VERIFY_RPC || state.rpc);
    const chainId = await tezos.rpc.getChainId();
    if (chainId !== state.chainId) {
        throw new Error(
            `RPC chain ID mismatch: expected ${state.chainId}, received ${chainId}`
        );
    }
    const [dexCode, lqtCode, tokenCode] = await Promise.all([
        codeHash(tezos, dexAddress),
        codeHash(tezos, lqtAddress),
        codeHash(tezos, state.config.tokenAddress),
    ]);
    if (
        dexCode !== state.artifacts.dex.codeSha256
        || lqtCode !== state.artifacts.lqt.codeSha256
        || tokenCode !== state.artifacts.tokenCodeSha256
    ) {
        throw new Error("On-chain code changed or disagrees with the deployment state");
    }
    const dex = await tezos.contract.at(dexAddress);
    assertFinalHandoffStorage(
        await dex.storage() as Record<string, unknown>,
        state
    );

    state.steps.handoffVerified = { at: new Date().toISOString() };
    await persistDeploymentState(filename, state);

    const outputDirectory = path.resolve(scriptDirectory, "..", "deployments");
    await fs.promises.mkdir(outputDirectory, { recursive: true });
    const finalManifest = path.join(
        outputDirectory,
        `${state.network}-handoff-${Date.now()}.json`
    );
    const manifest = `${JSON.stringify(releaseManifestState(state), null, 2)}\n`;
    await fs.promises.writeFile(finalManifest, manifest, { mode: 0o600 });
    await fs.promises.chmod(finalManifest, 0o600);
    const latest = path.join(
        outputDirectory,
        `${state.network}-handoff-latest.json`
    );
    await fs.promises.writeFile(latest, manifest, { mode: 0o600 });
    await fs.promises.chmod(latest, 0o600);
    console.log(`Final handoff verified: ${finalManifest}`);
}

main().catch((error: unknown) => {
    console.error(
        `Handoff verification failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exitCode = 1;
});
