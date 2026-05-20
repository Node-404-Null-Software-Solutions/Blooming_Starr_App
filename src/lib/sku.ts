export const SKU_REFERENCE_SCOPES = ["plant", "category", "variety"] as const;

export type SkuReferenceScope = (typeof SKU_REFERENCE_SCOPES)[number];
export type SkuSegmentSource = "reference" | "generated" | "omitted" | "provided";

const STOP_WORDS = new Set(["OF", "THE", "AND", "A", "AN"]);

export function normalizeName(value: unknown): string {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ").toUpperCase();
}

export function cleanLetters(value: unknown): string {
  return normalizeName(value).replace(/[^A-Z]/g, "");
}

export function normalizeSuffix(value: unknown): string {
  if (value == null) return "";
  return String(value).trim().replace(/\s+/g, " ").toUpperCase();
}

function wordsForCode(value: unknown): string[] {
  return normalizeName(value).replace(/-/g, " ").split(/\s+/).filter(Boolean);
}

export function generateBaseCode(value: unknown): string {
  const words = wordsForCode(value);
  const clean = cleanLetters(value);
  if (words.length > 1) {
    const initials = words
      .filter((word) => !STOP_WORDS.has(word))
      .map((word) => word[0])
      .join("");
    return initials.slice(0, 3) || clean.slice(0, 3);
  }

  return clean.slice(0, 2);
}

export function generateFallbackCode(value: unknown): string {
  const words = wordsForCode(value);
  const clean = cleanLetters(value);
  const base = generateBaseCode(value);

  if (words.length > 1) {
    const lastWord = words[words.length - 1] ?? "";
    const candidate =
      base.length >= 2 && lastWord.length >= 2
        ? `${base.slice(0, 2)}${lastWord[1]}`
        : "";
    return candidate || clean.slice(0, 3);
  }

  return clean.slice(0, 3);
}

export function generateFinalFallbackCode(value: unknown): string {
  return cleanLetters(value).slice(0, 4);
}

export function resolveUniqueCodeCandidate(
  value: unknown,
  existingCodes: Iterable<string>
): string {
  const used = new Set(
    Array.from(existingCodes, (code) => normalizeName(code)).filter(Boolean)
  );
  const clean = cleanLetters(value);
  const candidates = [
    generateBaseCode(value),
    generateFallbackCode(value),
    generateFinalFallbackCode(value),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (!used.has(candidate)) return candidate;
  }

  const prefix = clean.slice(0, 4) || "ITEM";
  for (let counter = 2; counter < Number.MAX_SAFE_INTEGER; counter++) {
    const candidate = `${prefix}-${counter}`;
    if (!used.has(candidate)) return candidate;
  }

  throw new Error("Unable to resolve a unique SKU segment code");
}

export type BuildFinalSkuInput = {
  plant: string;
  category?: string | null;
  variety?: string | null;
  suffix?: string | null;
};

export function buildFinalSku(input: BuildFinalSkuInput): string {
  return [
    normalizeName(input.plant),
    normalizeName(input.category),
    normalizeName(input.variety),
    normalizeSuffix(input.suffix),
  ]
    .filter(Boolean)
    .join("-");
}

export function isSkuReferenceScope(value: string): value is SkuReferenceScope {
  return (SKU_REFERENCE_SCOPES as readonly string[]).includes(value);
}

export function normalizeReferenceCode(value: unknown): string {
  return normalizeName(value).replace(/[^A-Z0-9]/g, "");
}

export function isValidReferenceCode(value: string): boolean {
  return /^[A-Z0-9]+(?:-[0-9]+)?$/.test(value);
}
