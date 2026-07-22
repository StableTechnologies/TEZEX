import { NetworkType } from "@airgap/beacon-sdk";
import { Errors, FailedRecord, TransactingComponent } from "../types/general";

export type SubmittedOperationState = "failed" | "unknown";

export class SubmittedOperationError extends Error {
  readonly opHash: string;
  readonly state: SubmittedOperationState;
  readonly originalError: unknown;

  constructor(
    opHash: string,
    state: SubmittedOperationState,
    originalError: unknown
  ) {
    super(
      state === "unknown"
        ? "The operation was submitted, but its confirmation status is unknown."
        : "The submitted operation failed on-chain."
    );
    this.name = "SubmittedOperationError";
    this.opHash = opHash;
    this.state = state;
    this.originalError = originalError;
  }
}

const DETAIL_LIMIT = 320;

const cleanDetail = (value: string): string | undefined => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return undefined;
  return cleaned.length > DETAIL_LIMIT
    ? `${cleaned.slice(0, DETAIL_LIMIT - 1)}…`
    : cleaned;
};

const readDetail = (
  value: unknown,
  depth = 0,
  seen = new Set<unknown>()
): string | undefined => {
  if (typeof value === "string") return cleanDetail(value);
  if (value instanceof Error) return cleanDetail(value.message || value.name);
  if (!value || typeof value !== "object" || depth > 2 || seen.has(value)) {
    return undefined;
  }

  seen.add(value);
  const record = value as Record<string, unknown>;
  const directKeys = ["message", "description", "title", "name"];
  for (const key of directKeys) {
    const detail = readDetail(record[key], depth + 1, seen);
    if (detail) return detail;
  }

  const nestedKeys = ["error", "errorData", "data", "originalError", "cause"];
  for (const key of nestedKeys) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const detail = readDetail(item, depth + 1, seen);
        if (detail) return detail;
      }
    } else {
      const detail = readDetail(nested, depth + 1, seen);
      if (detail) return detail;
    }
  }

  return undefined;
};

const knownReason = (detail: string | undefined): Errors | undefined => {
  if (!detail) return undefined;
  return Object.values(Errors).find(
    (reason) => reason.trim().toLowerCase() === detail.trim().toLowerCase()
  );
};

export const normalizeTransactionFailure = (
  error: unknown,
  component?: TransactingComponent,
  network?: NetworkType
): FailedRecord => {
  if (error instanceof SubmittedOperationError) {
    const detail = readDetail(error.originalError);
    const isUnknown = error.state === "unknown";

    return {
      reason: isUnknown
        ? Errors.NETWORK_CONFIRMATION
        : Errors.TRANSACTION_FAILED,
      detail,
      component,
      opHash: error.opHash,
      network,
      submitted: true,
      safeToRetry: !isUnknown,
    };
  }

  const detail = readDetail(error);
  const known = knownReason(detail);
  const searchable = detail?.toLowerCase() ?? "";

  let reason = known ?? Errors.TRANSACTION_FAILED;
  if (!known) {
    if (/abort|cancel|declin|denied|reject|user.*clos/.test(searchable)) {
      reason = Errors.WALLET_REJECTED;
    } else if (
      /slippage|min(?:imum)?[_ -]?(?:out|output)|price.*mov|too little received/.test(
        searchable
      )
    ) {
      reason = Errors.SLIPPAGE;
    } else if (/insufficient|not enough|balance|funds/.test(searchable)) {
      reason = Errors.INSUFFICIENT_FUNDS;
    } else if (
      /timeout|timed out|network|rpc|fetch|connection|unreachable|confirm/.test(
        searchable
      )
    ) {
      reason = Errors.NETWORK_CONFIRMATION;
    } else if (/gas|storage limit|estimat/.test(searchable)) {
      reason = Errors.GAS_ESTIMATION;
    }
  }

  const publicReason = reason.trim().toLowerCase();
  const technicalDetail =
    detail && detail.trim().toLowerCase() !== publicReason ? detail : undefined;

  return {
    reason,
    detail: technicalDetail,
    component,
    network,
    submitted: false,
    safeToRetry: true,
  };
};
