import { TezexFeeModel, TezexFeeSource } from "../types/pools";

export interface TezexFeeBp {
  lpFeeBp: number;
  protocolFeeBp: number;
  totalFeeBp: number;
  source: TezexFeeSource;
}

/** AMM keep-rate scale matching on-chain 997/1000 when totalFeeBp === 30. */
export const FEE_DENOMINATOR_BP = 10_000;

/**
 * Detect TEZEX constant-product fee accounting from on-chain storage shape.
 *
 * - legacy-mod: `protocol_fee_bp` in storage → deduct protocol fee, then AMM 997 on net
 * - new-mod: protocol recipient / accumulated_* fields → AMM 997 on gross; 5 bp only in reserves
 * - base: no protocol fields → AMM 997 on gross
 */
export const detectTezexFeeModel = (
  storage: Record<string, unknown>
): TezexFeeModel => {
  if (
    storage.protocol_fee_bp !== undefined &&
    storage.protocol_fee_bp !== null
  ) {
    return "legacy-mod";
  }
  if (
    storage.protocol_fee_recipient !== undefined ||
    storage.accumulated_protocol_fee_xtz !== undefined ||
    storage.accumulated_protocol_fee_token !== undefined
  ) {
    return "new-mod";
  }
  return "base";
};

/** Total swap fee rate for analytics (AMM + protocol where applicable). */
export const tezexPoolFeeRate = (storage: Record<string, unknown>): number => {
  const feeModel = detectTezexFeeModel(storage);
  if (feeModel === "new-mod" || feeModel === "base") {
    // New mod total is 30 bp (25 LP + 5 protocol); do not add protocol on top of 0.003.
    return 0.003;
  }
  const protocolBp = Number(storage.protocol_fee_bp);
  const protocolRate = Number.isFinite(protocolBp) ? protocolBp / 10_000 : 0;
  return 0.003 + protocolRate;
};

const toFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object") {
    const maybeBn = value as {
      toNumber?: () => number;
      toString?: () => string;
    };
    if (typeof maybeBn.toNumber === "function") {
      const n = maybeBn.toNumber();
      return Number.isFinite(n) ? n : null;
    }
    if (typeof maybeBn.toString === "function") {
      const n = Number(maybeBn.toString());
      return Number.isFinite(n) ? n : null;
    }
  }
  return null;
};

const isPlainScalar = (raw: unknown): boolean => {
  if (raw === null || raw === undefined) return true;
  if (typeof raw === "number" || typeof raw === "string") return true;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    // BigNumber / similar: numeric object without pair shape keys
    const keys = Object.keys(raw as object);
    const hasPairShape =
      keys.includes("0") ||
      keys.includes("1") ||
      Object.prototype.hasOwnProperty.call(raw, 0);
    return !hasPairShape;
  }
  return false;
};

/**
 * Parse `get_fee_bp`:
 * - mod tuple `(lp, protocol, total)`
 * - base plain nat → `{ lpFeeBp: n, protocolFeeBp: 0, totalFeeBp: n }`
 */
export const parseGetFeeBpView = (
  raw: unknown
): Omit<TezexFeeBp, "source"> | null => {
  if (raw === null || raw === undefined) return null;

  if (Array.isArray(raw) && raw.length >= 3) {
    const lpFeeBp = toFiniteNumber(raw[0]);
    const protocolFeeBp = toFiniteNumber(raw[1]);
    const totalFeeBp = toFiniteNumber(raw[2]);
    if (lpFeeBp !== null && protocolFeeBp !== null && totalFeeBp !== null) {
      return { lpFeeBp, protocolFeeBp, totalFeeBp };
    }
    return null;
  }

  // Plain nat / BigNumber from base `get_fee_bp`.
  if (isPlainScalar(raw)) {
    const totalFeeBp = toFiniteNumber(raw);
    if (totalFeeBp === null) return null;
    return {
      lpFeeBp: totalFeeBp,
      protocolFeeBp: 0,
      totalFeeBp,
    };
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string | number, unknown>;
    const first = obj[0] ?? obj["0"];
    const second = obj[1] ?? obj["1"];
    const lpFeeBp = toFiniteNumber(first);
    if (
      second !== null &&
      second !== undefined &&
      typeof second === "object" &&
      !Array.isArray(second)
    ) {
      const inner = second as Record<string | number, unknown>;
      const protocolFeeBp = toFiniteNumber(inner[0] ?? inner["0"]);
      const totalFeeBp = toFiniteNumber(inner[1] ?? inner["1"]);
      if (lpFeeBp !== null && protocolFeeBp !== null && totalFeeBp !== null) {
        return { lpFeeBp, protocolFeeBp, totalFeeBp };
      }
    }
  }

  return null;
};

/** Local defaults when the view is missing or unreadable. */
export const fallbackTezexFeeBp = (
  feeModel: TezexFeeModel,
  storage: Record<string, unknown> = {}
): TezexFeeBp => {
  if (feeModel === "new-mod") {
    return {
      lpFeeBp: 25,
      protocolFeeBp: 5,
      totalFeeBp: 30,
      source: "fallback",
    };
  }
  if (feeModel === "legacy-mod") {
    const protocolBp = Number(storage.protocol_fee_bp);
    const protocolFeeBp = Number.isFinite(protocolBp) ? protocolBp : 0;
    return {
      lpFeeBp: 30,
      protocolFeeBp,
      totalFeeBp: 30 + protocolFeeBp,
      source: "fallback",
    };
  }
  return {
    lpFeeBp: 30,
    protocolFeeBp: 0,
    totalFeeBp: 30,
    source: "fallback",
  };
};

type FeeBpViewContract = {
  address?: string;
  /** Taquito on-chain views (Michelson `view`); not the legacy TZIP-4 `views` map. */
  contractViews?: {
    get_fee_bp?: () => {
      executeView: (options?: { viewCaller?: string }) => Promise<unknown>;
    };
  };
};

/**
 * Resolve fee bp for pool cache.
 * base / new-mod: try on-chain `get_fee_bp` via Taquito `contractViews.executeView`;
 * fallback only if missing/unreadable (e.g. Previewnet without `run_script_view`).
 * legacy-mod: keep storage `protocol_fee_bp` semantics (deduct-first path).
 */
export const resolveTezexFeeBp = async (
  contract: FeeBpViewContract,
  feeModel: TezexFeeModel,
  storage: Record<string, unknown>,
  viewCaller?: string
): Promise<TezexFeeBp> => {
  const fallback = fallbackTezexFeeBp(feeModel, storage);
  if (feeModel === "legacy-mod") {
    return fallback;
  }

  try {
    const view = contract.contractViews?.get_fee_bp?.();
    if (!view?.executeView) return fallback;
    const caller = viewCaller ?? contract.address;
    // Call through the view object so Taquito OnChainView keeps `this`.
    const raw = caller
      ? await view.executeView({ viewCaller: caller })
      : await view.executeView();
    const parsed = parseGetFeeBpView(raw);
    if (!parsed) return fallback;
    return { ...parsed, source: "view" };
  } catch {
    return fallback;
  }
};

/** Basis points applied inside the constant-product (legacy deducts protocol first). */
export const tezexAmmFeeBp = (
  feeModel: TezexFeeModel,
  totalFeeBp: number | undefined
): number => {
  if (feeModel === "legacy-mod") return 30;
  const bp = totalFeeBp ?? 30;
  return Number.isFinite(bp) && bp >= 0 && bp < FEE_DENOMINATOR_BP ? bp : 30;
};

export const formatBpAsPercent = (bp: number): string =>
  `${(bp / 100).toFixed(2)}%`;

/** Swap UI fee label from cached bp split. */
export const formatTezexFeeLabel = (
  fee: Pick<TezexFeeBp, "lpFeeBp" | "protocolFeeBp" | "totalFeeBp">
): string => {
  if (fee.protocolFeeBp > 0) {
    return `${formatBpAsPercent(fee.totalFeeBp)} (${formatBpAsPercent(
      fee.lpFeeBp
    )} LP / ${formatBpAsPercent(fee.protocolFeeBp)} TEZEX)`;
  }
  return `${formatBpAsPercent(fee.totalFeeBp)} pool fee`;
};
