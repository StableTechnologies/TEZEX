# Dexter v2 Report

> Historical build report for an earlier base-artifact snapshot. Its hashes and
> sizes are not release pins. Use the byte-reproduced hashes in the current
> security reviews and release manifests for modified or token-to-token pools.

## Build Information

### System Information
- **OS**: Linux 6.6.87.2-microsoft-standard-WSL2 x86_64
- **Compiler**: LIGO v1.11.5 (commit hash: 3d6bdc9a1500897750b8fba453eb2ceba5d665c3)

## Artifacts

### DEX Contract (pool.tz)
- **File**: `compiled_contracts/pool.tz`
- **Size**: 5510 bytes
- **SHA-256**: `474d3d9e42965f214ead9cdffd48b41ab0e6980f4248d120417b2b1126a3f964`

### LQT Contract (lqt.tz)
- **File**: `compiled_contracts/lqt.tz`
- **Size**: 1543 bytes
- **SHA-256**: `0bd24a77b23eb368777147a4622534c7d00e2e8cabe22393ceae4182527312bd`

## Entrypoints

### DEX Contract (pool.tz)

**User Operations:**
- `addLiquidity`
- `removeLiquidity`
- `xtzToToken`
- `tokenToXtz`
- `tokenToToken`
- `default`
- `updateTokenPool`

**Admin Operations:**
- `setLqtAddress`
- `setBaker`
- `setManager`

**Views (Read-Only):**
- `get_reserves`
- `get_lqt_total`
- `get_fee_bp`
- `quote_tez_to_token`
- `quote_token_to_tez`

### LQT Contract (lqt.tz)

**User Operations:**
- `transfer`
- `approve`
- `getAllowance`
- `getBalance`
- `getTotalSupply`

**Admin Operations:**
- `mintOrBurn`

## Changes from Original Dexter v2

### Added Features
-  **5 Read-only Views** for on-chain quotes and pool state
  - `get_reserves()` - Returns (tez_pool, token_pool)
  - `get_lqt_total()` - Returns total LQT supply
  - `get_fee_bp()` - Returns fee in basis points (30 = 0.3%)
  - `quote_tez_to_token(nat)` - Calculate XTZ → Token output
  - `quote_token_to_tez(nat)` - Calculate Token → XTZ output

### Modifications
- **Updated to LIGO v1.11.5** from original version built from 4d10d07ca05abe0f8a5fb97d15267bf5d339d9f4 (pre v0.10.0)
- **Test.Next API** migration for all tests
- **Preprocessor directives** for test/deploy environments

### No Changes
- Core AMM logic unchanged
- Fee structure unchanged (0.3%)
- Security model unchanged
- All original entrypoints preserved

## Diff Summary

**Total Changes:**
- **Added**: 5 view functions
- **Modified**: LIGO syntax updates for v1.11.5 compatibility
- **Removed**: None
- **Security Impact**: None (views are read-only)


## Test Suites

**Total Tests**: 2258

**Status**: All Passed


**Key Test Results:**
**Quote Equivalence Tests**
- `quote_tez_to_token` matches actual swap output (diff = 0)
- `quote_token_to_tez` matches actual swap output (diff = 0)

**Edge Case Tests**
- Zero input handling: Passed
- Tiny inputs (< 0.001 tez): Passed
- Large inputs (95% of pool): Passed
- Massive inputs (> 1000x pool): Passed
- Empty pool operations: Passed

**View Purity Tests**
- All 5 views verified as read-only
- Storage hash unchanged after view calls
- Views after swaps: No storage mutation


### Token to XTZ Accuracy Suite (`token_to_xtz_accuracy.test.mligo`)

**Total Test Cases**: 1100

**Status**: All Passed

**Test Coverage:**
- Different Pool sizes
- Various pool ratios
- Edge cases (tiny swaps, large swaps)

**Results:**
- Quote accuracy: 100% match with actual swaps
- Maximum deviation: 0 mutez
- Average deviation: 0 mutez

### XTZ to Token Accuracy Suite (`xtz_to_token_accuracy.test.mligo`)

**Total Test Cases**: 1100

**Status**: All Passed

**Test Coverage:**
- Different Pool sizes
- Various pool ratios
- Edge cases (tiny swaps, large swaps)

**Results:**
- Quote accuracy: 100% match with actual swaps
- Maximum deviation: 0 mutez
- Average deviation: 0 mutez
