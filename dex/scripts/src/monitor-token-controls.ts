import dotenv from "dotenv";

import {
  dispatchMonitorAlerts,
  evaluateTokenControlMonitor,
  loadMonitorCheckpoint,
  parseTokenControlMonitorConfig,
  persistMonitorCheckpoint,
} from "./token-control-monitor.js";

dotenv.config({ quiet: true });

async function main(): Promise<void> {
  const config = parseTokenControlMonitorConfig();
  const checkpoint = await loadMonitorCheckpoint(config);
  const evaluation = await evaluateTokenControlMonitor(config, checkpoint);

  // Structured stdout can be collected by a scheduler/SIEM even when no
  // generic JSON webhook is configured. Never print webhook credentials.
  console.log(JSON.stringify(evaluation.report, null, 2));

  // Do not advance the checkpoint until alert delivery succeeds. A delivery
  // failure therefore causes the same confirmed range to be retried.
  await dispatchMonitorAlerts(config, evaluation.report);
  if (evaluation.nextCheckpoint) {
    await persistMonitorCheckpoint(config.checkpointFile, evaluation.nextCheckpoint);
  }
  if (evaluation.report.alerts.length > 0) process.exitCode = 2;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
