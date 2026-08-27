# External token control monitor

`scripts/src/monitor-token-controls.ts` is a generic, read-only release-safety
monitor for an FA1.2 or FA2 integration. It contains no production token,
manager, fee-recipient, or alert-destination address.

Each invocation:

1. reads the token script from at least two independent RPC origins;
2. verifies the configured chain ID and reviewed canonical script-code hash;
3. rejects RPC code/chain disagreement or excessive head-level skew;
4. requires a synchronized, recent TzKT indexer on the same chain;
5. scans every confirmed transaction targeting the token since the last
   completed checkpoint;
6. classifies pause, authority, upgrade, freeze/revoke/seizure, issuance, and
   failed transfer/balance operations;
7. writes a structured report to stdout and optionally a generic JSON webhook;
8. anchors the completed range to its independently agreed block hash; and
9. advances a mode-0600 checkpoint only after webhook delivery succeeds.

Ordinary successful transfers and balance queries are counted but do not
create alerts. A source outage, stale indexer, wrong chain, RPC disagreement,
or code-hash mismatch is a critical alert and prevents checkpoint advancement.

## Configuration

From `dex/scripts`, configure these runtime values outside source control:

```sh
TOKEN_MONITOR_ADDRESS=<reviewed KT1 token contract>
TOKEN_MONITOR_TOKEN_ID=<FA2 token ID, or 0 for FA1.2>
TOKEN_MONITOR_CODE_SHA256=<reviewed canonical code hash>
TOKEN_MONITOR_CHAIN_ID=<expected Tezos chain ID>
TOKEN_MONITOR_RPC_URLS=https://rpc-one.example,https://rpc-two.example
TOKEN_MONITOR_TZKT_API=https://api.example
TOKEN_MONITOR_START_LEVEL=<deployment or approved baseline level>
TOKEN_INTEGRATION_OWNER=<accountable operational owner>
TOKEN_INCIDENT_CHANNEL=<operational owner/channel label>
npm run monitor:token
```

The two RPC URLs must use distinct HTTPS origins. Optional runtime controls are:

```sh
TOKEN_MONITOR_TZKT_API_KEY=<paid-indexer header credential>
TOKEN_MONITOR_CONFIRMATIONS=2
TOKEN_MONITOR_MAX_RPC_LEVEL_SKEW=2
TOKEN_MONITOR_MAX_INDEXER_LAG=3
TOKEN_MONITOR_MAX_INDEXER_AGE_SECONDS=180
TOKEN_MONITOR_REQUEST_TIMEOUT_MS=15000
TOKEN_MONITOR_PAGE_SIZE=500
TOKEN_MONITOR_CHECKPOINT=<mode-0600 state path>
TOKEN_MONITOR_ALERT_WEBHOOK_URL=<generic HTTPS JSON endpoint>
TOKEN_MONITOR_ALERT_WEBHOOK_BEARER=<optional authorization bearer>
```

The first run begins at `TOKEN_MONITOR_START_LEVEL`; it does not silently skip
history. Changing the token address, token ID, expected chain, code hash, or
start level invalidates the existing checkpoint and requires an explicit new
baseline. A future-level checkpoint or a block-hash anchor that no longer
matches both RPC providers fails closed rather than skipping a reorganized
range. Checkpoint files live under the gitignored `deployments/` directory by
default and never contain API keys or webhook credentials.

## Alert delivery and scheduling

Every run prints one JSON report. Production scheduling must either collect
that output into the configured incident channel or set
`TOKEN_MONITOR_ALERT_WEBHOOK_URL` to an HTTPS endpoint accepting the same JSON.
`TOKEN_MONITOR_ALERT_WEBHOOK_BEARER` optionally supplies an authorization
bearer without including it in reports or checkpoints.

Run the command on a fixed interval through the production scheduler. Exit
status `0` means a healthy scan with no alerts, `2` means alerts were emitted,
and `1` means configuration, query, validation, delivery, or persistence
failed. Treat both nonzero statuses as pages. A changed token implementation
requires a new integration review; changing the configured hash is not an
alert-closure procedure.
