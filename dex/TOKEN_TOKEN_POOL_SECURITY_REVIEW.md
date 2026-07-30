# Token-to-token pool security review

Date: 2026-07-30

Scope: `dex/contracts/token_token_pool.mligo`, its compiled artifact, tests, and deployment configuration

Compiler: LIGO 1.11.5

## Summary

The reviewed implementation is a standalone FA2-to-FA2 pool, not a fork of the complete shared QuipuSwap Core V2 system. The reduction removes native-XTZ custody, cross-contract LP synchronization, baker/reward handling, auctions, flash loans, and mutable fee policy.

No known unresolved critical or high-severity issue was identified in this internal review of the scoped implementation. That conclusion is not an independent audit and is not sufficient authorization for mainnet deployment.

## Security decisions

| ID | Risk | Resolution |
| --- | --- | --- |
| TT-01 | A token reports success without crediting the requested input to the pool, allowing unbacked output. | Every inbound transfer is bracketed by authenticated `balance_of` callbacks and must produce the exact pool-balance increase. |
| TT-02 | LP supply and reserve accounting drift across separate pool and LP contracts. | LP accounting is integrated into the pool storage and updated only when verified liquidity actions finalize. |
| TT-03 | An administrator changes fee economics after liquidity is deposited. | The 25 bp LP and 5 bp protocol fees are constants and have no setter. |
| TT-04 | A mistaken one-step administrator update transfers control immediately. | Administrator changes use `propose_admin` and `accept_admin`. |
| TT-05 | A pause disables user exits. | Pause affects initialization, deposits, and swaps; withdrawals and fee claims remain live. |
| TT-06 | The final liquidity provider drains the pool to an unusable zero state. | Initialization permanently locks 1,000 LP units at the pool address, and LP transfers to that address are rejected. |
| TT-07 | Protocol fees are mixed into swap reserves or claimed twice. | Fees have separate per-asset counters, are excluded from reserves, and are decremented only after verified outbound transfers. |
| TT-08 | A token or attacker fabricates callback data. | Callbacks validate pending phase, configured token sender, pool owner, token ID, response cardinality, deadline, and expected pool-balance delta. |
| TT-09 | Unbounded LP batches create unpredictable gas or compiler behavior. | LP transfer/operator/balance calls are bounded to one item and documented as not batch-complete. |

## Invariants reviewed

For each asset, when no deliberate surplus transfer exists:

```text
underlying balance = reserve + accrued protocol fees
```

For a completed swap:

```text
new reserve A * new reserve B >= old reserve A * old reserve B
```

For LP accounting:

```text
total supply = sum of LP ledger balances
total supply >= locked minimum liquidity after initialization
```

For lifecycle safety:

```text
pending = Some(...)  => user-mutating entrypoints reject with POOL_BUSY
pending = None       => no partially finalized accounting action exists
```

The LIGO suite covers initialization, duplicate initialization, both swap directions, fee allocation, invariant-preserving rounding, add/remove liquidity, pause-withdrawal behavior, protocol-fee claims, administrator handoff, unsolicited callbacks, malformed balance deltas, singleton LP transfers, batch rejection, and held-balance solvency.

The LIGO 1.11.5 compiler measures the encoded contract at 18,999 bytes. Independent recompilation produced a byte-identical Michelson artifact with SHA-256 `e80be7e08aed3782c338472d1faa578d73719414f2b80254a10df5c7300f6268`. The Node.js deployment package passes type checking and configuration tests, and its locked production dependency tree reports zero known vulnerabilities under `npm audit --omit=dev` as of this review.

## Residual assumptions and launch blockers

### Reviewed FA2 behavior is mandatory

The callback verifier detects an incorrect pool-balance delta, but no pool can force an arbitrary token contract to execute an operation or report truthfully. On outbound transfers, the pool verifies its exact debit; the token implementation must guarantee the matching recipient credit. Both assets must be non-taxed FA2 implementations allowlisted by exact address and token ID after reviewing their code and administrative controls. A token that omits a callback can strand a pending action.

### No oracle protection

Pool reserves are not an oracle. Integrators must not use spot price as a collateral or liquidation oracle. Routing and UI code must enforce explicit pool allowlists, user deadlines, and minimum output amounts.

### No arbitrary-token recovery

The contract intentionally has no administrator rescue function for the two pool assets. Direct surplus transfers are not part of reserves and can remain locked. Users and deployment tooling must interact only through pool entrypoints.

### LP calls are singleton-only

The LP interface uses FA2-shaped entrypoints but rejects batched calls. Wallet, indexer, and router compatibility must be rehearsed on testnet.

### Independent review required

Before mainnet, commission an independent review of the source and compiled Michelson, reproduce the artifact hash, test the exact selected token contracts, and exercise the complete administrator and fee-recipient operational flow.
