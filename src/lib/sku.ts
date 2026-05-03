/** SKU generation utilities: joins pre-resolved lookup codes. */

// ---------------------------------------------------------------------------
// Lookup-based builders (use codes from LookupEntry table)
// ---------------------------------------------------------------------------

export function buildPlantSku(
  sourceCode: string,
  genusCode: string,
  cultivarCode: string,
  idCode: string
): string {
  return [sourceCode, genusCode, cultivarCode, idCode]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("-")
    .toUpperCase();
}

export function buildProductSku(
  sourceCode: string,
  categoryCode: string,
  sizeCode: string,
  styleCode: string,
  purchaseNumber: string
): string {
  return [sourceCode, categoryCode, sizeCode, styleCode, purchaseNumber]
    .map((s) => s.trim())
    .filter(Boolean)
    .join("-")
    .toUpperCase();
}

type LookupCodeOptions = {
  maxLength?: number;
  preserveCodeLike?: boolean;
  preserveNumericCodeLike?: boolean;
};

function cleanCodeLike(value: string, maxLength: number): string {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9.-]/g, "")
    .replace(/\.+/g, ".")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, maxLength);
}

function baseLookupCode(name: string, options: LookupCodeOptions = {}): string {
  const maxLength = options.maxLength ?? 8;

  if (options.preserveCodeLike) {
    const codeLike = cleanCodeLike(name, maxLength);
    if (codeLike) return codeLike;
  }

  if (options.preserveNumericCodeLike && /\d/.test(name)) {
    const codeLike = cleanCodeLike(name, maxLength);
    if (codeLike) return codeLike;
  }

  const tokens = name.toUpperCase().match(/[A-Z0-9]+/g) ?? [];
  if (tokens.length === 0) return "ITEM";

  if (tokens.length === 1) {
    return tokens[0].slice(
      0,
      Math.min(maxLength, Math.max(1, Math.min(2, tokens[0].length)))
    );
  }

  const acronym = tokens.map((token) => token[0]).join("").slice(0, maxLength);
  return acronym || tokens.join("").slice(0, maxLength) || "ITEM";
}

export function suggestLookupCode(
  name: string,
  existingCodes: Iterable<string> = [],
  options: LookupCodeOptions = {}
): string {
  const maxLength = options.maxLength ?? 8;
  const used = new Set(
    Array.from(existingCodes, (code) => code.trim().toUpperCase()).filter(Boolean)
  );
  const base = baseLookupCode(name, options).slice(0, maxLength).toUpperCase();
  let code = base;
  let counter = 2;

  while (used.has(code)) {
    const suffix = String(counter++);
    const prefixLength = Math.max(1, maxLength - suffix.length);
    code = `${base.slice(0, prefixLength)}${suffix}`;
  }

  return code;
}
