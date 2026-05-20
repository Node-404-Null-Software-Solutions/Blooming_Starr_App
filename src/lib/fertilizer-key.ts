
export type FertilizerKeyEntry = {
  product: string;
  minDays: number;
  maxDays: number;
};

const FERTILIZER_KEY: FertilizerKeyEntry[] = [
  { product: "Ferti-lome", minDays: 7, maxDays: 14 },
  { product: "Arber", minDays: 7, maxDays: 14 },
];


export function lookupFertilizerDays(
  productName: string
): { minDays: number; maxDays: number } | null {
  if (!productName.trim()) return null;
  const lower = productName.toLowerCase().trim();
  const entry = FERTILIZER_KEY.find((e) => lower.includes(e.product.toLowerCase()));
  return entry ? { minDays: entry.minDays, maxDays: entry.maxDays } : null;
}


export function calcNextApplicationDates(
  applicationDate: Date,
  productName: string
): { nextEarliest: Date; nextLatest: Date } | null {
  const days = lookupFertilizerDays(productName);
  if (!days) return null;
  const nextEarliest = new Date(applicationDate);
  nextEarliest.setDate(nextEarliest.getDate() + days.minDays);
  const nextLatest = new Date(applicationDate);
  nextLatest.setDate(nextLatest.getDate() + days.maxDays);
  return { nextEarliest, nextLatest };
}

export function getAllFertilizerProducts(): string[] {
  return FERTILIZER_KEY.map((e) => e.product);
}
