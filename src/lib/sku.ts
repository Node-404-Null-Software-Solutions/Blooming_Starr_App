/** SKU generation utilities — joins pre-resolved lookup codes. */

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

