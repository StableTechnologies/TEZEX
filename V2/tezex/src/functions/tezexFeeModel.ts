import { TezexFeeModel } from "../types/pools";

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
