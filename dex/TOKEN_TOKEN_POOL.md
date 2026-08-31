# Token-to-token pool

This package is a generic single-pair constant-product pool for FA1.2 and FA2 assets. One compiled pool artifact supports FA1.2/FA1.2, FA2/FA2, or mixed pairs; the two asset descriptors are immutable origination storage.

The generic contract package has completed repository review and network rehearsal. Mainnet use remains a release decision for an exact allowlisted asset pair and must pass the fail-closed deployment gates below.

## Components

- `contracts/token_token_pool.mligo`: pool accounting and custody operations.
- `contracts/lqt_fa12.mligo`: existing external FA1.2 liquidity token; the pool is its administrator.
- `tests/token_token_pool.test.mligo`: lifecycle, economics, pair-shape, failure, and adversarial tests.
- `scripts/src/deploy-token-token.ts`: pinned, resumable origination workflow.
- `scripts/src/verify-token-token-handoff.ts`: signer-free final role, reserve, code, and LQT verification.
- `compiled_contracts/token_token_pool.tz`: reproducible Michelson artifact.

The external LQT design preserves the repository's established liquidity-token interface. The pool links an empty LQT contract exactly once before activation. Initialization then mints 1,000 LQT units permanently to the pool and the remaining initial supply to the configured seed receiver.

## Economics

The fee schedule has no setter:

- 25 basis points remain in the tradable reserve for liquidity providers;
- 5 basis points accrue in a separate per-asset protocol-fee counter; and
- total swap charge is 30 basis points.

For input `x`, input reserve `Rin`, and output reserve `Rout`:

```text
weighted input = x * 9,970
output = weighted input * Rout / (Rin * 10,000 + weighted input)
protocol fee = floor(x * 5 / 10,000)
reserve input = x - protocol fee
```

All arithmetic uses natural numbers. Checked subtraction rejects underflow, output rounds down, and the test suite requires the reserve product not to decrease after completed swaps.

Initial LQT supply is `floor(sqrt(seed A * seed B))`, computed with integer Newton iteration. This avoids decimal assumptions and supports assets with different precisions. The result must exceed the permanent 1,000-unit LQT lock.

## Lifecycle and controls

The pool originates inactive with no LQT address. The temporary manager must link one LQT contract and initialize once. Thereafter:

- deadlines and caller-supplied minimums/maximums protect swaps and liquidity actions;
- a reentrancy guard remains active until a self-only final operation closes the action;
- pause blocks initialization, additions, and swaps, but not liquidity removal or fee claims;
- manager and protocol-fee-recipient changes each require proposal and acceptance and can be canceled; and
- fee claims are permissionless, but always pay the configured recipient.

Protocol fees are excluded from swap reserves. Direct token transfers to the pool are surplus and do not alter reserves or issue LQT. There is intentionally no reserve sync or rescue entrypoint.

## Token compatibility boundary

The pool issues standard FA1.2 or FA2 transfer operations and relies on normal Tezos atomic rollback. It does not attempt to prove arbitrary token behavior with callbacks.

Every production asset must be allowlisted by exact contract address, FA2 token ID where applicable, and reviewed script-code hash. The deployment tool verifies these hashes and required entrypoints before origination. Compatible assets must:

- debit and credit exactly the requested amount;
- execute transfers synchronously and atomically;
- have no transfer tax, rebasing, reflection, blacklist, or administrator balance-seizure behavior that breaks reserve accounting;
- preserve the reviewed transfer and authorization semantics; and
- for FA1.2, safely support zero-then-set allowance changes; or, for FA2, standard add/remove operator calls.

Code-hash verification detects deployment against an unreviewed implementation; it does not make an unsafe implementation compatible. Administrative controls, upgrade paths, metadata, token IDs, and ledger behavior still require human review.

## Build and test

Use LIGO 1.11.5:

```sh
ligo compile contract dex/contracts/token_token_pool.mligo \
  -m TokenTokenPool --no-warn \
  -o dex/compiled_contracts/token_token_pool.tz

ligo run test dex/tests/token_token_pool.test.mligo --no-warn
```

The checked-in pool artifact SHA-256 is:

```text
a7939ae6ee629057d6dca4301a9be8485b19d72efebcdf172cbd4a3a0e48957e
```

CI recompiles the source with the pinned compiler, byte-compares the output, checks this digest, runs the LIGO suite, and validates the TypeScript deployment tooling.

## Deployment rehearsal

From `dex/scripts`:

```sh
npm ci --ignore-scripts
npm run typecheck
npm test
npm run deploy:token-token:previewnet
```

Configuration is documented in `.env.example`. It contains no live addresses. Before submitting any operation, the deployment workflow verifies the RPC chain ID, exact pool artifact digest, both selected token code hashes, and required token entrypoints.

Generate a deterministic token code hash and list its entrypoints without signing or changing chain state:

```sh
npm run inspect:token -- --rpc=<RPC_URL> --address=<TOKEN_CONTRACT>
```

The inspector and deployer share a canonical JSON hash implementation, so equivalent RPC object-key ordering produces the same digest. Hash identity is only the first step; reviewers must still assess the printed contract's code and controls.

The workflow is resumable and records confirmed steps in a gitignored mode-0600 JSON file. It:

1. originates the inactive pool;
2. originates an empty LQT with the pool as administrator;
3. links LQT once;
4. batches temporary token authorization, initialization, authorization cleanup, and handoff pause atomically;
5. proposes the configured final manager;
6. verifies source/artifact identity, pool and LQT state, metadata pointers, seed balances, reserve solvency, minimum LQT lock, and pending handoff.

The receipt never contains the private key. The proposed manager must separately call `%accept_manager` and then `%set_paused false`; those privileged actions are intentionally not automated with the deployer's authority. Verify the completed handoff without a signer:

```sh
TOKEN_TOKEN_DEPLOYMENT_STATE=<receipt.json> npm run verify:token-token-handoff
```

## Mainnet gates

The Mainnet command is explicit:

```sh
npm run deploy:token-token:mainnet
```

It refuses to originate unless the release has:

- the permanent Mainnet chain ID and a matching RPC;
- a clean Git worktree and exact pool and LQT artifact hashes;
- exact selected-token code hashes and required transfer interfaces;
- sufficient seed-token balances and an XTZ fee buffer before origination;
- immutable IPFS metadata and an explicit LQT receiver;
- originated manager and fee-recipient contracts with documented multisig thresholds;
- a named token-integration owner and incident channel; and
- exactly one local-key or remote/HSM signer mode.

The release operator must still complete the selected-token administrative-control review, monitoring setup, frontend/router allowlisting, final metadata and seed approval, and independent review of the Mainnet-enablement change. Mainnet remains blocked if any preflight, confirmation, code-hash, reserve, LQT, or final-handoff check differs.

See `TOKEN_TOKEN_POOL_SECURITY_REVIEW.md` for the internal assessment and `TOKEN_TOKEN_POOL_PROVENANCE.md` for upstream lineage and deliberate differences.
