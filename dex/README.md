# Dexter v2 DEX

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
  - `get_fee_bp`: Get fee in basis points (30 = 0.3%)
  - `is_active`: Check whether a modified pool has completed verified initialization
  - `quote_tez_to_token`: Calculate XTZ → Token swap output
  - `quote_token_to_tez`: Calculate Token → XTZ swap output

Modified pools originate inactive. Their manager must seed both reserves, link
the LQT contract, synchronize the token balance, and call `activate` with the
expected XTZ, token, and LQT totals. Activation also verifies the actual LQT
total supply. Swap and liquidity entrypoints remain unavailable until all
checks pass.

### Liquidity Token (lqt_fa12.mligo)
- FA1.2 compliant token
- Minted when liquidity is added
- Burned when liquidity is removed
- Represents proportional ownership of the pool

## Prerequisites

- **Node.js** v18 or higher (v20.16.0 was used/tested during development)
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
This amount will be minted to **MANAGER** address (see .env.example)
Consider burning some initial liquidity (sending to a null address) to ensure the pool is never fully depleted.


This will:
1. Check deployer's XTZ and token balance
2. Deploy DEX contract
3. Deploy LQT contract (with DEX as admin)
4. In one atomic operation group, link the LQT address, fund both reserves,
   synchronize the token pool, and activate a modified pool
5. Verify the resulting on-chain addresses, reserves, balances, LQT supply, and
   activation state
6. Save the exact integer configuration and initialization operation hash to
   `deployments/testnet-latest.json`

`MANAGER` must match the account identified by the deployment private key.

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
