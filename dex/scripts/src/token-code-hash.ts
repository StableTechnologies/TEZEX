import { createHash } from "node:crypto";
import { encodeAddress } from "@taquito/utils";

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, normalize(item)]),
  );
}

function normalizeScriptSections(value: unknown): unknown {
  if (!Array.isArray(value)) return value;
  const sections = value as Array<{ prim?: unknown }>;
  const sectionPrims = new Set(["parameter", "storage", "code", "view"]);
  if (
    sections.length < 3 ||
    !sections.every(
      (section) =>
        typeof section === "object" &&
        section !== null &&
        typeof section.prim === "string" &&
        sectionPrims.has(section.prim),
    )
  ) {
    return value;
  }

  // Octez RPCs return VIEW sections before PARAMETER/STORAGE/CODE even when
  // the originated artifact uses the compiler's PARAMETER/STORAGE/CODE/VIEW
  // order. The section order is not semantically significant, so normalize it
  // before hashing while preserving the relative order of multiple views.
  const rank: Record<string, number> = {
    parameter: 0,
    storage: 1,
    code: 2,
    view: 3,
  };
  return sections
    .map((section, index) => ({ section, index }))
    .sort(
      (left, right) =>
        rank[String(left.section.prim)] - rank[String(right.section.prim)] ||
        left.index - right.index,
    )
    .map(({ section }) => section);
}

function normalizeMichelsonLiterals(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeMichelsonLiterals);
  if (typeof value !== "object" || value === null) return value;

  const node = value as Record<string, unknown>;
  const args = node.args;
  if (
    node.prim === "PUSH" &&
    Array.isArray(args) &&
    (args[0] as { prim?: unknown } | undefined)?.prim === "address" &&
    typeof (args[1] as { bytes?: unknown } | undefined)?.bytes === "string"
  ) {
    const bytes = (args[1] as { bytes: string }).bytes;
    return {
      ...node,
      args: [
        normalizeMichelsonLiterals(args[0]),
        { string: encodeAddress(bytes) },
        ...args.slice(2).map(normalizeMichelsonLiterals),
      ],
    };
  }

  return Object.fromEntries(
    Object.entries(node).map(([key, item]) => [
      key,
      normalizeMichelsonLiterals(item),
    ]),
  );
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

export function scriptCodeSha256(code: unknown): string {
  return createHash("sha256")
    .update(
      canonicalJson(
        normalizeMichelsonLiterals(normalizeScriptSections(code)),
      ),
    )
    .digest("hex");
}
