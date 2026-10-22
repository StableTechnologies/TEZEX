# TEZEX adversarial AMM testing

## Purpose

This suite turns concrete incidents into reusable economic attack oracles. It
does not only check that expected calls succeed. It asks whether an adversarial
coalition can compose otherwise-valid calls to finish with an unearned reserve
claim, dilute existing LP shares, create unbacked protocol fees, or desynchronize
the pool and LP-token ledgers.

The October 2026 legacy QuipuSwap XTZ/tzBTC activity is the first exact fixture.
That contract minted LP shares using floor division and also charged the
share-priced token contribution using floor division. Repeating a small add 90
times and burning the aggregate LP position extracted token atomic units. The
TEZEX rule is deliberately asymmetric:

- mint LP shares down;
- charge every reserve contribution up;
- pay every reserve withdrawal down.

Changing the LP token standard would not repair incorrect pool arithmetic. The
tests therefore cover the pool and LP authority/supply relationship separately.

## Permanent attack oracles

| Attack family | Required property | Coverage |
| --- | --- | --- |
| Repeated micro-liquidity | A closed add/remove coalition cannot reduce either reserve | Exact historical state and 90-call fixture for both pool models |
| Wrong rounding direction | Known floor-charge, ceil-mint, and ceil-withdraw mutations must exhibit counterexamples | Mutation-killing negative controls |
| LP dilution | Reserve-per-share cannot decrease on a liquidity add or removal | 100,000 deterministic cases, including values above 128 bits |
| Batched and Sybil execution | Splitting actions across calls or addresses must not turn rounding into a coalition drain | Stateful 500-step sequences over 200 seeds per pool model |
| Donation/inflation | Voluntary donations and reserve synchronization cannot be recovered in excess by the donating coalition; zero-share deposits fail | Stateful donation sequences plus contract zero-output tests |
| Swap rounding and fee thresholds | Constant product cannot decrease and splitting an order cannot improve aggregate output | Exhaustive small-state tests and 100,000 large/boundary cases |
| Fee/reserve double counting | Actual holdings must equal or exceed LP reserves plus separately claimable protocol fees | 100,000 mixed swap, liquidity, and claim transitions |
| Fragmented withdrawal | Repeated burns cannot pay more than one combined proportional claim | Floor-withdraw properties and an explicit ceil-withdraw mutant |
| Initialization capture | Seed supply must use integer square root, permanently lock 1,000 LQT, and reject dirty or pre-minted state | LIGO lifecycle tests and invariant verifier |
| LP authority/supply drift | Only the pool may mint/burn and pool supply must equal token supply | LQT contract tests and live invariant verifier |
| Reentrancy and hostile callbacks | Nested token callbacks must roll back, and self-only callbacks must not be forgeable | Token/token hostile-token LIGO tests and native balance-callback tests |
| External token mutation | Reviewed code and mutable implementation cells must remain pinned | Deployment gates and the external-token monitor |

## Security invariants

For reserves `R_a`, `R_b` and LP supply `S`, every liquidity-only transition
must preserve both cross-multiplied claims:

```text
R_a_after * S_before >= R_a_before * S_after
R_b_after * S_before >= R_b_before * S_after
```

Cross multiplication avoids floating-point approximations. It proves that an
add or removal cannot dilute the value of an existing LP share in either asset.

When an adversarial coalition begins and ends with zero newly acquired LP
shares, the final reserves must each be at least their initial value. This is
stronger than checking one address: transferring LP tokens among Sybil accounts
does not change the coalition result.

For swaps and protocol-fee claims, the suite independently requires:

```text
reserve_a * reserve_b never decreases on a swap
held_a == reserve_a + protocol_fee_a
held_b == reserve_b + protocol_fee_b
```

Direct token donations may make `held` greater than liabilities. A deficit is
never acceptable.

## Test layers

1. `dex/tests/*.test.mligo` executes the actual LIGO entrypoints, internal
   operations, callbacks, token transfers, LP mint/burn calls, and rollback
   behavior. Both FA1.2 and FA2 native-pool builds contain the incident-derived
   atomic-unit regression; the token/token contract contains its corresponding
   regression.
2. `dex/scripts/src/amm-invariants.test.ts` exhaustively checks compact state
   spaces.
3. `dex/scripts/src/adversarial-amm.test.ts` performs exact incident replay,
   mutation checks, high-magnitude deterministic generation, and long mixed
   state-machine sequences.
4. `verify:pool-invariants` checks deployed code identity, reserve solvency,
   lifecycle state, role handoffs, the permanent LQT lock, and pool/LQT supply
   equality.
5. `monitor:token` detects external token code/implementation or administrative
   changes that could invalidate the exact-transfer assumption after launch.

All generated tests are deterministic. A failure reports a reproducible test
name and seed instead of a transient random failure.

## Residual assumptions and separate risks

- USDt and tzBTC must continue to execute exact transfers. A fee-on-transfer,
  rebasing, malicious, or upgraded token can violate pool accounting even when
  AMM arithmetic is correct. Code and implementation monitoring is therefore a
  launch and operational requirement, not optional observability.
- A spot price from any AMM can be manipulated within a transaction. Consumers
  must not treat a TEZEX spot quote as a manipulation-resistant oracle.
- Sandwiching, arbitrage, and price movement are market/MEV behavior unless
  they violate a stated reserve, fee, LP-supply, or slippage invariant.
- Deterministic fuzzing and repository self-review reduce exploit-discovery
  risk but do not replace an independent audit, formal verification, or a
  monitored incident-response process for high TVL.

## Adding future incidents

For each credible incident:

1. capture the pre-state, exact call sequence, internal transfers, and final
   state;
2. reproduce the vulnerable result as a negative-control mutation;
3. replay the same sequence against every TEZEX pool model;
4. derive the broader invariant that the incident violated;
5. add stateful and boundary generation around that invariant;
6. retain the fixture permanently in CI.

