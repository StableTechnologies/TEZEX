import { TezosToolkit } from "@taquito/taquito";
import { ValidationResult, validateContractAddress } from "@taquito/utils";

import { scriptCodeSha256 } from "./token-code-hash.js";

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix));
  if (!value || value.length === prefix.length) {
    throw new Error(`Missing required ${prefix}<value>`);
  }
  return value.slice(prefix.length);
}

async function main(): Promise<void> {
  const rpc = argument("rpc");
  const address = argument("address");
  if (validateContractAddress(address) !== ValidationResult.VALID) {
    throw new Error("--address must be a valid originated Tezos contract address");
  }
  const tezos = new TezosToolkit(rpc);
  const [chainId, script, entrypoints] = await Promise.all([
    tezos.rpc.getChainId(),
    tezos.rpc.getScript(address),
    tezos.rpc.getEntrypoints(address),
  ]);
  if (!script.code) throw new Error(`Contract ${address} has no script code`);
  console.log(
    JSON.stringify(
      {
        chainId,
        address,
        codeSha256: scriptCodeSha256(script.code),
        entrypoints: Object.keys(entrypoints.entrypoints).sort(),
      },
      null,
      2,
    ),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
