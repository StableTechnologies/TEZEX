# LQT and minimum-liquidity security review

Date: 2026-07-30

Scope: `dex/contracts/lqt_fa12.mligo`, the modified FA1.2/FA2 pool liquidity lifecycle, compiled artifacts, tests, and deployment allocation

Compiler: LIGO 1.11.5

## Reproducible release artifacts

| Artifact | SHA-256 |
| --- | --- |
| `compiled_contracts/lqt.tz` | `2df971245f3d468ee2668e1ed48797852eedd280348c753e9f2cd1d1bdf23921` |
| `compiled_contracts/pool_mod.tz` | `579aef8008e75d58955691709f7d931e923e85e93d49e431b372f57dfc70f7b9` |
| `compiled_contracts/pool_fa2_mod.tz` | `2d746984f22f5676c864fa1a70df04c9e8176f023eea74d86d303f29b5544c2a` |

The contract CI rebuilds these files with the pinned compiler and compares the generated Michelson byte-for-byte with the checked-in release artifacts. Modified pools are compiled with the `DEPLOY` define so their native XTZ receiver is emitted as `%default`. The modified artifact hashes changed when two-step authority handoffs and emergency-pause storage/entrypoints were added; the liquidity-floor behavior reviewed here is unchanged.

## Summary

This remediation completes the remaining liquidity-token lifecycle work for the modified XTZ-to-token pools. Initial LQT supply must exceed 1,000 units. Exactly 1,000 units are assigned to the DEX address at LQT origination, and the modified pool refuses any withdrawal that would reduce total supply below that floor.

The floor preserves a nonzero proportional reserve position after the final ordinary provider exits. It also allows later liquidity additions to use the remaining reserve ratio instead of leaving a zero-reserve contract that cannot safely restart.

## Security decisions

| ID | Risk | Resolution |
| --- | --- | --- |
| LQT-01 | The final provider burns all LQT and leaves an unrecoverable zero-reserve pool. | Modified pools enforce a 1,000-unit minimum, and deployment assigns those units to the DEX address. |
| LQT-02 | A malformed administrative burn reflects a negative total supply through `abs`, increasing or corrupting supply. | Both the target balance and total supply now use checked `is_nat` subtraction and fail on underflow. |
| LQT-03 | XTZ attached to an FA1.2 entrypoint becomes trapped. | Every LQT entrypoint rejects nonzero transferred XTZ. |
| LQT-04 | Deployment announces a locked floor without actually allocating it. | Post-deployment verification reads both the DEX-held locked balance and provider balance from the originated LQT ledger. |
| LQT-05 | Seeds are too small to create both locked and ordinary liquidity. | Deployment fails before origination unless calculated initial LQT is greater than 1,000. |

## Invariants

For an active modified pool:

```text
lqtTotal >= 1,000
actual LQT total_supply = pool lqtTotal
initial DEX LQT balance = 1,000
initial provider LQT balance = total_supply - 1,000
```

After any successful withdrawal:

```text
new lqtTotal >= 1,000
new XTZ reserve > 0
new token reserve > 0
```

## Residual requirements

The LQT administrator must remain the corresponding immutable DEX contract. The exact source and Michelson artifacts still require independent review and testnet lifecycle rehearsal before mainnet deployment. Deployment-specific addresses and roles remain environment or release-manifest values and are not compiled into the contracts.
