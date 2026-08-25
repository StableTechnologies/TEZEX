import { RemoteSigner } from "@taquito/remote-signer";
import { InMemorySigner } from "@taquito/signer";
import type { Signer } from "@taquito/taquito";

import type { FullConfig } from "./config.js";

export interface DeploymentSigner {
    signer: Signer;
    mode: "local-key" | "remote";
}

export async function createDeploymentSigner(
    config: FullConfig
): Promise<DeploymentSigner> {
    if (config.remoteSignerUrl && config.remoteSignerPkh) {
        return {
            signer: new RemoteSigner(
                config.remoteSignerPkh,
                config.remoteSignerUrl
            ),
            mode: "remote",
        };
    }
    if (!config.privateKey) {
        throw new Error("No local or remote deployment signer is configured");
    }
    return {
        signer: await InMemorySigner.fromSecretKey(config.privateKey),
        mode: "local-key",
    };
}
