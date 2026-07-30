# Token-to-token pool

This directory contains an asset-agnostic, single-pair FA2-to-FA2 constant-product pool intended for independent review and testnet deployment. It is deliberately smaller than a shared multi-pair DEX core.

Mainnet deployment remains conditional on an independent contract review, exact token-code allowlisting, and a complete testnet rehearsal.

## Design

Each deployment serves exactly two immutable FA2 assets. The token contracts and token IDs are origination parameters; no asset address, administrator address, or fee-recipient address is compiled into the source or Michelson artifact.

The contract includes:

- constant-product swaps in both directions;
- proportional liquidity deposits and withdrawals;
- an integrated LP ledger, so pool reserves and LP supply cannot drift across separate contracts;
- permanently locked minimum liquidity of 1,000 LP units;
- exact before-and-after pool-balance verification for every underlying-token transfer;
- immutable 25-basis-point LP and 5-basis-point protocol fees;
- separate protocol-fee accounting outside tradable reserves;
- a pause control that stops initialization, deposits, and swaps but never withdrawals or fee claims;
- a two-step administrator handoff; and
- an immutable protocol-fee recipient selected at origination.

It intentionally excludes native XTZ handling, baker voting, reward buckets, auctions, buybacks, referrals, flash loans, multi-pair shared custody, and an oracle. Removing these systems avoids giving an asset-pair pool unrelated custody and governance responsibilities.

## Swap economics

For input `x`, input reserve `Rin`, and output reserve `Rout`:

```text
effective = x * 9,970
output    = effective * Rout / (Rin * 10,000 + effective)
```

The output calculation charges 30 basis points. Five basis points of the gross input, rounded down, accrue to the protocol fee balance. The rest of the input enters the reserve, which leaves the 25-basis-point LP portion in the pool. Integer rounding is always in the pool's favor, and the test suite checks that the reserve product does not decrease.

## Verified transfers and token requirements

Every pool action is a short callback state machine:

1. Read the pool's underlying-token balance.
2. Execute one FA2 transfer.
3. Read the balance again.
4. Require the exact expected delta before advancing.

An inbound token that credits the pool less than requested, or an outbound token that debits the pool by the wrong amount, causes the complete Tezos operation to fail. Callback entrypoints authenticate the configured token contract, requested pool owner, token ID, pending phase, and deadline.

The pool must only be deployed against immutable, reviewed FA2 implementations that reliably execute `balance_of` callbacks and standard, non-taxed `transfer` operations. The pool verifies its own debit on an outbound transfer; the reviewed token implementation must guarantee that the same amount is credited to the requested recipient. A token that deliberately omits a requested callback can strand an in-progress action. These are deployment preconditions, not properties another contract can prove about arbitrary future token behavior. Pin and independently verify both token contracts and token IDs before origination.

## LP interface limitation

The integrated LP token exposes FA2-shaped `transfer`, `update_operators`, and `balance_of` entrypoints, but each call accepts exactly one item/request. Consumers must split batches into separate operations. This bound avoids unbounded gas and a LIGO 1.11.5 stack-join compiler defect reproduced by the repository's older batched FA2 helper.

Do not advertise the LP interface as batch-complete FA2.

## Build and test

Use LIGO 1.11.5:

```sh
ligo compile contract dex/contracts/token_token_pool.mligo \
  -m TokenTokenPool \
  --no-warn \
  -o dex/compiled_contracts/token_token_pool.tz

ligo run test dex/tests/token_token_pool.test.mligo --no-warn
```

The checked-in Michelson artifact must have SHA-256:

```text
e80be7e08aed3782c338472d1faa578d73719414f2b80254a10df5c7300f6268
```

Recompile and compare the hash before deploying.

## Deployment

From `dex/scripts`:

```sh
npm ci
npm run typecheck
npm run test:token-token-config
npm run deploy:token-token:testnet
```

The deployment package requires Node.js 22 or newer. Its locked production dependency tree reports zero known vulnerabilities under `npm audit --omit=dev` as of this review.

The deployment script:

1. validates that the two asset descriptors differ and that seed amounts exceed the locked minimum;
2. verifies both token contracts expose `transfer`, `balance_of`, and `update_operators`;
3. originates the pool with the deployer as temporary administrator;
4. authorizes the pool as operator for each seed asset;
5. initializes and balance-verifies both reserves;
6. proposes the configured final administrator; and
7. writes a local, gitignored deployment receipt.

The proposed administrator must call `accept_admin`. Verify that acceptance on-chain before considering the handoff complete. The fee recipient is final at origination and is not mutable.

Configuration values are documented in `dex/scripts/.env.example`. Private keys, token addresses, administrator addresses, deployment receipts, and live metadata locations belong in the deployment environment, not in commits.

Mainnet origination also requires the explicit environment confirmation documented in that example. This guard is separate from, and does not replace, the launch gates below.

## Provenance

The architecture and constant-product conventions were informed by QuipuSwap Core V2, pinned for review at upstream commit `684f17d42293034764fd2ff70ce1075b912406da` from `madfish-solutions/quipuswap-core-v2`. That upstream package declares the MIT license in `package.json` but contains no license file at the pinned commit.

This implementation is a reduced CameLIGO reimplementation. It does not vendor the upstream shared core, bucket, auction, baker registry, flash proxy, deployment scripts, or JavaScript dependency tree.

## Launch gates

- Independent smart-contract review completed.
- Exact compiled artifact hash reviewed and reproduced.
- Token contract addresses, token IDs, code, administrator controls, pause behavior, and callback behavior allowlisted.
- Testnet initialization, both swap directions, deposits, withdrawals, fee claims, pause behavior, and administrator acceptance rehearsed.
- Final administrator acceptance confirmed on-chain.
- Fee recipient confirmed on-chain.
- UI/router uses explicit pool allowlisting, independent deadlines and minimum outputs, and fails closed for unknown routes.
- Monitoring checks held balances against `reserve + protocol_fees` for both assets.
