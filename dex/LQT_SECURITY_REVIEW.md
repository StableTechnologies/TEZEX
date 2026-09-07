# LQT and minimum-liquidity security review

Date: 2026-09-03

Scope: `dex/contracts/lqt_fa12.mligo`, the modified FA1.2/FA2 pool liquidity lifecycle, compiled artifacts, tests, and deployment allocation

Compiler: LIGO 1.11.5

## Reproducible release artifacts

| Artifact | SHA-256 |
| --- | --- |
| `compiled_contracts/lqt.tz` | `617f0e402948e24110790288c55998d2319d5da9694e01a966e077f20f988f25` |
| `compiled_contracts/pool_mod.tz` | `db6a15ce85437330f36750858cc7d75832e3d6c4af929c72884a344b1f96fbe6` |
| `compiled_contracts/pool_fa2_mod.tz` | `589edf545be6ebbfd26b97c08a840c8110c2457d8da6958418c7f116f864a0bc` |

The contract CI rebuilds these files with the pinned compiler and compares the generated Michelson byte-for-byte with the checked-in release artifacts. Modified pools are compiled with the `DEPLOY` define so their native XTZ receiver is emitted as `%default`. The 2026-09-03 hashes include synchronous LQT-supply verification, fail-paused activation and handoffs, inactive-claim rejection, asset-identity checks, and zero/dust rejection. The 1,000-unit floor remains unchanged.

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
| LQT-06 | A pre-minted or substituted LQT creates reserve claims that were not issued by the pool. | LQT exposes a synchronous total-supply view. Native pools verify the configured supply when linking, and token-to-token pools require zero supply both when linking and immediately before seeding. Exact artifact verification remains mandatory because an arbitrary contract can lie in a view. |

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
