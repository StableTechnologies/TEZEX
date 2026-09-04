# Token-to-token pool internal security assessment

Scope: pool source and artifact, external LQT integration, tests, configuration parser, storage encoder, and fail-closed deployment workflow.

Compiler: LIGO 1.11.5.

This is a repository self-assessment, not an independent audit and not a mainnet readiness statement. Public reviews of related upstream contracts do not transfer to this implementation or prove that any particular upstream commit was audited.

## Resolved design risks

| ID | Risk | Treatment |
| --- | --- | --- |
| TT-01 | Fee policy changes after users provide liquidity. | LP fee is fixed at 25 bp and protocol fee at 5 bp; no fee setter exists. |
| TT-02 | Protocol fees become tradable reserves or are claimed twice. | Per-asset fee counters remain outside reserves and are zeroed before the transfer operation is emitted; Tezos rollback restores state on failure. |
| TT-03 | Rounding or subtraction creates value or wraps underflow. | Output rounds down and every subtraction uses `is_nat`; tests assert nondecreasing reserve product. |
| TT-04 | The last provider drains the pool to an unusable state. | Initialization mints 1,000 LQT to the pool itself and removal may not reduce supply below that lock. |
| TT-05 | Pool and external LQT supply drift. | Only the pool administers LQT mint/burn, and each pool action updates reserve/LQT accounting in the same Tezos transaction. Tests compare both totals. |
| TT-06 | A token contract reenters while accounting is staged. | User actions set `entered = true` before external operations and finish with authenticated self-only `%close`; an adversarial callback test verifies complete rollback. |
| TT-07 | Emergency pause traps providers. | Pause blocks risk-increasing actions but leaves removal and fee claims available. |
| TT-08 | A mistaken or incomplete control transfer loses administration or exposes the pool while temporary roles remain. | Manager and fee-recipient changes are two-step, cancelable handoffs. Origination and initialization remain paused, and unpausing fails while either handoff is pending. |
| TT-09 | Deployment uses the wrong chain, artifact, or token implementation. | Tooling pins chain ID, artifact SHA-256, token script-code SHA-256, and required interfaces before origination. |
| TT-10 | Interrupted setup leaves operators/allowances unnecessarily active. | Seed authorization, initialization, and cleanup are one atomic batch; the deployment receipt supports resuming confirmed prior steps. |
| TT-11 | Mainnet is run before review and rehearsal. | Mainnet is explicit and fails closed on chain identity, dirty source, artifact/token hashes, seed balances, signer mode, multisig policy, operational ownership, paused handoff, and final signer-free verification. |
| TT-12 | Pre-minted LQT gives an earlier holder a claim on newly seeded reserves. | Linking requires a zero synchronous LQT supply, and initialization rechecks it immediately before accepting the seed. |
| TT-13 | One multi-interface contract masquerades as both reserve assets. | The pool compares underlying addresses across FA1.2/FA2 variants while preserving support for distinct FA2 token IDs from the same contract. |
| TT-14 | Malformed origination storage carries phantom reserves, fees, or LQT into activation. | Initialization requires every reserve, fee, and LQT accounting field to be zero. |
| TT-15 | A live pool continues trading during an incomplete administrative handoff. | Proposing either manager or fee-recipient handoff pauses immediately; acceptance leaves the pool paused for explicit verification and unpause. |

## Accounting invariants

For each asset after a successful action:

```text
held balance >= reserve + accrued protocol fee
```

Equality is expected unless someone directly donated tokens. Donations never change reserves.

For a completed swap:

```text
new reserve A * new reserve B >= old reserve A * old reserve B
```

For LQT:

```text
pool.lqt_total = lqt.total_supply
lqt.total_supply >= 1,000 after initialization
lqt.balance(pool) = 1,000 immediately after initialization
```

For the action guard:

```text
entered = true  => public state-mutating entrypoints reject
%close caller != self => reject
successful external-operation sequence => entered = false
failed sequence => the entire Tezos transaction rolls back
```

## Test coverage

The LIGO suite exercises:

- mixed FA2/FA1.2 initialization and independent FA2/FA2 and FA1.2/FA1.2 initialization using the same artifact;
- integer geometric-mean initial supply and permanent LQT lock;
- one-time initialization and immutable LQT link;
- zero-supply LQT link/recheck, dirty-origination rejection, and reserve/LQT address separation;
- proportional additions/removals and LQT supply synchronization;
- both swap directions, fee rounding, reserve product, and solvency;
- expired and excessive-minimum-output rejections before transfers;
- direct donations as non-reserve surplus;
- permissionless fee claims paying only the configured recipient;
- fail-closed origination/initialization, automatic pause on role proposal, rejection of unpause during pending handoffs, and two-step/cancelable administration;
- nonpayable and unauthorized calls;
- immutable fee/quote views; and
- hostile token callback reentrancy with whole-transaction rollback.

The TypeScript suite tests arbitrary-precision math, all supported asset combinations, identical/ambiguous descriptor rejection, same-contract distinct FA2 IDs, immutable IPFS URI requirements, artifact digest validation, storage schema encoding, test-network/Mainnet separation, and Mainnet release requirements.

Independent recompilation in the pinned LIGO 1.11.5 container produced a byte-identical pool artifact with SHA-256 `7b7e19d9ae040552bc5e70533f0277cd323e35f95a0dca9e0a25922aa93a6345`; the serialized Michelson file is 103,124 bytes. The LQT source reproduced its checked-in artifact (`617f0e402948e24110790288c55998d2319d5da9694e01a966e077f20f988f25`). The LQT and modified FA1.2/FA2 suites pass alongside the token-to-token suite. Type checking and all 67 Node tests pass under Taquito 25, including deterministic enumeration of more than 5.7 million arithmetic/state transitions; `npm audit --omit=dev` reports zero known production-dependency vulnerabilities at assessment time.

## Residual trust assumptions

### Exact token behavior must be reviewed

The pool cannot make an arbitrary token safe. A taxed, rebasing, upgradeable, malicious, callback-dependent, or administratively drainable asset can invalidate reserve assumptions. A matching code hash establishes identity, not quality. Each selected implementation and its current administrative state remain launch inputs requiring review.

### Balance verification is operational, not per action

To avoid callback liveness hazards, the contract uses strict atomic-transfer assumptions rather than an asynchronous before/after balance state machine. The deployment workflow verifies seed balances after initialization, and monitoring should continue checking solvency. This tradeoff is acceptable only for explicitly allowlisted token implementations.

### External LQT remains part of the trusted system

The pool relies on the repository's FA1.2 LQT `%mintOrBurn` semantics and synchronous total-supply view. Deploying a different implementation at the linked address could lie to the view or break liquidity operations. The deployer therefore originates the reviewed artifact itself, assigns the pool as administrator, links it once, and verifies both code and storage.

### No oracle protection

Reserve ratio is not a manipulation-resistant price oracle. It must not be used directly for collateral valuation or liquidation decisions. A separate oracle should have independent sources, freshness checks, and failure policy.

### No rescue or reserve synchronization

Direct donations can remain locked. The deliberate absence of rescue/sync authority avoids an administrator path that can mutate user-facing reserve economics, but it means operational mistakes may be unrecoverable.

## Remaining launch blockers

- Independent source and Michelson review.
- Reproduction of the exact pool and LQT artifacts.
- Review and allowlisting of the actual asset contracts and IDs.
- Network rehearsal using the intended metadata, seed ratios, fee recipient, and final manager.
- Indexer/wallet/router compatibility testing for the external FA1.2 LQT.
- Front-end and monitoring integration.
- Independent review of the Mainnet-enablement change and its final release manifest.
