# Modified native-XTZ pool release closeout

Date: 2026-08-25

Reviewed base commit: `1ca88d3e82b081862dace1cbc5db7630401ce5c8`

Compiler: LIGO `1.11.5` (`ligolang/ligo:1.11.5`)

This note maps the release branch to audit issues #240–#244. Deployment-specific
token, manager, recipient, signer, and seed values remain external inputs and
are recorded in the generated release manifest; none are compiled into the
pool.

## #240 — fee model

The authoritative model is 30 bp total, split 25 bp to LP reserves and 5 bp to
the protocol liability. Both swap directions price the gross input at
`997 / 1000`, round down using integer division, and calculate the protocol
liability as `floor(gross * 5 / 10,000)`. The immutable constants, quote views,
frontend constants, claim accounting, and rounding tests agree. Claims reduce
only the separately tracked liability, not LP trading reserves.

## #241 — production authority

- Fees are immutable and there is no fee setter.
- Manager and protocol-fee recipient changes are two-step and cancellable.
- The proposed address must call its acceptance entrypoint.
- Modified pools originate paused. Swaps, deposits, additions, routed swaps,
  and reserve synchronization stop while removal and fee claims remain
  available.
- A pool cannot be unpaused while either production-role handoff is pending.
- The deployer is a temporary manager and fee recipient. Production roles are
  proposed only after successful activation.
- Mainnet preflight requires originated role addresses and verifies their
  reviewed code hashes, thresholds, and complete owner sets on chain.
- `verify:handoff` confirms both roles accepted while the pool remains paused, all
  three on-chain code hashes still match the release manifest, and the seed
  reserves, real asset balances, LQT supply, locked floor, and provider
  allocation remain intact through the handoff window.
- After unpausing, `verify:pool-invariants` checks live solvency and lifecycle
  state without assuming the original seed reserves remain unchanged.

## #242 — external token boundary

The FA2 callback requires exactly one result and verifies both the pool owner
and configured token ID. Empty, multiple, wrong-owner, and wrong-ID responses
fail closed. Deployment fingerprints the exact token address, standard, token
ID, and observed script-code hash; Mainnet additionally requires an independent
expected hash. The external-token runbook assigns an integration owner and
incident channel and defines alerts and response gates for administrative,
issuance, freeze, migration, and code-hash events.

## #243 — reproducible release gate

CI compiles all native-pool variants with the pinned LIGO image and production
defines, byte-compares the generated Michelson with checked-in artifacts, runs
the LQT/base/modified FA1.2 and FA2 suites, and type-checks/tests deployment
tooling. Current modified artifacts:

| Artifact | SHA-256 |
| --- | --- |
| `compiled_contracts/pool_mod.tz` | `db6a15ce85437330f36750858cc7d75832e3d6c4af929c72884a344b1f96fbe6` |
| `compiled_contracts/pool_fa2_mod.tz` | `589edf545be6ebbfd26b97c08a840c8110c2457d8da6958418c7f116f864a0bc` |

The 2026-09-03 defense-in-depth pass additionally makes activation and role
handoffs fail paused, verifies the LQT interface and supply before its address
is stored, rejects LQT/reserve-token aliasing, blocks inactive fee claims and
phantom initial fee liabilities, and rejects zero/dust actions that would
produce no output. See `audits/EXHAUSTIVE_POOL_SECURITY_REVIEW_2026-09-03.md`.

## #244 — exact, resumable deployment

- Seed and LQT calculations use validated base-10 integers, `bigint`, and an
  integer square root. The only conversion required by Taquito's transfer API
  is range-checked before conversion and is not used for arithmetic.
- Chain ID, token interface/code, reviewed artifact hashes, balances, roles,
  metadata, and minimum liquidity fail closed before origination.
- Each operation hash is atomically persisted with mode `0600` immediately
  after injection; originated addresses are added after confirmation.
- On restart, applied originations are recovered through the configured indexer
  and code-hash checked. Pending or failed operations are never reinjected.
- Originations and the final atomic initialization group are simulated before
  injection.
- Local-key and remote/HSM-backed signers are supported.
- The manifest records commit, compiler, artifact and code hashes, chain,
  addresses, parameters, role thresholds, and every operation hash.
- Post-deployment verification compares on-chain code, storage, reserves,
  balances, LQT supply/allocation, role state, and final handoff state.

## Remaining release actions

1. Obtain independent review of this branch and its generated Michelson.
2. Run a fresh test-network rehearsal using the exact reviewed environment and
   preserve its operation journal and final handoff manifest.
3. Configure and exercise the external-token alert before unpausing.
4. Record the reviewed production multisig thresholds and artifact/token hashes
   in the deployment environment.
5. Treat Mainnet deployment as blocked if any preflight, simulation,
   confirmation, code-hash check, storage check, or final handoff check differs.
