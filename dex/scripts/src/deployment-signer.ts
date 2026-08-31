import { RemoteSigner } from "@taquito/remote-signer";
import { InMemorySigner } from "@taquito/signer";
import type { Signer } from "@taquito/taquito";

export interface DeploymentSigner {
    signer: Signer;
    mode: "local-key" | "remote";
}

export interface DeploymentSignerConfig {
    privateKey?: string;
    remoteSignerUrl?: string;
    remoteSignerPkh?: string;
}

export async function createDeploymentSigner(
    config: DeploymentSignerConfig
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
