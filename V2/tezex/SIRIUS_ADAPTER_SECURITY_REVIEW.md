# Sirius adapter security review

Date: 2026-07-30

Scope: `src/adapters/sirius.ts`, direct-route registration and selection, mainnet configuration, transaction construction, dedicated tests, and the opt-in live no-broadcast rehearsal

Repository baseline: `400eec2`

## Disposition

The remediation makes the TEZEX integration match the immutable Sirius contract's integer arithmetic and fail closed for unsupported or unprotected operations. It is suitable for code review and a no-broadcast mainnet simulation plus test-wallet rehearsal. It is not an authorization to use Sirius as an oracle or to treat the external token as immutable.

Sirius remains an external protocol-designated pool. TEZEX does not deploy, administer, upgrade, or pause that contract. This change hardens the adapter and route boundary; it does not fork or replace the pool.

## Verified contract boundary

The configured mainnet pool was checked through Tezos RPC at block `BM166sLK8j7VDSpoaacSjMfzUz9RwMSs2A1pQ68Mwc1bSDgWbcQ`, level `14,290,950`, under the Ushuaia protocol. Its exposed entrypoints were:

```text
addLiquidity
default
removeLiquidity
tokenToToken
tokenToXtz
xtzToToken
```

The storage shape remained the expected five-field liquidity-baking tuple: token reserve, XTZ reserve, LQT supply, underlying-token address, and LQT address. The production configuration test pins the expected pool, underlying-token, and SIRS addresses and decimals.

The arithmetic order was compared with the published Dexter liquidity-baking Michelson at upstream revision `d98643881fe14996803997f1283e84ebd2067e35`.

## Remediated findings

| ID    | Risk                                                                                                                           | Resolution                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| SA-01 | The adapter delayed two floors until the final result and could overquote by one atomic unit.                                  | XTZ burn and gross XTZ output are floored at the same intermediate steps as Michelson.                                     |
| SA-02 | No test imported or directly exercised `SiriusAdapter`.                                                                        | A dedicated suite covers quotes, boundary rounding, liquidity math, storage caching, operation construction, and failures. |
| SA-03 | Add-liquidity protected maximum token input but submitted the strict quoted SIRS minimum.                                      | The selected slippage tolerance is now applied to `minLqtMinted`, with one final floor.                                    |
| SA-04 | Tiny swaps or deposits could construct operations with zero output or zero minimum SIRS.                                       | Quotes and execution reject non-positive, fractional, or non-finite contract amounts and reject minima that floor to zero. |
| SA-05 | Any non-XTZ input was treated as the configured token, and a malformed Sirius configuration could expose an unsupported route. | The adapter accepts only the configured XTZ/tzBTC pair; registry and UI routing share the same direct-route predicate.     |
| SA-06 | Token-to-XTZ swaps relied only on exact allowance consumption.                                                                 | Approval reset, exact approval, swap, and final cleanup are submitted in one atomic wallet batch.                          |
| SA-07 | `BigNumber.toNumber()` could silently lose integer precision for an unexpectedly large parameter.                              | Every converted contract parameter is checked as a positive integer within JavaScript's exact safe range.                  |

## Enforced invariants

```text
Sirius route = XTZ -> tzBTC or tzBTC -> XTZ
quoted and submitted raw amounts are positive integers
submitted minimum output > 0
submitted minimum SIRS > 0
pool reserves and LQT supply > 0 before division
token approval reset + approval + action + cleanup = one operation group
```

The immutable `tokenToToken` entrypoint is intentionally absent from the adapter. TEZEX does not synthesize a multi-pool route through Sirius. Any future multi-hop feature must construct separately protected direct swaps with an independent minimum output and deadline for every hop.

## Test evidence

The focused test suite covers:

- both swap directions at representative and first-difference rounding boundaries;
- exact add-liquidity, required-deposit, and remove-liquidity floors;
- zero-output, zero-SIRS, invalid-token, and malformed-configuration rejection;
- slippage-adjusted swap, withdrawal, and SIRS minima;
- approval reset and cleanup ordering in a single wallet request;
- propagation of a rejected atomic batch without a second cleanup request;
- cached storage reads and explicit refresh behavior;
- canonical mainnet pool, token, SIRS, and decimal configuration;
- fail-closed runtime checks for the token and SIRS addresses decoded from pool storage; and
- wrong-chain, raw-storage-address, and wallet-operation-destination rejection.

## Final no-broadcast release rehearsal

On 2026-08-06, after rebasing onto `400eec2`, the opt-in rehearsal read the configured contracts through the mainnet RPC at block `BKrd5HFbQMu8xa3qkjEQQEMo6wMzF5vp3y87xyiCZTawjW96k4u`, level `14,387,043`, under the Ushuaia protocol.

The rehearsal first requires the RPC chain ID to match the configured mainnet chain ID. It reads the pool's raw Micheline storage and requires its underlying-token and SIRS addresses to match the configured canonical contracts. The live pool still exposed `xtzToToken`, `tokenToXtz`, `addLiquidity`, and `removeLiquidity`. A capture-only Beacon client then constructed, but could not sign or broadcast:

- the direct XTZ-to-token operation;
- the approval-reset, approval, token-to-XTZ, and cleanup batch;
- the approval-reset, approval, add-liquidity, and cleanup batch; and
- the remove-liquidity operation.

Every captured operation is also required to target the canonical token or pool address in the expected batch position; checking entrypoint names alone is not sufficient.

The rejection path produced one wallet request and no follow-up cleanup request. Reproduce this release gate with:

```sh
RUN_SIRIUS_MAINNET_REHEARSAL=1 npm test -- --watchAll=false --runInBand src/adapters/sirius.rehearsal.test.ts
```

## Residual requirements

- The underlying token remains externally controlled and upgradeable; pause, upgrade, ownership, issuance, and bridge events require monitoring and an operational response.
- The reserve ratio is a manipulable AMM spot price and must not be used for lending, collateral, minting, or liquidation decisions.
- The immutable `tokenToToken` entrypoint remains unsupported because its legacy mutez arithmetic can overflow at realistic reserves.
- Subsidy state and yield claims must be sourced from current protocol state rather than assumed from historical Liquidity Baking behavior.
- Before release, exercise both direct swaps, add/remove liquidity, wallet rejection, and allowance cleanup with no-broadcast simulation or a controlled test wallet, then independently review the final diff.
