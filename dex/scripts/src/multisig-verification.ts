import {
  ValidationResult,
  validateKeyHash,
} from "@taquito/utils";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export interface MultisigExpectation {
  threshold: number;
  owners: string[];
  codeSha256: string;
}

export function parseMultisigExpectation(
  env: NodeJS.ProcessEnv,
  prefix: "MANAGER" | "PROTOCOL_FEE_RECIPIENT",
  threshold: number | undefined,
  required: boolean,
): MultisigExpectation | undefined {
  const rawCode = env[`${prefix}_MULTISIG_CODE_SHA256`]?.trim().toLowerCase();
  const rawOwners = env[`${prefix}_MULTISIG_OWNERS`]?.trim();
  if (!rawCode && !rawOwners && !required) return undefined;
  if (!threshold || !rawCode || !rawOwners) {
    throw new Error(
      `${prefix} multisig verification requires threshold, code SHA-256, and owners`,
    );
  }
  if (!SHA256_PATTERN.test(rawCode)) {
    throw new Error(`${prefix}_MULTISIG_CODE_SHA256 must be a lowercase SHA-256 digest`);
  }
  const owners = rawOwners.split(",").map((owner) => owner.trim());
  if (
    owners.length === 0
    || new Set(owners).size !== owners.length
    || owners.some(
      (owner) => validateKeyHash(owner) !== ValidationResult.VALID,
    )
  ) {
    throw new Error(
      `${prefix}_MULTISIG_OWNERS must contain unique implicit Tezos addresses`,
    );
  }
  if (threshold > owners.length) {
    throw new Error(`${prefix} multisig threshold exceeds its owner count`);
  }
  return { threshold, owners: [...owners].sort(), codeSha256: rawCode };
}

function nat(value: unknown, label: string): bigint {
  const candidate = value as { toString?: () => string };
  const normalized = candidate?.toString?.() ?? String(value);
  if (!/^(0|[1-9][0-9]*)$/.test(normalized)) {
    throw new Error(`${label} is not a nat`);
  }
  return BigInt(normalized);
}

export function assertMultisigStorage(
  storage: Record<string, unknown>,
  expected: MultisigExpectation,
  label: string,
): void {
  if (nat(storage.threshold, `${label} threshold`) !== BigInt(expected.threshold)) {
    throw new Error(`${label} on-chain threshold differs from the release configuration`);
  }
  if (!Array.isArray(storage.owners)) {
    throw new Error(`${label} storage does not expose an owners list`);
  }
  const actualOwners = storage.owners.map(String).sort();
  if (
    actualOwners.length !== expected.owners.length
    || actualOwners.some((owner, index) => owner !== expected.owners[index])
  ) {
    throw new Error(`${label} on-chain owners differ from the release configuration`);
  }
}
