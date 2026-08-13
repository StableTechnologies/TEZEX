# Token-to-token pool provenance and design delta

The implementation was informed by two public QuipuSwap code lines pinned for stable review references:

- TTDex commit `41fd4293029e2094a564141fb389fd9a1ef19185`.
- QuipuSwap Core V2 commit `684f17d42293034764fd2ff70ce1075b912406da`.

The TEZEX contract is a standalone CameLIGO implementation, not a deployment of either full upstream system. It does not claim to inherit an upstream audit. Public audit material does not, by itself, establish which exact commit was reviewed or cover the changes below.

## Retained concepts

- one constant-product pair per pool deployment;
- two-direction token swaps;
- proportional liquidity mint/burn;
- token-standard-specific transfer wrappers;
- permanently locked minimum liquidity; and
- external liquidity-token administration by the pool.

## Material TEZEX changes

| Area | TEZEX decision |
| --- | --- |
| Asset support | One artifact accepts immutable FA1.2 or FA2 descriptors in any pair combination. |
| Fees | Fixed 25 bp LP plus 5 bp protocol accounting, with no fee setter. |
| Protocol fees | Separate per-asset counters and a two-step recipient handoff. |
| Lifecycle | Inactive origination, one-time external-LQT link, and one-time manager initialization. |
| Reentrancy | Explicit action guard closed only by a self-call after external operations. |
| Administration | Pause that preserves exits; two-step/cancelable manager and recipient changes. |
| Scope | No native tez, baker/reward system, auctions, referrals, flash loans, oracle, router, shared multi-pair custody, or reserve-sync/rescue authority. |
| Deployment | Exact chain/artifact/token code pinning, resumable receipts, atomic seed authorization cleanup, post-deployment verification, and no mainnet mode. |

Reviewers should assess the TEZEX source and compiled artifact on their own merits. The pinned upstream references are architectural context and comparison anchors, not a substitute for reviewing this implementation.
