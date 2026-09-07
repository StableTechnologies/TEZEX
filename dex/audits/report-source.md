# Exhaustive pool hardening review — source record

Date: 2026-09-03

Baseline: `c9164c851751363b8a5c70c95c5c267a878832b9`

Compiler under review: `ligolang/ligo:1.11.5`

This is the canonical working record for the accompanying security review. It
records the reviewed sources, threat model, adversarial reasoning, findings,
and verification evidence. It is a repository self-assessment, not an
independent audit or a claim that exploitation is impossible.

## In-scope system

- `contracts/dexter_mod.mligo`, compiled as both the FA1.2 and FA2 native-XTZ
  modified pools;
- `contracts/token_token_pool.mligo`, one immutable FA1.2/FA2 pair per
  deployment;
- `contracts/lqt_fa12.mligo`, the external liquidity token used by both pool
  families;
- compilation, checked-in Michelson, contract tests, deployment scripts,
  handoff verification, and invariant monitoring;
- calls into arbitrary token and recipient contracts; and
- manager, protocol-recipient, and initialization transitions.

Out of scope: correctness of an arbitrary external token implementation,
private-key custody, RPC/indexer correctness outside the existing two-source
checks, front-end transaction construction, and economic loss from ordinary
price movement or public mempool ordering.

## Primary references reviewed

- Tezos smart-contract operation ordering and rollback:
  <https://docs.tezos.com/smart-contracts/logic/operations>
- Tezos authorization guidance (`SENDER` versus `SOURCE`):
  <https://docs.tezos.com/developing/security/authorization>
- TZIP-7 FA1.2 specification:
  <https://gitlab.com/tezos/tzip/-/raw/master/proposals/tzip-7/tzip-7.md>
- TZIP-12 FA2 specification:
  <https://gitlab.com/tezos/tzip/-/raw/master/proposals/tzip-12/tzip-12.md>
- LIGO Tezos reference, including synchronous views:
  <https://ligolang.org/docs/reference/tezos-reference/>
- Runtime Verification, *Formal Verification of the Dexter Exchange Smart
  Contract*:
  <https://raw.githubusercontent.com/runtimeverification/publications/main/reports/smart-contracts/Tezos-Dexter.pdf>
- Trail of Bits, *Dexter Smart Contracts Security Assessment*:
  <https://raw.githubusercontent.com/trailofbits/publications/master/reviews/dexter.pdf>
- Runtime Verification, *Quipuswap Token-to-Token DEX Security Audit*:
  <https://raw.githubusercontent.com/runtimeverification/publications/main/reports/smart-contracts/Quipuswap.pdf>
- Least Authority, *QuipuSwap Smart Contracts Final Audit Report*:
  <https://leastauthority.com/static/publications/LeastAuthority_Tezos_Foundation_QuipuSwap_Smart_Contracts_Final_Audit_Report.pdf>
- Nomadic Labs, technical description of the historic Dexter self-transfer
  flaw:
  <https://research-development.nomadic-labs.com/a-technical-description-of-the-dexter-flaw.html>

The public reports are attack-pattern inputs only. They do not establish that
the TEZEX changes were independently audited.

## Threat model

The review assumes:

- an unauthenticated caller may choose every public parameter, receiver,
  deadline, minimum, amount, and routed output pool;
- a token, LQT, or recipient contract may call back at every external-operation
  boundary, fail, return malformed data, or lie unless exact implementation
  review excludes that behavior;
- operations may be front-run, back-run, sandwiched, split, repeated, or
  reordered across independent transactions;
- direct token transfers may create untracked surplus;
- origination storage and role addresses may be malformed despite the normal
  deployment script;
- a manager may make an operational mistake, but deliberate manager compromise
  is treated as a privileged-control incident rather than an unauthenticated
  pool exploit; and
- arithmetic inputs may exercise zero, dust, rounding boundaries, and very
  large `nat` values.

The pool must preserve accounting or fail atomically. Tezos executes emitted
operations in list order and depth-first; failure of any internal operation
reverts the whole transaction. The review therefore evaluates both the stored
state at each external boundary and the identity that a callback observes as
`SENDER`.

## Required invariants

For each reserve asset:

```text
actual balance >= AMM reserve + accrued protocol liability
```

For every completed swap:

```text
new reserve product >= old reserve product
output > 0
input > 0
```

For liquidity:

```text
pool LQT total = external LQT total_supply
LQT total >= 1,000 after activation
ordinary removal cannot cross the 1,000-unit floor
```

For lifecycle and authority:

```text
inactive or incomplete pool => cannot unpause or claim fees
activation => paused
pending administrative handoff => paused and cannot unpause
manager/recipient change => proposed address must accept
```

For the token-to-token reentrancy guard:

```text
entered = true before the first external operation
all public mutations reject while entered
only a self-call may close
close is the final emitted operation
```

## Historical attack-class mapping

| Attack class | Current treatment |
| --- | --- |
| Dexter user-controlled input owner/self-transfer | Native token input is always debited from `SENDER`; token-to-token also debits `SENDER`. No public owner parameter selects the sold-token source. |
| Callback injection into reserve synchronization | Native synchronization requires a request in progress, the exact token contract as `SENDER`, and for FA2 exactly one response matching both owner and token ID. |
| Reentrancy before staged token-to-token operations finish | Pool state is locked before the first token operation and unlocked only by a final authenticated self-call. Any hostile callback fails and rolls back the full sequence. |
| Output-before-input/flash payout | Token inputs are emitted before outputs. Native routed swaps also take the input token before forwarding XTZ. Atomic rollback covers downstream failure. |
| Full liquidity removal/zero-reserve deadlock | A permanent 1,000-unit LQT floor remains, and both reserves and LQT total must remain positive. |
| Free LQT from rounding | Adds calculate the limiting LQT amount, round required deposits up, and reject zero minted/output amounts. Deterministic enumeration found no add/remove profit. |
| Stale quote/slippage | Every state-changing quote path has a deadline and caller-specified minimum output or maximum input. |
| Unexpected attached XTZ | Token-to-token and LQT mutations are nonpayable. Native non-XTZ entrypoints reject attached XTZ. |
| Protocol-fee reserve leakage | The 5 bp liability is accounted outside the tradable reserve, zeroed before its transfer is emitted, and restored by rollback on failure. |
| Malformed or adversarial token | Exact token code, implementation/control state, and interfaces remain an explicit launch and monitoring requirement; arbitrary tokens are not assumed safe. |

## Findings remediated in this pass

### EPH-01 — linked LQT supply was not proven on-chain

Severity: medium under a malformed/mistaken deployment; not reachable by an
ordinary caller after a correct link.

A pre-minted LQT could give existing holders a claim on subsequently seeded
reserves. Deployment verification detected the mismatch after setup, but the
token-to-token pool did not reject it before accepting reserve assets. Native
linking also depended on later callback verification.

Resolution:

- add the read-only `get_total_supply` LQT view;
- require the expected `%mintOrBurn` and legacy `%getTotalSupply` interfaces;
- validate the synchronous supply when native pools link LQT;
- require zero supply when token-to-token pools link LQT and recheck it
  immediately before initialization; and
- retain the independent post-deployment code/storage verification.

A malicious LQT can lie in a view. Exact LQT source/artifact verification is
therefore still mandatory.

### EPH-02 — malformed origination accounting could survive to activation

Severity: medium for the seed operator under a deliberately malformed
origination; defense in depth for the normal deployment path.

Token-to-token initialization now requires zero reserves, zero fee counters,
and zero pool LQT accounting. Native activation rejects nonzero protocol-fee
liabilities, and native fee claims reject an inactive/incomplete pool. This
prevents phantom initial balances or fees from becoming claims against later
seed deposits.

### EPH-03 — activation and role transitions could remain unpaused

Severity: low; operational fail-open risk.

Native activation now always sets `paused = true`, and neither pool family can
unpause before its readiness invariants hold. Proposing either production role
also pauses the pool immediately; acceptance does not implicitly unpause it.

### EPH-04 — ambiguous asset identities were enforced only by tooling

Severity: low to medium under a nonstandard multi-interface token deployment.

The token-to-token pool now rejects one contract address masquerading as an
FA1.2/FA2 pair, while still allowing distinct FA2 token IDs from the same
contract. Both pool families reject a reserve-token contract reused as LQT.

### EPH-05 — zero/dust native actions could become silent donations

Severity: low.

Native adds, removals, direct swaps, and routed swaps now reject zero inputs and
positive inputs whose integer result rounds to zero. This prevents accidental
value transfer with no LQT or swap output even when a caller supplies a zero
minimum.

## External-operation reasoning

### Token-to-token pool

| Action | Operation order | State visible during callback |
| --- | --- | --- |
| Initialize | input A, input B, locked LQT mint, provider LQT mint, self-close | final initialized accounting, `entered = true`, paused |
| Add | input A, input B, LQT mint, self-close | final reserve/LQT accounting, `entered = true` |
| Remove | LQT burn, output A, output B, self-close | final reserve/LQT accounting, `entered = true` |
| Swap | input token, output token, self-close | final swap/fee accounting, `entered = true` |
| Fee claim | fee transfer, self-close | liability already zero, `entered = true` |

Every callback into the pool before self-close fails on `entered`; downstream
failure rolls back storage and all earlier internal operations.

### Native-XTZ pool

The native pool does not use the storage-wide token-to-token guard. Its input
token source is fixed to the immediate caller, inputs are emitted before routed
outputs, reserve changes are committed before callbacks, and the reviewed
honest-token behavior makes nested calls equivalent to separate sequential
trades. A malicious or mutable token can still invalidate exact-transfer and
callback assumptions. Adding a broad guard would not make such a token safe and
would change established integration behavior; exact token allowlisting and
control monitoring remain the selected boundary.

## Verification evidence

Local verification uses the pinned LIGO image and the lockfile-pinned Node
toolchain. At the time this source record was written:

- token-to-token LIGO suite: 24 passing tests;
- modified native FA2 LIGO suite: 27 passing tests;
- modified native FA1.2 LIGO suite: 81 passing tests;
- LQT LIGO suite: 5 passing tests;
- deployment/tooling suite: 67 passing tests;
- TypeScript type check: passing;
- deterministic arithmetic exploration: 216,000 small swap cases, more than
  500,000 token-to-token add/remove cases, more than 5,000,000 native
  add/remove cases, and 50,000 stateful swap/claim transitions; and
- current production dependency audit: zero known vulnerabilities reported by
  `npm audit --omit=dev`.

Independent second compilations were byte-identical to the checked-in LQT,
token-to-token, modified FA1.2, and modified FA2 Michelson artifacts. The exact
hashes are recorded in the published assessment.

## Residual risk and release conditions

No known critical or high-severity unauthenticated reserve-drain path remained
after these remediations and tests. That statement is bounded by the scope and
assumptions above; it is not proof of impossibility.

Mainnet release should remain blocked until all of the following are true:

1. another reviewer reproduces and reviews the exact source and Michelson;
2. the exact external token implementations, upgrade controls, pause/freeze,
   transfer behavior, token IDs, and current administrators are allowlisted;
3. the exact artifacts complete a fresh network rehearsal through seed,
   activation, role acceptance, invariant verification, fee claim, swap, add,
   remove, pause, and recovery scenarios;
4. final manager and protocol-recipient roles are accepted and independently
   verified while the pools remain paused;
5. external-token control/code monitoring is live; and
6. the public UI/router uses explicit slippage and short deadlines and does not
   present reserve ratios as manipulation-resistant oracle prices.

MEV, sandwiching, arbitrage, token-admin compromise, key compromise, and
economic loss from volatile or depegged assets remain system risks rather than
constant-product accounting exploits.
