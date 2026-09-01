# External token integration runbook

This runbook applies to every production token integrated with a native-XTZ
pool. The deployment manifest is the source of truth for the token contract,
token ID, script-code hash, control profile, mutable implementation fingerprint
where applicable, integration owner, and incident channel. No
production address is compiled into the pool.

## Monitoring gate

Before unpausing a new pool, the integration owner must configure an indexed
alert for every operation targeting the token contract and classify at least:

- pause or unpause actions;
- administrator, issuer, or upgrade-authority changes;
- contract migration or script-code changes;
- account freeze, revoke, blacklist, or seizure actions;
- mint, burn, or issuance-policy changes; and
- transfer failures or balance responses that no longer match the reviewed
  FA1.2/FA2 interface.

The alert destination must be the `TOKEN_INCIDENT_CHANNEL` recorded in the
release manifest. The monitor must also compare the current token script-code
hash with the manifest pin at least once per monitoring interval. Exact proxy
profiles must also compare every reviewed implementation/control selector at a
common confirmed block and treat any unknown successful entrypoint as critical.
Missing indexer data, RPC disagreement, a code-hash mismatch, or a mutable
fingerprint mismatch is itself an alert.

## Response

The named `TOKEN_INTEGRATION_OWNER` is incident commander until explicitly
handed off. On a relevant alert:

1. Pause the pool, which blocks swaps, deposits, liquidity additions, reserve
   synchronization, and routed swaps while leaving liquidity removal and fee
   claims available when the token still permits transfers.
2. Record the triggering operation, block, observed code hash, implementation
   fingerprint, token control
   state, and pool storage in the incident channel.
3. Determine whether token transfers and balance callbacks remain correct. Do
   not resynchronize reserves or unpause while behavior is uncertain.
4. Re-run deployment code-hash and interface checks against two independent
   RPC/indexer sources.
5. Escalate freezes, revocations, unexpected issuance, or upgrades to the
   production multisig signers and token administrator.

## Recovery gate

Unpausing requires a documented decision from the integration owner and the
production manager multisig. The decision must cite the reviewed token address,
token ID, current script-code hash and implementation fingerprint, resolved alert, successful transfer/balance
rehearsal, pool reserve reconciliation, and withdrawal test. A changed token
implementation requires a new integration review rather than an alert closure.
