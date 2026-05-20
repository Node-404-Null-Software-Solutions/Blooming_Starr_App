export function extractQrValue(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    const explicitValue =
      url.searchParams.get("sku") ??
      url.searchParams.get("SKU") ??
      url.searchParams.get("code") ??
      url.searchParams.get("barcode") ??
      url.searchParams.get("value");

    if (explicitValue) return explicitValue.trim();

    const pathValue = url.pathname.split("/").filter(Boolean).pop();
    if (pathValue) return decodeURIComponent(pathValue).trim();
  } catch {
    // Plain SKU/field values are expected.
  }

  return trimmed;
}
