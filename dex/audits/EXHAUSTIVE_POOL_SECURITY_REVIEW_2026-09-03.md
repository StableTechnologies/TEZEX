# Exhaustive pool security review

Date: 2026-09-03

Baseline: `c9164c851751363b8a5c70c95c5c267a878832b9`

Compiler: `ligolang/ligo:1.11.5`

## Result

No known critical or high-severity unauthenticated reserve-drain path remains
in the reviewed native-XTZ or token-to-token pool code after the remediations
in this change. All identified issues were fixed before this result was
recorded.

This is a repository self-assessment, not an independent audit and not a claim
that exploitation is impossible. Its conclusion is conditional on deploying
the exact artifacts below, using the reviewed LQT, allowlisting exact external
token implementations, completing the paused role handoff, and passing a fresh
network rehearsal.

## Reviewed system

- modified native-XTZ pools compiled for FA1.2 and FA2 reserve tokens;
- generic immutable token-to-token pairs supporting FA1.2/FA1.2, FA2/FA2, and
  mixed FA1.2/FA2 configurations;
- external FA1.2 LQT and the permanent 1,000-unit liquidity floor;
- initialization, pause, role handoff, fee claim, swap, routed swap,
  add/remove liquidity, and reserve synchronization paths;
- hostile callback and malformed origination conditions; and
- deployment, artifact, handoff, and invariant-verification tooling.

The detailed threat model, operation-by-operation callback analysis, historical
audit mapping, and primary-source links are preserved in
[`report-source.md`](./report-source.md).

## Remediations made

| ID | Severity | Issue | Resolution |
| --- | --- | --- | --- |
| EPH-01 | Medium, deployment-dependent | A linked LQT supply was trusted before reserves were accepted. Pre-minted units could represent unauthorized reserve claims. | Added a synchronous supply view. Native pools validate the configured supply at link time; token-to-token pools require zero supply at link and recheck immediately before initialization. |
| EPH-02 | Medium, malformed-origination-dependent | Phantom reserve, fee, or LQT accounting could survive until a later seed operation. | Token-to-token initialization requires zero accounting state. Native activation rejects fee liabilities, and fee claims require an active, complete pool. |
| EPH-03 | Low | Native activation or an administrative transition could leave trading enabled before operational verification. | Activation always ends paused. Either role proposal pauses immediately, pending roles prevent unpause, and acceptance does not implicitly unpause. |
| EPH-04 | Low–Medium, nonstandard-token-dependent | A multi-interface token contract could be configured as both sides of a token pair; a reserve contract could also be reused as LQT. | Asset identity is now checked on-chain across FA1.2/FA2 variants. Distinct FA2 IDs remain supported. LQT must differ from every reserve-token contract. |
| EPH-05 | Low | Zero inputs or positive inputs rounded to zero could silently donate value when a caller used a zero minimum. | Native swaps, routed swaps, adds, and removals reject zero inputs and zero calculated outputs. |

## Important controls confirmed

- Fees are immutable: 25 bp remains with LP reserves and 5 bp accrues as a
  separate protocol liability.
- Protocol liabilities are never priced as tradable reserves and cannot be
  claimed twice.
- Every subtraction that can cross zero fails closed.
- The 1,000-unit LQT floor prevents an ordinary provider from emptying either
  pool family.
- The token-to-token pool locks before its first external operation and unlocks
  only through a final self-authenticated call. Hostile callback tests confirm
  whole-transaction rollback.
- Native sold-token ownership is fixed to immediate `SENDER`, closing the
  user-selected-owner class behind the historic Dexter exploit.
- Native FA2 synchronization accepts exactly one response for the configured
  pool owner and token ID, from the configured token contract, while a request
  is pending.
- All user-priced actions enforce deadlines and caller-selected slippage
  bounds.
- Direct token donations do not mint LQT or silently rewrite token-to-token
  reserves.
- Manager and protocol-recipient changes are two-step and cancelable; the
  proposed address must explicitly accept.

These controls were checked against the public Dexter and QuipuSwap audit
classes cited in the source record. Public upstream audits do not transfer to
this implementation.

## Reproducible artifacts

Each artifact was compiled twice from the reviewed source. The independent
outputs were byte-identical to the checked-in files.

| Artifact | SHA-256 |
| --- | --- |
| `compiled_contracts/lqt.tz` | `617f0e402948e24110790288c55998d2319d5da9694e01a966e077f20f988f25` |
| `compiled_contracts/token_token_pool.tz` | `7b7e19d9ae040552bc5e70533f0277cd323e35f95a0dca9e0a25922aa93a6345` |
| `compiled_contracts/pool_mod.tz` | `db6a15ce85437330f36750858cc7d75832e3d6c4af929c72884a344b1f96fbe6` |
| `compiled_contracts/pool_fa2_mod.tz` | `589edf545be6ebbfd26b97c08a840c8110c2457d8da6958418c7f116f864a0bc` |

The base pool artifacts did not change.

## Verification performed

| Layer | Result |
| --- | --- |
| Token-to-token LIGO | 24/24 passing |
| Modified native FA2 LIGO | 27/27 passing |
| Modified native FA1.2 LIGO | 81/81 passing |
| LQT LIGO | 5/5 passing |
| Deployment/tooling Node tests | 67/67 passing |
| TypeScript type check | Passing |
| Production dependency advisory scan | 0 known vulnerabilities from `npm audit --omit=dev` |

The deterministic arithmetic suite covers:

- 216,000 small-reserve swap cases for product monotonicity, round-trip
  non-profit, and split-trade non-improvement;
- more than 500,000 token-to-token add/remove sequences;
- more than 5,000,000 native add/remove sequences; and
- 50,000 stateful bidirectional swaps with interleaved fee claims and exact
  reserve/liability solvency checks.

New regression cases specifically cover pre-minted and supply-changing LQT,
dirty origination accounting, pre-activation fee claims, mixed-standard asset
aliasing, reserve/LQT aliasing, activation pause, handoff pause, zero input,
zero output, hostile reentrancy, malformed FA2 callbacks, minimum liquidity,
fee accounting, and full liquidity lifecycles.

## Residual trust boundaries

### External token behavior

An arbitrary token can still be taxed, rebasing, pausable, blacklistable,
upgradeable, callback-dependent, or malicious. It may transfer a different
amount than requested or lie about a balance. The pool cannot make such an
asset safe. Exact source/code, token ID, transfer semantics, implementation
pointer, administrative state, and current control addresses must be reviewed
and monitored for every deployed reserve token.

### LQT identity

The on-chain supply checks prevent ordinary mistakes but cannot prove that an
arbitrary contract tells the truth in its view. Deployment must originate and
hash-check the reviewed LQT artifact and verify that its immutable administrator
is the corresponding pool.

### Market structure

Deadlines and slippage bounds do not remove public-mempool MEV, sandwiching,
arbitrage, depegs, or ordinary impermanent loss. A pool reserve ratio is not a
manipulation-resistant oracle and must not be used directly for collateral or
liquidation decisions.

### Privileged and infrastructure compromise

The manager cannot withdraw LP reserves, but it controls pause and native-pool
baker selection and initiates role transitions. Multisig/key compromise,
front-end compromise, dishonest RPC/indexer responses, and monitoring failure
remain operational risks.

## Release decision

The code is ready for independent review and an exact-artifact network
rehearsal. Mainnet deployment is not yet authorized by this document.

Before unpausing a production deployment:

1. independently review this source diff and reproduce the four hashes;
2. review and pin the exact external token code and mutable control state;
3. rehearse the exact artifacts through seed, activation, role acceptance,
   swaps, routed swaps, add/remove liquidity, fee claims, pause, and invariant
   verification;
4. verify both final roles while the pools remain paused;
5. enable token-control/code monitoring and an incident response path; and
6. preserve the release manifest, operation journal, and final signer-free
   verification result.

For high TVL, an independent specialist audit and public bug-bounty period
remain appropriate even after all of the above pass.
