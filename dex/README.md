# Dexter v2 DEX

## Token-to-token pool

The generic FA1.2/FA2 single-pair review candidate is documented in [TOKEN_TOKEN_POOL.md](./TOKEN_TOKEN_POOL.md). Its internal security assessment and residual launch gates are in [TOKEN_TOKEN_POOL_SECURITY_REVIEW.md](./TOKEN_TOKEN_POOL_SECURITY_REVIEW.md), with upstream lineage and design differences recorded in [TOKEN_TOKEN_POOL_PROVENANCE.md](./TOKEN_TOKEN_POOL_PROVENANCE.md).

This pool is separate from the native-XTZ Dexter contracts described below. It uses the repository's external FA1.2 LQT, immutable 25 bp LP and 5 bp protocol fees, and contains no hardcoded asset, manager, or fee-recipient address. Its Mainnet deployment path is explicit and fail-closed; exact pair selection and release parameters remain external review inputs.

Decentralized Exchange (DEX) implementation for Tezos blockchain based on Dexter v2 contracts updated to latest Ligo v1.11.5

## Project Structure

```
.
├── contracts/              # LIGO smart contracts
│   ├── dexter.mligo       # Main DEX contract
│   └── lqt_fa12.mligo     # Liquidity token 
├── compiled_contracts/     # Compiled Michelson contracts
│   ├── pool.tz            # Compiled DEX contract for working with FA1.2
│   └── lqt.tz             # Compiled LQT contract
├── tests/                 # Test files
│   ├── dexter_v2.test.mligo
|   ├── token_to_xtz_accuracy.test.mligo # Tests for View (quote_token_to_tez) accuracy (1000+ test cases)
|   ├── util.mligo         # Test utils
|   └── xtz_to_token_accuracy.test.mligo # Tests for View (quote_tez_to_token) accuracy (1000+ test cases)
├── scripts/               # Deployment and utility scripts
│   └── src/
│       ├── deploy.ts      # Main deployment script
│       ├── config.ts      # Deployment configuration
│       └── types.ts       # TypeScript type definitions
├── .env.example           # Environment variables template
```

## Features

### DEX Contract (dexter.mligo)
- **Add Liquidity**: Deposit XTZ and tokens to the pool
- **Remove Liquidity**: Withdraw your share from the pool
- **XTZ to Token**: Swap XTZ for tokens
- **Token to XTZ**: Swap tokens for XTZ
- **Token to Token**: Multi-hop swap through XTZ
- **Views**: On-chain views for quotes and pool state
  - `get_reserves`: Get current pool reserves
  - `get_lqt_total`: Get total liquidity tokens
  - `get_fee_bp`: Get the immutable LP, protocol, and total fees in basis points
    `(25, 5, 30)`
  - `is_active`: Check whether a modified pool has completed verified initialization
  - `is_paused`: Check whether risk-increasing operations are suspended
  - `quote_tez_to_token`: Calculate XTZ → Token swap output
  - `quote_token_to_tez`: Calculate Token → XTZ swap output

Modified pools originate inactive. Their manager must seed both reserves, link
the LQT contract, synchronize the token balance, and call `activate` with the
expected XTZ and LQT totals and the minimum configured token seed. Tokens sent
directly to the inactive pool before initialization are treated as an LP
donation and cannot block activation. Activation also verifies the actual LQT
total supply. Swap and liquidity entrypoints remain unavailable until all checks
pass.

Modified pools originate paused. Swaps, deposits, liquidity additions, reserve
synchronization, and routed swaps remain blocked while paused; liquidity
removal and protocol-fee claims remain available. Manager and protocol-fee
recipient changes are two-step, cancellable handoffs that the proposed address
must accept. A pool cannot be unpaused while either handoff is pending.

### Modified-pool fee decision

The authoritative model is **30 bp total: 25 bp to LPs and 5 bp to the
protocol**. Both swap directions price the gross input with the `997 / 1000`
constant-product factor and round the output down using Michelson integer
division. The protocol liability is `floor(gross input * 5 / 10,000)` and is
excluded from the recorded trading reserve; the balance remains in contract
custody until the configured recipient claims it. The remainder of the 30 bp
charge stays in the trading reserve for LPs. There is no fee-setting entrypoint,
and the `get_fee_bp` view reports `(25, 5, 30)`.

### Liquidity Token (lqt_fa12.mligo)
- FA1.2 compliant token
- Minted when liquidity is added
- Burned when liquidity is removed
- Represents proportional ownership of the pool
- Rejects attached XTZ and fails closed if a burn would underflow total supply
- Modified pools enforce an immutable 1,000-unit permanent liquidity floor

## Prerequisites

- **Node.js** v22 or higher
- **LIGO** compiler v1.11.5 (for contract development)
- **Tezos account** with funds (for deployment)

## Installation

Navigate to scripts directory:
```bash
cd ./scripts/
```

Install dependencies:
```bash 
npm install
```

## Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` with your settings (parameters and their description are described in .env.example)

## Deployment

### 1. Compile Contracts

```bash
# Compile DEX contract
ligo compile contract ./contracts/dexter.mligo -o ./compiled_contracts/pool.tz -D DEPLOY --no-warn

# Compile DEX contract with underlying FA2
ligo compile contract contracts/dexter.mligo -o ./compiled_contracts/pool_fa2.tz -D DEPLOY,FA2 --no-warn

# Compile modified DEX contracts
ligo compile contract ./contracts/dexter_mod.mligo -o ./compiled_contracts/pool_mod.tz -D DEPLOY --no-warn
ligo compile contract ./contracts/dexter_mod.mligo -o ./compiled_contracts/pool_fa2_mod.tz -D DEPLOY,FA2 --no-warn

# Compile LQT contract
ligo compile contract ./contracts/lqt_fa12.mligo -o ./compiled_contracts/lqt.tz --no-warn
```

### 2. Deploy to Testnet

```bash
npm run deploy:testnet
```

**NOTE:** the initial LQT amount is calculated with arbitrary-precision integer
math using the following formula, rounded down:

```
lqt = sqrt(xtz_seed * token_seed)
``` 
For every deployment, 1,000 LQT units are assigned to the DEX address and are
permanently excluded from ordinary withdrawals. The remainder is assigned to
the final **MANAGER** address (see `.env.example`). Initial LQT must therefore
exceed 1,000 units. Modified pools also enforce the floor in `removeLiquidity`
and expose it through `get_minimum_lqt`.


This will:
1. Check deployer's XTZ and token balance
2. Deploy DEX contract
3. Deploy LQT contract (with DEX as admin)
4. In one simulated-then-injected atomic operation group, link the LQT address,
   fund both reserves, synchronize the token pool, activate a modified pool,
   and propose the configured production manager and fee recipient
5. Verify the resulting on-chain addresses, reserves, balances, LQT supply,
   permanent locked balance, provider balance, and activation state
6. Atomically journal every operation hash and originated address so an
   interrupted run resumes without reinjection
7. Save a release manifest containing the source commit, pinned compiler,
   artifact and on-chain code hashes, exact parameters, roles, thresholds,
   addresses, and operation hashes

For modified pools, the total swap fee is immutable: 25 bp remains with LPs and
5 bp is accumulated for the protocol fee recipient. The deployment signer is
the temporary manager and recipient during the inactive initialization window.
The production roles must explicitly accept their handoffs while the pool
remains paused. Mainnet preflight requires originated multisig addresses and
verifies their code hashes, thresholds, and complete owner sets on chain. It
also requires exact artifact hashes, the token script-code hash, the permanent
Mainnet chain ID, at least two confirmations, a clean Git tree, and an explicit
`EXPECTED_SOURCE_COMMIT` matching `HEAD`.
The signer can be a local key or a remote/HSM-backed signer.
External token control monitoring and incident gates are defined in
[EXTERNAL_TOKEN_OPERATIONAL_RUNBOOK.md](./EXTERNAL_TOKEN_OPERATIONAL_RUNBOOK.md).
For storage-upgradeable token proxies, an exact control profile also requires a
reviewed mutable implementation fingerprint; the deployer checks it again at
the launch head instead of relying on the outer script-code hash alone.

After both production roles accept, verify and record the completed handoff
**before the final manager unpauses**. This paused gate rechecks the seed reserves against
the pool's real XTZ/token balances and confirms the LQT total supply, permanent
locked balance, and seed-provider allocation were unchanged while the pool was
paused:

```bash
DEX_DEPLOYMENT_STATE=deployments/mainnet-in-progress.json npm run verify:handoff
```

Only after that succeeds should the final manager unpause. Immediately verify
the live launch state; this check tolerates legitimate swaps and liquidity
changes but enforces reserve/fee solvency, exact roles, lifecycle flags, no
unexpected delegate, pool/LQT supply equality, the permanent LQT lock,
metadata pointers, and reviewed pool/LQT/token code hashes:

```bash
POOL_INVARIANT_KIND=native POOL_EXPECTED_PAUSED=false \
DEX_DEPLOYMENT_STATE=deployments/mainnet-in-progress.json \
npm run verify:pool-invariants
```

For tokens whose balances cannot be read directly from their storage layout,
set `DEPLOYMENT_VERIFY_TZKT_API` to the matching network's TzKT API endpoint.
The verifier prefers a direct RPC storage read and uses that indexer only as a
fallback.

The configured token seed is a minimum for modified-pool activation. Any tokens
transferred directly to the pool before its initialization batch are included
in `tokenPool` and benefit LPs rather than forcing the deployment to restart.

### 3. Deploy to Mainnet

```bash
npm run deploy:mainnet
```

## Testing

Run LIGO tests:

```bash
ligo run test ./path/to/test --no-warn
```

For example: 
```bash
ligo run test ./tests/dexter_v2.test.mligo --no-warn
```
