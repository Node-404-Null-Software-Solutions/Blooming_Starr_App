export function formatAppDate(
  value: Date | string | null | undefined,
  fallback = ""
) {
  if (!value) return fallback;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return fallback;
    return `${value.getUTCMonth() + 1}/${value.getUTCDate()}/${value.getUTCFullYear()}`;
  }

  const datePart = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (datePart) {
    const [, year, month, day] = datePart;
    return `${Number(month)}/${Number(day)}/${year}`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}/${parsed.getUTCFullYear()}`;
}
